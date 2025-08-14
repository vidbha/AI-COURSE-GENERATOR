// src/components/Topic.jsx
import React from 'react';
import ModuleDetail from './ModuleDetail';

const Topic = ({ topic, coursePrompt }) => {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold mb-4">{topic.title}</h2>
      <div className="space-y-8">
        {topic.modules.map((mod, idx) => (
          <ModuleDetail key={idx} coursePrompt={coursePrompt} moduleTitle={mod.title} />
        ))}
      </div>
    </div>
  );
};

export default Topic;
