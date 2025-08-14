// src/components/Course.jsx
import React from 'react';
import Topic from './topic';

const Course = ({ coursePrompt, topics }) => {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Course: {coursePrompt}</h1>
      {topics.map((topic, i) => (
        <Topic key={i} topic={topic} coursePrompt={coursePrompt} />
      ))}
    </div>
  );
};

export default Course;