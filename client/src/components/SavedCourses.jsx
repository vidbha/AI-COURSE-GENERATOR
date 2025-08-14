// src/components/SavedCourses.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useModuleContext } from './ModuleContext';
import { useNavigate } from 'react-router-dom';

export default function SavedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setModules, setPrompt } = useModuleContext();
  const navigate = useNavigate();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/my-courses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('⚠️ Failed to fetch saved courses', err);
      alert('⚠️ Failed to fetch saved courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // normalize course.modules into an array of objects: { title, content?, quiz? }
  const normalizeModules = (course) => {
    // If API already returns modules_full (objects), prefer that
    if (course.modules_full && Array.isArray(course.modules_full) && course.modules_full.length) {
      return course.modules_full.map(m => ({
        title: (m && m.title) ? String(m.title).trim() : '',
        content: m && m.content ? String(m.content) : '',
        quiz: m && m.quiz ? String(m.quiz) : ''
      }));
    }

    // If modules are objects with title
    if (Array.isArray(course.modules) && course.modules.length) {
      const first = course.modules[0];
      // array of strings?
      if (typeof first === 'string') {
        return course.modules.map(t => ({ title: String(t).trim(), content: '', quiz: '' }));
      }
      // array of objects (legacy)
      return course.modules.map(m => ({
        title: (m && m.title) ? String(m.title).trim() : '',
        content: m && m.content ? String(m.content) : '',
        quiz: m && m.quiz ? String(m.quiz) : ''
      }));
    }

    return [];
  };

  const loadCourse = (course) => {
    const modulesObj = normalizeModules(course);
    const titles = modulesObj.map(m => m.title).filter(Boolean);
    if (titles.length === 0) {
      alert('This course has no module titles saved.');
      return;
    }

    setPrompt(course.prompt);
    setModules(titles);
    // navigate to first module, include coursePrompt so ModuleDetail can fetch saved content
    const first = encodeURIComponent(titles[0]);
    const cp = encodeURIComponent(course.prompt);
    navigate(`/dashboard/module/${first}?coursePrompt=${cp}`);
  };

  const deleteCourse = async (idxToDelete) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await axios.delete(`/api/delete-course/${idxToDelete}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCourses(prev => prev.filter((_, idx) => idx !== idxToDelete));
    } catch (err) {
      console.error('⚠️ Failed to delete course', err);
      alert('⚠️ Failed to delete course');
    }
  };

  const onClickModule = (course, moduleObj) => {
    const title = (moduleObj && moduleObj.title) ? moduleObj.title : '';
    if (!title) {
      alert('Module title missing');
      return;
    }
    // set context and modules list (titles) so UI shows modules in sidebar
    const modulesObj = normalizeModules(course);
    const titles = modulesObj.map(m => m.title).filter(Boolean);
    setPrompt(course.prompt);
    setModules(titles);
    navigate(`/dashboard/module/${encodeURIComponent(title)}?coursePrompt=${encodeURIComponent(course.prompt)}`);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-black overflow-hidden">
      {/* Random stars */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-20">
        {[...Array(60)].map((_, i) => {
          const top = Math.random() * 100;
          const left = Math.random() * 100;
          const size = Math.random() * 2 + 1;
          const animationDelay = Math.random() * 2;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-70 animate-pulse"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${animationDelay}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 prose max-w-full dark:prose-invert px-6 py-10">
        <h1 className="text-3xl font-bold mb-6 text-blue-300 drop-shadow-lg flex items-center gap-2">
          <span role="img" aria-label="space">🪐</span> My Saved Courses
        </h1>

        {loading ? (
          <p className="text-blue-200">⏳ Loading your saved courses...</p>
        ) : (
          <>
            {courses.length === 0 ? (
              <p className="text-blue-200">No saved courses yet.</p>
            ) : (
              <ul className="space-y-8">
                {courses.map((course, idx) => {
                  const modulesObj = normalizeModules(course);
                  const hasTitles = modulesObj.some(m => m.title && m.title.length > 0);
                  return (
                    <li key={idx} className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-900 border border-blue-700 p-5 rounded-xl shadow-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-4">
                          <h2 className="text-xl font-semibold text-blue-200">{String(course.prompt)}</h2>
                          <p className="text-xs text-blue-400">
                            Saved on: {new Date(course.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => loadCourse(course)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shadow"
                          >
                            Load Course
                          </button>
                          <button
                            onClick={() => deleteCourse(idx)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 shadow"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {hasTitles ? (
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {modulesObj.map((mod, i) => {
                            const title = mod.title || '(untitled)';
                            return (
                              <li key={i}>
                                <span
                                  className="text-blue-300 cursor-pointer hover:underline hover:text-yellow-300 transition"
                                  onClick={() => onClickModule(course, mod)}
                                >
                                  {title.replace(/[*#`]/g, '').trim()}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-blue-200 italic">No module titles saved for this course.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
