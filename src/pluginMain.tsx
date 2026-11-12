import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PluginSimulator } from './components/PluginSimulator';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="w-screen h-screen bg-[#141618] text-neutral-200 antialiased overflow-y-auto overflow-x-hidden flex flex-col select-none">
      <PluginSimulator />
    </div>
  </StrictMode>
);
