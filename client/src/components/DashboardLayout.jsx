import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useModuleContext } from './ModuleContext';

export default function DashboardLayout() {
  const { modules } = useModuleContext();
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // Remove markdown junk and short lines like '## Module Titles:'
  const cleanedModules = modules.filter(mod =>
    !mod.match(/^#+\s|Module Titles/i) && mod.length > 4
  );

  // Generate random stars for the background
  const stars = Array.from({ length: 80 }).map((_, i) => {
    const size = Math.random() * 2 + 1;
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    return (
      <div
        key={i}
        className="absolute rounded-full bg-white opacity-80"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          top: `${top}%`,
          left: `${left}%`,
          boxShadow: `0 0 ${size * 3}px #fff`,
        }}
      />
    );
  });

  return (
    <div className="relative flex h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 overflow-hidden">
      {/* Star field background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars}
      </div>

      {/*<aside className="relative z-10 w-72 bg-gradient-to-b from-blue-950 via-indigo-900 to-blue-900 text-white p-4 overflow-y-auto border-r border-blue-800 shadow-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span role="img" aria-label="space">🪐</span> Space Modules
        </h2>
        <nav className="space-y-2">
          <Link
            to="/dashboard/my-courses"
            className="block hover:bg-blue-800 p-2 rounded bg-blue-900 font-semibold transition-colors duration-200"
          >
            🚀 My Courses
          </Link>

          {cleanedModules.map((mod, idx) => (
            <Link
              key={idx}
              to={`/dashboard/module/${encodeURIComponent(mod.replace(/[*#`]/g, '').trim())}`}
              className="block hover:bg-indigo-800 p-2 rounded transition-colors duration-200"
            >
              {mod.replace(/[*#`]/g, '').trim()}
            </Link>
          ))}
        </nav>
      </aside>*/}

      <main className="relative z-10 flex-1 p-6 overflow-y-auto text-white">
        <Outlet />
      </main>
    </div>
  );
}
