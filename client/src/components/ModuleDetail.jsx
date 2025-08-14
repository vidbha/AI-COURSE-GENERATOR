// src/components/ModuleDetail.jsx
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import jsPDF from 'jspdf';
import { useModuleContext } from './ModuleContext';
import QuizRenderer from './QuizRenderer';
import CodeBlock from './CodeBlock'; // Import the shared component

const cleanupMarkdown = (text) => {
    if (!text) return '';
    let cleanedText = text;
    cleanedText = cleanedText.replace(/^\s*([*\-_])\1{1,}\s*$/gm, '');
    cleanedText = cleanedText.replace(/^\s*[.#]\s*$/gm, '');
    cleanedText = cleanedText.replace(/```\s*\n\s*```/g, '');
    return cleanedText.trim();
};

// REMOVED `stripMarkdownForQuiz` as it's no longer needed.

export default function ModuleDetail() {
  const { title } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const coursePromptFromQuery = query.get('coursePrompt') || '';

  const decodedTitle = decodeURIComponent(title || '');
  const cleanedTitle = decodedTitle.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();

  const { prompt: contextPrompt, modules: contextModules, setModules, setPrompt } = useModuleContext();
  const coursePrompt = contextPrompt || coursePromptFromQuery || '';

  const [content, setContent] = useState('');
  const [quizRawText, setQuizRawText] = useState('');
  const [loading, setLoading] = useState(true);
  const [localModules, setLocalModules] = useState(contextModules || []);
  const [collapsed, setCollapsed] = useState(false);
  const markdownRef = useRef();

  const HEADER_HEIGHT = 64;
  const SIDEBAR_EXPANDED = 288;
  const SIDEBAR_COLLAPSED = 64;

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  // ... (normalizeModulesObj, fetchSavedCourseByPrompt, generateModuleTitles remain the same) ...
  const normalizeModulesObj = (course) => {
    if (!course) return [];
    if (course.modules_full && Array.isArray(course.modules_full) && course.modules_full.length) {
      return course.modules_full.map(m => ({
        title: m?.title ? String(m.title).trim() : '',
        content: m?.content ? String(m.content) : '',
        quiz: m?.quiz ? String(m.quiz) : ''
      }));
    }
    if (Array.isArray(course.modules) && course.modules.length) {
      const first = course.modules[0];
      if (typeof first === 'string') {
        return course.modules.map(t => ({ title: String(t).trim(), content: '', quiz: '' }));
      }
      return course.modules.map(m => ({
        title: m?.title ? String(m.title).trim() : '',
        content: m?.content ? String(m.content) : '',
        quiz: m?.quiz ? String(m.quiz) : ''
      }));
    }
    return [];
  };

  const fetchSavedCourseByPrompt = async (prompt) => {
    try {
      const res = await axios.get('/api/my-courses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const courses = res.data.courses || [];
      const match = courses.find(c => String(c.prompt).trim() === String(prompt).trim());
      if (match) {
        const modulesObj = normalizeModulesObj(match);
        const titles = modulesObj.map(m => m.title).filter(Boolean);
        return { found: true, titles, course: match };
      }
      return { found: false };
    } catch (err) {
      console.error('Failed to fetch saved courses', err);
      return { found: false };
    }
  };

  const generateModuleTitles = async (prompt) => {
    try {
      const res = await axios.post(
        '/api/generate-titles',
        { prompt },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (Array.isArray(res.data.modules) && res.data.modules.length) {
        return res.data.modules.map(String);
      }
      if (Array.isArray(res.data.titles) && res.data.titles.length) {
        return res.data.titles.map(String);
      }
      if (typeof res.data === 'string' && res.data.trim()) {
        return res.data.split('\n').map(s => s.trim()).filter(Boolean);
      }
      return [];
    } catch (err) {
      console.error('Failed to generate module titles', err);
      return [];
    }
  };

  useEffect(() => {
    if (Array.isArray(contextModules) && contextModules.length) {
      setLocalModules(contextModules);
      return;
    }

    if (coursePrompt) {
      (async () => {
        setLoading(true);
        const saved = await fetchSavedCourseByPrompt(coursePrompt);
        if (saved.found && saved.titles.length) {
          setLocalModules(saved.titles);
          setModules(saved.titles);
          setPrompt(coursePrompt);
          setLoading(false);
          return;
        }
        const generated = await generateModuleTitles(coursePrompt);
        if (generated && generated.length) {
          setLocalModules(generated);
          setModules(generated);
          setPrompt(coursePrompt);
        } else {
          setLocalModules([]);
        }
        setLoading(false);
      })();
    } else {
      setLocalModules(contextModules || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursePrompt, contextModules]);

  const fetchOrGenerateContent = async () => {
    setContent('');
    setQuizRawText('');
    setLoading(true);

    if (!coursePrompt) {
      setContent('⚠️ Course context missing.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/api/module-content', {
        params: { coursePrompt, moduleTitle: cleanedTitle },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.data?.content) {
        setContent(cleanupMarkdown(res.data.content));
        // Pass the raw markdown quiz text directly
        setQuizRawText(res.data.quiz || '');
        setLoading(false);
        return;
      }
      throw new Error('No existing content');
    } catch {
      try {
        const genRes = await axios.post(
          '/api/generate',
          { topic: cleanedTitle, coursePrompt },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );

        let fullText = genRes.data.generatedText || genRes.data.text || '';
        const quizStartRegex = /(Quiz Questions:|🧠\s*quiz|##\s*quiz)/i;
        const idx = fullText.search(quizStartRegex);

        let mainWithMarkdown = idx !== -1 ? fullText.slice(0, idx).trim() : fullText;
        let quizWithMarkdown = idx !== -1 ? fullText.slice(idx).trim() : '';
        
        // Pass raw markdown quiz text directly
        setContent(cleanupMarkdown(mainWithMarkdown));
        setQuizRawText(quizWithMarkdown);

        await axios.post(
          '/api/save-module-content',
          { coursePrompt, moduleTitle: cleanedTitle, content: mainWithMarkdown, quiz: quizWithMarkdown },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      } catch (err) {
        console.error('Generation/save failed:', err);
        setContent('⚠️ Failed to load or generate module content.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (cleanedTitle && coursePrompt) fetchOrGenerateContent();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanedTitle, coursePrompt]);

  // ... (handleDownloadPDF, onClickModule, initialsFor, styles, etc. remain the same) ...
  // ...existing code...
const handleDownloadPDF = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', lineHeight: 1.5 });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const usableWidth = pageWidth - margin * 2;
  const rightBound = margin + usableWidth;
  let y = margin;
  let inCodeBlock = false;
  const defaultFontSize = 12;

  const calcLineHeight = (fs) => Math.max(14, Math.round(fs * 1.4));
  const ensureSpaceFor = (h) => {
    if (y + h > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Split very long token into chunks that fit maxWidth
  const splitLongToken = (token, font, fontSize, maxWidth) => {
    doc.setFont(font, 'normal');
    doc.setFontSize(fontSize);
    const chars = token.split('');
    let chunk = '';
    const chunks = [];
    for (let ch of chars) {
      const test = chunk + ch;
      if (doc.getTextWidth(test) > maxWidth) {
        if (chunk.length === 0) {
          chunks.push(ch);
          chunk = '';
        } else {
          chunks.push(chunk);
          chunk = ch;
        }
      } else {
        chunk = test;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };

  // Render inline styled parts (word by word), safe-wrapping from startX to rightBound
  const renderInlineParts = (parts, { fontSize = defaultFontSize, startX = margin } = {}) => {
    const lineHeight = calcLineHeight(fontSize);
    let currentX = startX;

    const renderToken = (token, bold, italic) => {
      const style = bold ? 'bold' : (italic ? 'italic' : 'normal');
      doc.setFont('helvetica', style);
      doc.setFontSize(fontSize);

      if (doc.getTextWidth(token) > usableWidth) {
        const pieces = splitLongToken(token, 'helvetica', fontSize, usableWidth);
        for (let p of pieces) {
          if (doc.getTextWidth(p) > rightBound - currentX) {
            y += lineHeight;
            ensureSpaceFor(lineHeight);
            currentX = startX;
          }
          doc.text(p, currentX, y, { baseline: 'top' });
          currentX += doc.getTextWidth(p);
        }
        return;
      }

      const tokenWidth = doc.getTextWidth(token);
      if (tokenWidth > (rightBound - currentX)) {
        y += lineHeight;
        ensureSpaceFor(lineHeight);
        currentX = startX;
      }
      doc.text(token, currentX, y, { baseline: 'top' });
      currentX += tokenWidth;
    };

    for (const part of parts) {
      const text = part.text || '';
      if (!text) continue;
      const tokens = Array.from(text.matchAll(/(\S+\s*)/g)).map(m => m[0]);
      if (tokens.length === 0 && /\s+/.test(text)) tokens.push(text);

      for (let tok of tokens) {
        if (/^\s+$/.test(tok)) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(fontSize);
          const spaceW = doc.getTextWidth(' ');
          const tokenWidth = spaceW * tok.length;
          if (tokenWidth > rightBound - currentX) {
            y += lineHeight;
            ensureSpaceFor(lineHeight);
            currentX = startX;
          } else {
            currentX += tokenWidth;
          }
        } else {
          renderToken(tok, part.bold, part.italic);
        }
      }
    }

    y += lineHeight;
  };

  // paragraph wrapper using splitTextToSize
  const addWrappedText = (txt, { bold = false, italic = false, fontSize = defaultFontSize, startX = margin } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : (italic ? 'italic' : 'normal'));
    doc.setFontSize(fontSize);
    const lineHeight = calcLineHeight(fontSize);
    const effectiveWidth = usableWidth - (startX - margin);
    const wrapped = doc.splitTextToSize(String(txt || ''), effectiveWidth);
    wrapped.forEach((line, i) => {
      if (i > 0) {
        y += lineHeight;
        ensureSpaceFor(lineHeight);
      }
      doc.text(line, startX, y, { baseline: 'top' });
    });
    y += lineHeight;
  };

  // code line rendering (background rect clamped to usableWidth)
  const renderCodeLine = (rawLine, fontSize = 11) => {
    const lineHeight = calcLineHeight(fontSize);
    const paddingH = 8, paddingV = 6;
    const normalized = rawLine.replace(/\t/g, '    ');
    doc.setFont('courier', 'normal');
    doc.setFontSize(fontSize);

    const wrapWidth = usableWidth - paddingH * 2;
    const wrapped = doc.splitTextToSize(normalized, wrapWidth);

    wrapped.forEach(wline => {
      ensureSpaceFor(lineHeight + paddingV);
      const textW = Math.min(doc.getTextWidth(wline), usableWidth);
      const rectX = margin - paddingH / 2;
      const rectY = y - (paddingV / 2);
      const rectW = Math.max(Math.min(textW + paddingH * 2, usableWidth), 40);
      const rectH = lineHeight + paddingV;

      doc.setFillColor(30, 41, 59);
      doc.rect(rectX, rectY, rectW, rectH, 'F');

      doc.setTextColor(173, 216, 230);
      doc.text(wline, margin + 2, y, { baseline: 'top' });
      doc.setTextColor(0, 0, 0);
      y += lineHeight;
    });

    y += lineHeight;
  };

  // --- NEW helper: auto-scale text to fit usableWidth ---
  // returns object { fontSize, lines } where lines are the wrapped lines at that fontSize
  const fitTextToWidth = (text, preferredSize = 18, minSize = 10, font = 'helvetica', fontStyle = 'bold') => {
    let fs = preferredSize;
    let lines = [];
    // try decreasing font size until wrapped lines' measured width <= usableWidth
    while (fs >= minSize) {
      doc.setFont(font, fontStyle);
      doc.setFontSize(fs);
      lines = doc.splitTextToSize(String(text || ''), usableWidth);
      // measure max width of produced lines
      let maxw = 0;
      for (const ln of lines) {
        // doc.getTextWidth measures width at current fontSize and font
        const w = doc.getTextWidth(ln);
        if (w > maxw) maxw = w;
      }
      if (maxw <= usableWidth + 0.001) { // allow minor float tolerance
        return { fontSize: fs, lines };
      }
      fs -= 1;
    }
    // fallback to minSize lines
    doc.setFont(font, fontStyle);
    doc.setFontSize(minSize);
    return { fontSize: minSize, lines: doc.splitTextToSize(String(text || ''), usableWidth) };
  };

  // Parse markdown-like content, support heading, lists, code fences, inline bold/italic
  const renderMarkdownToPDF = (markdown) => {
    const lines = String(markdown || '').split('\n');

    for (let rawLine of lines) {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }

      // headings (# or ##) — use auto-scaling so headings never overflow
      const headingMatch = rawLine.match(/^#{1,2}\s*(.+)/);
      if (headingMatch) {
        const headingText = headingMatch[1].replace(/\*\*/g, '').trim();
        const preferred = 16;
        const fitted = fitTextToWidth(headingText, preferred, 10, 'helvetica', 'bold');
        const headingFontSize = fitted.fontSize;
        const headingLineHeight = calcLineHeight(headingFontSize);

        ensureSpaceFor((fitted.lines.length * headingLineHeight) + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(headingFontSize);
        fitted.lines.forEach(line => {
          doc.text(line, margin, y, { baseline: 'top' });
          y += headingLineHeight;
        });
        y += 6;
        doc.setFont('helvetica', 'normal');
        continue;
      }

      // code fence toggle
      if (/^```/.test(rawLine.trim())) {
        inCodeBlock = !inCodeBlock;
        if (!inCodeBlock) y += calcLineHeight(11);
        continue;
      }

      if (inCodeBlock) {
        renderCodeLine(rawLine, 11);
        continue;
      }

      // lists
      const listMatch = rawLine.match(/^\s*([\*\-\+]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const bulletText = listMatch[2] || '';
        const bulletX = margin;
        const contentStartX = margin + 18;
        ensureSpaceFor(calcLineHeight(defaultFontSize));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(defaultFontSize);
        doc.text('•', bulletX, y, { baseline: 'top' });

        // parse bold/italic and assemble parts
        const parts = [];
        const biRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
        let last = 0, m;
        while ((m = biRegex.exec(bulletText)) !== null) {
          if (m.index > last) parts.push({ text: bulletText.substring(last, m.index), bold: false, italic: false });
          if (m[2]) parts.push({ text: m[2], bold: true, italic: false });
          else parts.push({ text: m[3], bold: false, italic: true });
          last = biRegex.lastIndex;
        }
        if (last < bulletText.length) parts.push({ text: bulletText.substring(last), bold: false, italic: false });
        if (parts.length === 0) parts.push({ text: '', bold: false, italic: false });

        renderInlineParts(parts, { fontSize: defaultFontSize, startX: contentStartX });
        continue;
      }

      // normal paragraph with inline formatting
      const parts = [];
      const rx = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
      let idx = 0, mm;
      while ((mm = rx.exec(rawLine)) !== null) {
        if (mm.index > idx) parts.push({ text: rawLine.substring(idx, mm.index), bold: false, italic: false });
        if (mm[2]) parts.push({ text: mm[2], bold: true, italic: false });
        else parts.push({ text: mm[3], bold: false, italic: true });
        idx = rx.lastIndex;
      }
      if (idx < rawLine.length) parts.push({ text: rawLine.substring(idx), bold: false, italic: false });

      if (parts.length === 1 && !parts[0].bold && !parts[0].italic) {
        addWrappedText(parts[0].text.replace(/\*\*/g, '').replace(/\*/g, ''), { fontSize: defaultFontSize });
      } else {
        const cleaned = parts.map(p => ({ text: p.text.replace(/\*\*/g, '').replace(/\*/g, ''), bold: p.bold, italic: p.italic }));
        renderInlineParts(cleaned, { fontSize: defaultFontSize, startX: margin });
      }
    }
  };

  // Title: use fitTextToWidth so very long title text scales down instead of overflowing
  const safeTitle = String((typeof cleanedTitle !== 'undefined' ? cleanedTitle : '') || 'Module').trim();
  const titleFitted = fitTextToWidth(safeTitle, 18, 10, 'helvetica', 'bold');
  const titleLineHeight = calcLineHeight(titleFitted.fontSize);
  ensureSpaceFor((titleFitted.lines.length * titleLineHeight) + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleFitted.fontSize);
  titleFitted.lines.forEach(line => {
    doc.text(line, margin, y, { baseline: 'top' });
    y += titleLineHeight;
  });
  y += 6;
  doc.setFont('helvetica', 'normal');

  // Body
  renderMarkdownToPDF(String(content || ''));

  // Quiz
  if (quizRawText && String(quizRawText).trim().length) {
    y += 10;
    addWrappedText('Quiz Questions', { bold: true, fontSize: 14 });
    y += 6;
    renderMarkdownToPDF(String(quizRawText));
  }

  // finalize and save
  const outName = (safeTitle.replace(/[^a-z0-9_\- ]/gi, '') || 'module');
  doc.save(`${outName}.pdf`);
};




// ...existing code...
  const onClickModule = (modTitle) => {
    if (!modTitle) return;
    setModules(localModules);
    setPrompt(coursePrompt);
    navigate(`/dashboard/module/${encodeURIComponent(modTitle)}?coursePrompt=${encodeURIComponent(coursePrompt)}`);
  };

  const initialsFor = (s) => {
    if (!s) return '';
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
  };
  
  const sidebarStyle = {
    position: 'fixed',
    top: `${HEADER_HEIGHT}px`,
    left: 0,
    width: `${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
    overflowY: 'auto',
    transition: 'width 200ms ease-in-out',
    zIndex: 40,
  };

  const mainStyle = {
    marginLeft: `${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
    transition: 'margin-left 200ms ease-in-out',
    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
    overflowY: 'auto',
    width: `calc(100% - ${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px)`,
    boxSizing: 'border-box',
  };

  return (
    <>
      <aside
        style={sidebarStyle}
        className="bg-gradient-to-b from-blue-950 via-indigo-900 to-blue-900 text-white p-3 border-r border-blue-800/40 shadow-inner custom-scrollbar"
        aria-label="Course modules sidebar"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-lg font-bold ${collapsed ? 'ml-0' : ''}`}>🪐</span>
          {!collapsed && <h2 className="text-xl font-bold">Space Modules</h2>}
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          aria-controls="module-list"
          title={collapsed ? 'Open modules' : 'Collapse modules'}
          style={{
            position: 'absolute', top: 6, right: 6, zIndex: 60, width: 38, height: 36, borderRadius: '9999px',
          }}
          className="bg-blue-700/90 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center"
        >
  <svg className="w-5 h-5 transform transition-transform"
    viewBox="0 0 20 20" fill="currentColor">
    {collapsed ? (
      // Chevron Right
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    ) : (
      // Chevron Left
      <path fillRule="evenodd" d="M12.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L9.414 10l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
    )}
  </svg>
        </button>
        <nav id="module-list" className="space-y-2 pb-6 mt-3">
          {!localModules || localModules.length === 0 ? (
            <p className="text-blue-200 text-sm">No module titles available.</p>
          ) : (
            localModules.map((mod, idx) => {
              const safeTitle = (mod || '').replace(/[*#]/g, '').trim();
              const isActive = safeTitle === cleanedTitle;
              if (collapsed) {
                return (
                  <button
                    key={idx}
                    onClick={() => onClickModule(safeTitle)}
                    title={safeTitle}
                    className={`w-full flex items-center justify-center p-2 my-1 rounded-full transition ${isActive ? 'bg-indigo-700 text-white' : 'bg-blue-900 text-blue-100 hover:bg-indigo-800'}`}
                  >
                    <span className="text-sm font-semibold">{initialsFor(safeTitle)}</span>
                  </button>
                );
              }
              return (
                <button
                  key={idx}
                  onClick={() => onClickModule(safeTitle)}
                  className={`w-full text-left block p-3 rounded transition-colors duration-150 ${isActive ? 'bg-indigo-800 text-white' : 'hover:bg-indigo-800 text-blue-100'}`}
                >
                  {safeTitle}
                </button>
              );
            })
          )}
        </nav>
        {!collapsed && <div className="mt-auto text-xs text-blue-300 pt-4 border-t border-blue-800/30">Tip: click a module to open it</div>}
      </aside>

      <main style={mainStyle} className="bg-[#0f172a] text-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
              {cleanedTitle || 'Select a Module'}
            </h1>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
                <p className="ml-4 text-lg text-gray-300 font-medium">Generating content...</p>
              </div>
            ) : (
              <>
                <div ref={markdownRef}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-6 text-lg leading-relaxed text-gray-300" {...props} />,
                      // ...other components
                      code: CodeBlock,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
                
                {quizRawText && <QuizRenderer quizText={quizRawText} />}

                {/* ... (Buttons at the bottom) ... */}
                 <div className="flex flex-wrap gap-4 mt-12 pt-6 border-t border-gray-800">
                    <button onClick={handleDownloadPDF} className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105">
                        Download PDF
                    </button>
                    {localModules && localModules.length > 0 && (() => {
                        const idx = localModules.findIndex(m => (m || '').replace(/[*#]/g, '').trim() === cleanedTitle);
                        const prev = idx > 0 ? localModules[idx - 1] : null;
                        const next = idx >= 0 && idx < localModules.length - 1 ? localModules[idx + 1] : null;
                        return (
                            <div className="flex gap-4">
                                <button
                                    disabled={!prev}
                                    onClick={() => prev && onClickModule(prev.replace(/[*#]/g, '').trim())}
                                    className="px-5 py-2.5 rounded-lg font-semibold text-white transition-all disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 shadow-md"
                                >
                                    ← Previous
                                </button>
                                <button
                                    disabled={!next}
                                    onClick={() => next && onClickModule(next.replace(/[*#]/g, '').trim())}
                                    className="px-5 py-2.5 rounded-lg font-semibold text-white transition-all disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 shadow-md"
                                >
                                    Next →
                                </button>
                            </div>
                        );
                    })()}
                </div>
              </>
            )}
        </div>
      </main>
    </>
  );
}