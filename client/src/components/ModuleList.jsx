// src/components/ModuleList.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useModuleContext } from './ModuleContext';

export default function ModuleList() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setModules, setPrompt } = useModuleContext();

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      // Step 1: Generate module titles
      const res = await axios.post(
        '/api/generate-titles',
        { prompt: input },
        getAuthHeader()
      );

      const modules = res.data.modules || [];
      setModules(modules);
      setPrompt(input);

      // Step 2: Save course to DB
      await axios.post(
        '/api/save-course',
        {
          prompt: input,
          modules: modules.map((title) => ({ title, content: '', quiz: '' })),
        },
        getAuthHeader()
      );

      // Step 3: Navigate to first module
      if (modules[0]) {
        navigate(
          `/dashboard/module/${encodeURIComponent(modules[0])}?coursePrompt=${encodeURIComponent(
            input
          )}`
        );
      }
    } catch (err) {
      alert('Error generating modules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 relative flex items-center justify-center">
      {/* Star background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-100">
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

      <div className="max-w-3xl mx-auto z-10 relative bg-blue-950 bg-opacity-80 rounded-xl shadow-2xl p-8 border border-blue-800">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-blue-200 drop-shadow-lg">
          📖 AI Course Generator
        </h1>

        <div className="flex flex-col gap-3 mb-6">
          <textarea
            className="w-[500px] h-[200px] border border-blue-400 bg-blue-900 text-blue-100 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-lg"
            placeholder="Enter course topic or description..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
          />

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-1 text-sm rounded shadow-md transition self-start"
          >
            {loading ? 'Generating...' : 'Generate Modules'}
          </button>
        </div>
      </div>
    </div>
  );
}
