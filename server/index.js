// index.js
// Load .env **first** so db.js / models can read process.env when they are imported
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

// +++ ADDED FOR SERVING REACT BUILD +++
import path from 'path';
import { fileURLToPath } from 'url';

// Import sequelize/models after dotenv.config()
import { sequelize, User, Course, Module } from './models/User.js';
// --- Database Status Tracking ---
let isDbConnected = false;
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// +++ ADDED FOR SERVING REACT BUILD +++
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Gemini keys from env (comma-separated)
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

// If no GEMINI_KEYS but single GEMINI_API_KEY exists, use it as last resort
if (!GEMINI_KEYS.length && process.env.GEMINI_API_KEY) {
  GEMINI_KEYS.push(process.env.GEMINI_API_KEY);
}

const MODEL = 'gemini-1.5-flash';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
// Connect & sync DB, then start server
(async () => {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    await sequelize.sync();
    console.log('✅ Models synchronized');
    
    isDbConnected = true;
    console.log('✅ Database is ready.');

    // --- START SERVER ONLY AFTER DB IS READY ---
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

  } catch (err) {
    console.error('❌ FATAL: DB connection / sync error. Server not started.', err);
    isDbConnected = false;
  }
})();

// Catch unhandled promise rejections to aid debugging
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

// -------------------------
// Round-robin + failover helper
// -------------------------
let nextKeyIndex = 0;

async function generateWithFallback(promptArray) {
  if (!Array.isArray(promptArray) && typeof promptArray === 'string') {
    promptArray = [promptArray];
  }
  if (!Array.isArray(promptArray) || promptArray.length === 0) {
    throw new Error('Invalid prompt for generation');
  }

  const keyCount = GEMINI_KEYS.length;
  if (keyCount === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const startIndex = nextKeyIndex % keyCount;
  nextKeyIndex = (nextKeyIndex + 1) % keyCount;

  let lastErr = null;

  for (let attempt = 0; attempt < keyCount; attempt++) {
    const keyIndex = (startIndex + attempt) % keyCount;
    const key = GEMINI_KEYS[keyIndex];

    try {
      const ai = new GoogleGenerativeAI(key);
      const model = ai.getGenerativeModel({ model: MODEL });

      const result = await model.generateContent(promptArray);
      const text = await result.response.text();

      if (text && String(text).trim().length > 0) {
        if (attempt > 0) {
          console.warn(`Gemini: succeeded using key #${keyIndex + 1} after ${attempt} failover(s)`);
        }
        return String(text);
      }
      
      lastErr = new Error('Empty response from Gemini');
      console.warn(` trying `);
    } catch (err) {
      lastErr = err;
      console.error(`failed to generate, trying again:`, err && err.message ? err.message : err);
    }
  }

  const message = ' sorry Please try again later.';
  console.error('All Gemini keys failed. Last error:', lastErr && lastErr.message ? lastErr.message : lastErr);
  const e = new Error(message);
  e.cause = lastErr;
  throw e;
}

// -------------------------
// Auth middleware
// -------------------------
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token missing' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // contains id
    next();
  } catch (err) {
    console.error('JWT verify error', err && err.message ? err.message : err);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// -------------------------
// Register
// -------------------------
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ message: 'Registered successfully', userId: user.id });
  } catch (err) {
    console.error('Register error:', err && err.message ? err.message : err);
    res.status(400).json({ error: 'Invalid data' });
  }
});

// -------------------------
// Login
// -------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// -------------------------
// Generate module titles
// -------------------------
app.post('/api/generate-titles', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const text = await generateWithFallback([
      `Generate a list of module titles for a course on this prompt: "${prompt}" but don't write any extra things besides the list in the start and in the end`
    ]);

    const modules = String(text || '')
      .split('\n')
      .map(line => line.replace(/^[-*0-9.]+\s*/, '').trim())
      .filter(line => line && !line.match(/^#+|Module Titles/i));

    res.json({ modules });
  } catch (err) {
    console.error('Error generating titles:', err && err.message ? err.message : err);
    if (err.message && err.message.includes('All Gemini API keys')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to generate module titles' });
  }
});

// -------------------------
// Legacy generate-content (for prompt+title)
// -------------------------
app.post('/api/generate-content', authMiddleware, async (req, res) => {
  const { prompt, title } = req.body;
  if (!prompt || !title) return res.status(400).json({ error: 'Prompt and title required' });

  try {
    const text = await generateWithFallback([
 `For the course on "${prompt}" ,Write detailed notes for the module titled "${title}" Don't give any heading of this topic. Include explanations and examples. At the end, generate 5 multiple-choice quiz questions on that detailed notes, give it heading as "Quiz Questions:" and  give 4 options each and  indicate the correct answer in this format:

Question: ...
Options:
A. ...
B. ...
C. ...
D. ...
Answer: ...`
    ]);

    res.json({ content: text });
  } catch (err) {
    console.error('Error generating content:', err && err.message ? err.message : err);
    if (err.message && err.message.includes('All Gemini API keys')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// -------------------------
// Generate module content (used by ModuleDetail)
// -------------------------
app.post('/api/generate', authMiddleware, async (req, res) => {
  const { topic, coursePrompt } = req.body;
  if (!topic) return res.status(400).json({ error: 'Missing topic title' });

  try {
    const generatedText = await generateWithFallback([
      `For the course on "${coursePrompt}" ,Write detailed notes for the module titled "${topic}" Don't give any heading of this topic. Include explanations and examples. At the end, generate 5 multiple-choice quiz questions on that detailed notes, give it heading as "Quiz Questions:" and  give 4 options each and  indicate the correct answer in this format:

Question: ...
Options:
A. ...
B. ...
C. ...
D. ...
Answer: ...`
    ]);

    res.json({ generatedText });
  } catch (err) {
    console.error('Generation failed:', err && err.message ? err.message : err);
    if (err.message && err.message.includes('All Gemini API keys')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to generate module content' });
  }
});

// -------------------------
// Save full course (with modules array of {title, content?, quiz?})
// -------------------------
app.post('/api/save-course', authMiddleware, async (req, res) => {
  const { prompt, modules } = req.body;
  if (!prompt || !Array.isArray(modules)) {
    return res.status(400).json({ error: 'Invalid course data' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const course = await Course.create({ prompt, userId: user.id, createdAt: new Date() });

    if (modules.length) {
      const modulesToCreate = modules.map(m => ({
        title: m.title || m,
        content: m.content || '',
        quiz: m.quiz || '',
        courseId: course.id
      }));
      await Module.bulkCreate(modulesToCreate);
    }

    res.json({ message: 'Course saved' });
  } catch (err) {
    console.error('Error saving course:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to save course' });
  }
});

// -------------------------
// Save or update single module content under an existing course
// -------------------------
app.post('/api/save-module-content', authMiddleware, async (req, res) => {
  const { coursePrompt, moduleTitle, content, quiz } = req.body;
  if (!coursePrompt || !moduleTitle || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const course = await Course.findOne({ where: { prompt: coursePrompt, userId: user.id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    let module = await Module.findOne({ where: { title: moduleTitle, courseId: course.id } });
    if (module) {
      module.content = content;
      if (quiz !== undefined) module.quiz = quiz;
      await module.save();
    } else {
      module = await Module.create({ title: moduleTitle, content, quiz: quiz || '', courseId: course.id });
    }

    res.json({ message: 'Module content saved' });
  } catch (err) {
    console.error('Error saving module content:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to save module content' });
  }
});

// -------------------------
// Fetch saved courses (with modules)
// -------------------------
app.get('/api/my-courses', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: {
        model: Course,
        as: 'savedCourses',
        include: [{ model: Module, as: 'modules' }],
        order: [['createdAt', 'DESC']]
      },
      order: [[{ model: Course, as: 'savedCourses' }, 'createdAt', 'DESC']]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const courses = (user.savedCourses || []).map(c => ({
      prompt: c.prompt,
      createdAt: c.createdAt,
      modules: (c.modules || []).map(m => `${m.title}`),
      modules_full: (c.modules || []).map(m => ({ title: m.title, content: m.content, quiz: m.quiz }))
    }));

    res.json({ courses });
  } catch (err) {
    console.error('Error fetching courses:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});
// added this api to check server status

// Smarter Health Check API
app.get('/api/health', (req, res) => {
  if (isDbConnected) {
    // If DB is ready, send 200 OK
    res.status(200).json({ status: 'ok', database: 'connected' });
  } else {
    // If DB is not ready, send 503 Service Unavailable
    res.status(503).json({ status: 'error', database: 'connecting' });
  }
});


// -------------------------
// Get specific module content if already saved
// -------------------------
app.get('/api/module-content', authMiddleware, async (req, res) => {
  const { coursePrompt, moduleTitle } = req.query;
  if (!coursePrompt || !moduleTitle) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const course = await Course.findOne({ where: { prompt: coursePrompt, userId: user.id } });
    const module = course ? await Module.findOne({ where: { title: moduleTitle, courseId: course.id } }) : null;

    if (module && module.content) {
      res.json({ content: module.content, quiz: module.quiz });
    } else {
      res.status(404).json({ error: 'Module content not found' });
    }
  } catch (err) {
    console.error('Error retrieving module content:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Error retrieving module content' });
  }
});

// -------------------------
// Delete course by index
// -------------------------
app.delete('/api/delete-course/:index', authMiddleware, async (req, res) => {
  const { index } = req.params;
  const idx = parseInt(index, 10);
  if (Number.isNaN(idx)) return res.status(400).json({ error: 'Invalid index' });

  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Course, as: 'savedCourses', include: [{ model: Module, as: 'modules' }] }],
      order: [[{ model: Course, as: 'savedCourses' }, 'createdAt', 'DESC']]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const courses = user.savedCourses || [];
    if (idx < 0 || idx >= courses.length) return res.status(404).json({ error: 'Course not found' });

    const courseToDelete = courses[idx];
    await Module.destroy({ where: { courseId: courseToDelete.id } });
    await Course.destroy({ where: { id: courseToDelete.id } });

    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('Error deleting course:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// +++ START: SERVE REACT APP +++
// This section must go AFTER all your API routes but BEFORE app.listen().
// Serve static files from the React app
const buildPath = path.join(__dirname, 'dist');

// Serve static files (e.g., js, css) from the React build folder
app.use(express.static(buildPath));

// The "catchall" handler that avoids the Node.js v22 bug with '*'.
// It serves your React app for any request that doesn't match an API route.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});
// +++ END: SERVE REACT APP +++


// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));