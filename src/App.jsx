import React, { useRef } from 'react';
import { useApp } from './context/AppContext';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import TemplateModal from './components/TemplateModal';

export default function App() {
  const { state } = useApp();
  const canvasRef = useRef(null);

  return (
    <div className="app">
      <Toolbar canvasRef={canvasRef} />
      <div className="app__body">
        <Sidebar />
        <main className="app__main">
          <Canvas canvasRef={canvasRef} />
        </main>
      </div>
      {state.ui.showTemplateModal && <TemplateModal />}
    </div>
  );
}
