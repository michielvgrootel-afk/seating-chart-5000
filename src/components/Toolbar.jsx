import React from 'react';
import { useApp, useActiveClass, useActiveLayout } from '../context/AppContext';
import { saveClassToJson, loadClassFromJson } from '../utils/fileIO';
import { exportAsPng } from '../utils/exportImage';

export default function Toolbar({ canvasRef }) {
  const { state, dispatch } = useApp();
  const activeClass = useActiveClass();
  const layout = useActiveLayout();
  const isLayoutMode = state.ui.mode === 'layout';

  /** Save the active class to a .class.json file */
  function handleSave() {
    if (!activeClass) return;
    saveClassToJson(activeClass);
  }

  /** Import a class from file — adds it or overwrites if same name */
  async function handleImport() {
    try {
      const classData = await loadClassFromJson();
      const existing = state.classes.find(c => c.name === classData.name);
      if (existing) {
        const confirmed = window.confirm(
          `A class named "${classData.name}" already exists.\n\nOverwrite it with the imported class?`
        );
        if (!confirmed) return;
        dispatch({ type: 'IMPORT_CLASS', classData, replaceId: existing.id });
      } else {
        dispatch({ type: 'IMPORT_CLASS', classData });
      }
    } catch (err) {
      if (err.message !== 'No file selected') {
        alert(`Could not load class: ${err.message}`);
      }
    }
  }

  async function handleExport() {
    if (!canvasRef?.current) return;
    const className = activeClass?.name ?? 'seating-chart';
    const filename = className.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    await exportAsPng(canvasRef.current, filename);
  }

  const deskCount = layout.desks.length;
  const studentCount = activeClass?.students.length ?? 0;
  const seatedCount = Object.keys(activeClass?.assignments ?? {}).length;

  return (
    <header className="toolbar">
      <div className="toolbar__left">
        <div className="toolbar__logo">
          <span className="toolbar__logo-icon">🪑</span>
          <span className="toolbar__logo-text">Seating Chart 5000</span>
        </div>

        {/* Mode toggle */}
        <div className="toolbar__mode-toggle">
          <button
            className={`mode-btn ${!isLayoutMode ? 'mode-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UI', ui: { mode: 'assign', selectedDeskId: null } })}
            title="Assign students to seats"
          >
            Assign Students
          </button>
          <button
            className={`mode-btn ${isLayoutMode ? 'mode-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UI', ui: { mode: 'layout', selectedDeskId: null } })}
            title="Edit room layout — drag desks, add/remove furniture"
          >
            Edit Layout
          </button>
        </div>
      </div>

      <div className="toolbar__center">
        {deskCount > 0 && (
          <span className="toolbar__stats">
            {seatedCount}/{Math.min(studentCount, deskCount)} seated
            {studentCount > deskCount && (
              <span className="toolbar__stats-warn"> · {studentCount - deskCount} students without a desk</span>
            )}
          </span>
        )}
      </div>

      <div className="toolbar__right">
        <button className="btn btn--ghost" onClick={handleImport} title="Load a class from a saved file">
          📂 Load Class
        </button>
        <button className="btn btn--ghost" onClick={handleSave} disabled={!activeClass} title="Save the active class to a file">
          💾 Save Class
        </button>
        <button
          className="btn btn--primary"
          onClick={handleExport}
          disabled={deskCount === 0}
          title="Export canvas as PNG image"
        >
          📷 Export PNG
        </button>
      </div>
    </header>
  );
}
