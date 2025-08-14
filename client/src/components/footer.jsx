// src/components/Footer.jsx
import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-t border-blue-800 mt-8">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-blue-300">
        <div className="mb-2">Made with ❤️ • AI Course Generator</div>
        <div>© {new Date().getFullYear()} Vidhi — All rights reserved</div>
      </div>
    </footer>
  );
}
