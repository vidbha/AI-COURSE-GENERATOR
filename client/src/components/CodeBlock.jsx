// src/components/CodeBlock.jsx
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function CodeBlock({ node, inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeString = String(children).trim();
  const treatAsInline = inline || (!codeString.includes('\n') && codeString.length < 25);

  if (treatAsInline) {
    return (
      <code className="px-1.5 py-0.5 mx-1 bg-gray-700/60 text-emerald-300 font-mono text-base rounded" {...props}>
        {children}
      </code>
    );
  }

  const language = match ? match[1] : 'text';
  return (
    <div className="my-4 rounded-lg bg-gray-900/70 border border-gray-700 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 rounded-t-lg">
        <span className="text-sm text-gray-300 font-sans">{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
          {copied ? ( <><CheckIcon className="h-4 w-4 text-green-400" /> Copied</> ) : ( <><ClipboardIcon className="h-4 w-4" /> Copy code</> )}
        </button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} language={language} PreTag="div" {...props}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};