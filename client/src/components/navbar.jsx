// src/components/NavBar.jsx
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext'; // adjust path if AuthContext is in src/

export default function NavBar({ showPromptBox = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, logout } = useAuth(); // reactive token from context

  // hide prompt box on these paths 
  const noPromptPaths = ['/', '/login'];
  const canShowPrompt = token && !noPromptPaths.includes(location.pathname);

  return (
    <header className="w-full bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-b border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
   
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow">🖥️</div>
              <span className="text-2xl font-extrabold text-blue-200">AI Course Generator</span>
            

            {token && (
              <nav className="hidden md:flex items-center gap-3 ml-6">
                <Link to="/dashboard" className="px-3 py-2 rounded hover:bg-blue-800 text-blue-100">Dashboard</Link>
                <Link to="/dashboard/my-courses" className="px-3 py-2 rounded hover:bg-blue-800 text-blue-100">My Courses</Link>
              </nav>
            )}
          </div>

          {canShowPrompt ? (
            <div className="flex-1 flex justify-center px-4">
              {/* your prompt box markup (if you want it here) */}
              <div className="w-full max-w-2xl" />
            </div>
          ) : <div className="flex-1" />}

          <div className="flex items-center gap-3">
            {token ? (
              <>
                
                <button onClick={() => { logout(); navigate('/login'); }} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Logout</button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="px-3 py-2 bg-transparent text-blue-200 hover:underline">Login</Link>
                <Link to="/" className="px-3 py-2 bg-blue-600 text-white rounded">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
