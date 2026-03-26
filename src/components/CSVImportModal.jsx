import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { loadCSVFile, downloadCSVTemplate } from '../utils/csvImport';

export default function CSVImportModal({ onClose }) {
  const { state, dispatch } = useApp();
  const [preview, setPreview] = useState(null);     // parsed result
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [mode, setMode] = useState('merge');          // 'merge' | 'overwrite'
  const [imported, setImported] = useState(false);

  async function handleFileSelect() {
    setError(null);
    setWarnings([]);
    setPreview(null);
    setImported(false);

    try {
      const result = await loadCSVFile();
      setPreview(result);
      setWarnings(result.warnings);
    } catch (err) {
      if (err.message !== 'No file selected') {
        setError(err.message);
      }
    }
  }

  function handleImport() {
    if (!preview) return;

    // Check for existing classes that would be affected
    const existingNames = preview.classes
      .filter(c => state.classes.some(ec => ec.name.toLowerCase() === c.name.toLowerCase()))
      .map(c => c.name);

    if (existingNames.length > 0 && mode === 'overwrite') {
      const confirmed = window.confirm(
        `The following classes already exist and will be OVERWRITTEN:\n\n${existingNames.join('\n')}\n\nThis will replace all students, assignments, and relationships for these classes. Continue?`
      );
      if (!confirmed) return;
    }

    dispatch({ type: 'IMPORT_CSV', classes: preview.classes, mode });
    setImported(true);
  }

  const totalStudents = preview?.classes.reduce((sum, c) => sum + c.students.length, 0) ?? 0;
  const totalRelationships = preview?.classes.reduce((sum, c) => sum + c.relationships.length, 0) ?? 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal csv-modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>📄 Import from CSV</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="csv-modal__body">
          {/* Step 1: Template download + file select */}
          {!imported && (
            <>
              <p className="csv-modal__intro">
                Upload a CSV file to quickly import classes with student names and relationships.
                Need the template? Download it first, fill it in, then upload.
              </p>

              <div className="csv-modal__actions-row">
                <button className="btn btn--ghost btn--sm" onClick={downloadCSVTemplate}>
                  📥 Download Template
                </button>
                <button className="btn btn--primary btn--sm" onClick={handleFileSelect}>
                  📂 {preview ? 'Choose Different File' : 'Select CSV File'}
                </button>
              </div>

              {error && (
                <div className="csv-modal__error">
                  ❌ {error}
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div className="csv-modal__preview">
                  <h3>Preview</h3>
                  <div className="csv-modal__summary">
                    <div className="csv-modal__stat">
                      <span className="csv-modal__stat-num">{preview.classes.length}</span>
                      <span className="csv-modal__stat-label">{preview.classes.length === 1 ? 'class' : 'classes'}</span>
                    </div>
                    <div className="csv-modal__stat">
                      <span className="csv-modal__stat-num">{totalStudents}</span>
                      <span className="csv-modal__stat-label">students</span>
                    </div>
                    <div className="csv-modal__stat">
                      <span className="csv-modal__stat-num">{totalRelationships}</span>
                      <span className="csv-modal__stat-label">relationships</span>
                    </div>
                  </div>

                  {/* Class breakdown */}
                  <div className="csv-modal__class-list">
                    {preview.classes.map((c, i) => {
                      const existing = state.classes.find(ec => ec.name.toLowerCase() === c.name.toLowerCase());
                      return (
                        <div key={i} className="csv-modal__class-item">
                          <span className="csv-modal__class-name">{c.name}</span>
                          <span className="csv-modal__class-info">
                            {c.students.length} students, {c.relationships.length} relationships
                          </span>
                          {existing && (
                            <span className="csv-modal__class-exists">
                              (exists — will {mode === 'merge' ? 'merge' : 'overwrite'})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <details className="csv-modal__warnings">
                      <summary>⚠️ {warnings.length} warning{warnings.length !== 1 ? 's' : ''}</summary>
                      <ul>
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </details>
                  )}

                  {/* Mode selector — only show if there are existing classes */}
                  {preview.classes.some(c => state.classes.some(ec => ec.name.toLowerCase() === c.name.toLowerCase())) && (
                    <div className="csv-modal__mode">
                      <label>When a class already exists:</label>
                      <div className="csv-modal__mode-options">
                        <label className="csv-modal__mode-option">
                          <input
                            type="radio"
                            name="import-mode"
                            value="merge"
                            checked={mode === 'merge'}
                            onChange={() => setMode('merge')}
                          />
                          <span><strong>Merge</strong> — add new students, keep existing</span>
                        </label>
                        <label className="csv-modal__mode-option">
                          <input
                            type="radio"
                            name="import-mode"
                            value="overwrite"
                            checked={mode === 'overwrite'}
                            onChange={() => setMode('overwrite')}
                          />
                          <span><strong>Overwrite</strong> — replace the class entirely</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="csv-modal__import-row">
                    <button className="btn btn--primary" onClick={handleImport}>
                      Import {preview.classes.length} {preview.classes.length === 1 ? 'Class' : 'Classes'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Success state */}
          {imported && (
            <div className="csv-modal__success">
              <div className="csv-modal__success-icon">✅</div>
              <h3>Import Complete!</h3>
              <p>
                Imported <strong>{preview.classes.length}</strong> {preview.classes.length === 1 ? 'class' : 'classes'} with <strong>{totalStudents}</strong> students and <strong>{totalRelationships}</strong> relationships.
              </p>
              {warnings.length > 0 && (
                <p className="csv-modal__success-warnings">
                  ⚠️ {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — some relationship targets weren't found. Check the Relationships tab for accuracy.
                </p>
              )}
              <button className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
