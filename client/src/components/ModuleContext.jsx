import { createContext, useState, useContext } from 'react';

const ModuleContext = createContext();

export function ModuleProvider({ children }) {
  const [prompt, setPrompt] = useState('');
  const [modules, setModules] = useState([]);
  
  return (
    <ModuleContext.Provider value={{ prompt, setPrompt, modules, setModules }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModuleContext() {
  return useContext(ModuleContext);
}
