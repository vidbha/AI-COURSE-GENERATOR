// src/components/QuizRenderer.jsx
import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import CodeBlock from './CodeBlock';

// ... (tryParseJSON and splitByQuestionMarkers functions remain the same)
function tryParseJSON(text) {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return null;
    const arr = parsed.map(item => {
      if (!item) return null;
      const question = item.question || item.q || item.prompt || '';
      const rawOptions = item.options || item.choices || item.answers || [];
      const options = Array.isArray(rawOptions) ? rawOptions.map(String) : [];
      let correctIndex = null;
      let correctText = null;
      if (item.answer !== undefined && item.answer !== null) {
        const a = String(item.answer).trim();
        const letterMatch = a.match(/^[A-Z]$/i) || a.match(/^[A-Z]\.$/i);
        if (letterMatch) correctIndex = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
        else {
          const idx = options.findIndex(o => o.toLowerCase().includes(a.toLowerCase()));
          if (idx >= 0) correctIndex = idx;
          else correctText = a;
        }
      }
      return { question: String(question || '').trim(), options, correctIndex, correctText };
    }).filter(Boolean);
    return arr.length ? arr : null;
  } catch (e) {
    return null;
  }
}

function splitByQuestionMarkers(text) {
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (/Question\s*\d+/i.test(t)) {
    const parts = t.split(/(?:\n|^)(?=Question\s*\d+[:.\s])/i);
    if (parts.length > 1) return parts.map(p => p.trim()).filter(Boolean);
  }

  if (/\n\d+\s*[.)]\s+/.test('\n' + t)) {
    const parts = t.split(/(?:^|\n)(?=\d+\s*[.)]\s+)/);
    if (parts.length > 1) return parts.map(p => p.trim()).filter(Boolean);
  }

  const dbl = t.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  if (dbl.length > 1) return dbl;

  return [t.trim()];
}


function extractOptionsAndAnswer(block) {
  const originalLines = block.split('\n');
  
  let answerText = null;
  
  // --- CHANGE #1: Improved Regex to find the answer line, ignoring leading asterisks ---
  const answerLineIdx = originalLines.findIndex(l => /^\**\s*Answer\s*[:\-]/i.test(l.trim()));

  if (answerLineIdx >= 0) {
    const al = originalLines.splice(answerLineIdx, 1)[0];
    const m = al.match(/Answer\s*[:\-]?\s*(.+)/i);
    // --- CHANGE #2: Clean up the extracted answer text from markdown characters ---
    answerText = m ? m[1].trim().replace(/[.)*]+$/, '').trim() : '';
  }

  const lines = originalLines.map(l => l.trim()).filter(Boolean);
  
  const optionPattern = /^[A-Z][\).\-\s]+\s*/i; // Options are A, B, C, D, etc.
  let firstOptionIndex = lines.findIndex(l => optionPattern.test(l));

  if (firstOptionIndex === -1) {
    const optionsHeaderIndex = lines.findIndex(l => /^Options?\s*[:]?/i.test(l));
    if (optionsHeaderIndex !== -1) {
        firstOptionIndex = optionsHeaderIndex + 1;
    }
  }

  const questionLines = firstOptionIndex !== -1 ? lines.slice(0, firstOptionIndex) : lines;
  const optionLines = firstOptionIndex !== -1 ? lines.slice(firstOptionIndex) : [];
  
  let question = questionLines.join('\n').replace(/^(?:Question\s*\d+[:.\s]*|\d+\s*[.)]\s*)/i, '').trim();
  question = question.replace(/Options\s*:?\s*$/i, '').trim();

  const options = optionLines
    .map(optLine => optLine.replace(optionPattern, '').trim())
    // Filter out any leftover "Answer:" lines that might have been picked up
    .filter(optLine => optLine && !/^\**\s*Answer\s*[:\-]/i.test(optLine));

  let correctIndex = null;
  let correctText = null;
  if (answerText) {
    const letter = (answerText.match(/^[A-Z]$/i) || answerText.match(/^[A-Z]\.$/i) || answerText.match(/^[A-Z]\)/i));
    if (letter) {
      const ch = letter[0].toUpperCase().replace(/[^A-Z]/g, '');
      correctIndex = ch.charCodeAt(0) - 65;
    } else {
      const single = answerText.match(/\b([A-Z])\b/i);
      if (single) correctIndex = single[1].toUpperCase().charCodeAt(0) - 65;
      else {
        const idx = options.findIndex(o => o.toLowerCase().includes(answerText.toLowerCase()));
        if (idx >= 0) correctIndex = idx;
        else correctText = answerText;
      }
    }
  }
  
  return { question: question || '', options, correctIndex: (typeof correctIndex === 'number' ? correctIndex : null), correctText: correctText || null };
}

export default function QuizRenderer({ quizText }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [revealMap, setRevealMap] = useState({});

  const qs = useMemo(() => {
    if (!quizText) return [];
    
    const processedText = quizText.replace(/^Quiz Questions\s*[:*]*/i, '').trim();

    const json = tryParseJSON(processedText);
    if (json) return json;

    const blocks = splitByQuestionMarkers(processedText);

    return blocks.map(b => extractOptionsAndAnswer(b)).filter(p => p && (p.question || p.options.length));
  }, [quizText]);

  const finalQs = qs.length ? qs : [{ question: quizText || 'Quiz', options: [], correctIndex: null, correctText: quizText || '' }];

  const select = (i, optIdx) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [i]: optIdx }));
  };

  const submit = () => setSubmitted(true);

  const revealAnswer = (i) => {
    setRevealMap(m => ({ ...m, [i]: true }));
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setRevealMap({});
  };

  return (
    <section className="relative mt-8">
      <div className="max-w-3xl mx-auto bg-blue-950 bg-opacity-80 rounded-xl shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-blue-200 flex items-center gap-2"><span>🧠</span> Quiz Questions</h2>

        {finalQs.map((q, i) => {
          const hasOptions = Array.isArray(q.options) && q.options.length > 0;
          const userChoice = answers[i];
          const correctIdx = (typeof q.correctIndex === 'number') ? q.correctIndex : null;
          const correctText = q.correctText || null;

            return (
            <div key={i} className="mb-6">
              <div className="font-semibold mb-3 text-blue-100">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                p: ({node, ...props}) => <span {...props} />,
                code: CodeBlock,
                }}
              >
                {`${i + 1}. ${q.question}`}
              </ReactMarkdown>
              </div>

              {hasOptions ? (
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                const selected = userChoice === j;
                const isCorrect = (submitted && correctIdx === j);
                const isWrongSelected = (submitted && selected && correctIdx !== null && correctIdx !== j);
                const matchByText = !isCorrect && submitted && correctText && opt.toLowerCase().includes(correctText.toLowerCase());
                return (
                  <button
                  key={j}
                  onClick={() => select(i, j)}
                  disabled={submitted}
                  className={`w-full text-left px-4 py-2 border rounded transition
                    ${isCorrect ? 'bg-green-600 border-green-500 text-white' : ''}
                    ${isWrongSelected ? 'bg-red-600 border-red-500 text-white' : ''}
                    ${!isCorrect && !isWrongSelected && selected ? 'bg-violet-500 border-violet-500 text-white' : ''}
                    ${!isCorrect && !isWrongSelected && !selected ? 'bg-blue-900 border-blue-700 hover:bg-blue-800 text-blue-100' : ''}
                    ${matchByText ? 'bg-green-600 border-green-500 text-white' : ''}
                    ${submitted ? 'cursor-not-allowed' : ''}
                  `}
                  >
                  <strong className="mr-2">{String.fromCharCode(65 + j)}.</strong> {opt}
                  </button>
                );
                })}
              </div>
              ) : (
              <>
                <p className="mb-2 text-blue-200 italic text-sm">This question has no multiple-choice options.</p>
                {!submitted && !revealMap[i] && (
                <button onClick={() => revealAnswer(i)} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  Reveal Answer
                </button>
                )}
                {(submitted || revealMap[i]) && (
                <div className="mt-3 p-3 bg-blue-900 rounded text-blue-100">
                  <strong>Answer:</strong>
                  <div className="mt-1">
                  {q.correctText || 'Answer not provided.'}
                  </div>
                </div>
                )}
              </>
              )}
            </div>
            );
        })}

        <div className="mt-6 border-t border-blue-800 pt-4">
          {!submitted ? (
            <button onClick={submit} className="w-full px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-transform transform hover:scale-105">
              Submit Answers
            </button>
          ) : (
            <button onClick={handleRetake} className="w-full px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-transform transform hover:scale-105">
              Retake Quiz
            </button>
          )}
        </div>
      </div>
    </section>
  );
}