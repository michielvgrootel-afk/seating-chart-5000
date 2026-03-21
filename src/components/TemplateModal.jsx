import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function TemplateModal() {
  const { dispatch } = useApp();
  const [tab, setTab] = useState('grid');

  // Grid config
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);

  // Cluster config
  const [numGroups, setNumGroups] = useState(5);
  const [desksPerGroup, setDesksPerGroup] = useState(4);

  function close() {
    dispatch({ type: 'SET_UI', ui: { showTemplateModal: false } });
  }

  function apply() {
    if (tab === 'grid') {
      dispatch({ type: 'APPLY_TEMPLATE', templateType: 'grid', config: { rows: +rows, cols: +cols } });
    } else {
      dispatch({ type: 'APPLY_TEMPLATE', templateType: 'clusters', config: { numGroups: +numGroups, desksPerGroup: +desksPerGroup } });
    }
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Apply Template</h2>
          <button className="modal__close" onClick={close}>×</button>
        </div>

        <p className="modal__warning">
          Applying a template will replace all existing desks and clear current assignments.
        </p>

        <div className="modal__tabs">
          <button
            className={`modal__tab ${tab === 'grid' ? 'modal__tab--active' : ''}`}
            onClick={() => setTab('grid')}
          >
            Rows & Columns
          </button>
          <button
            className={`modal__tab ${tab === 'clusters' ? 'modal__tab--active' : ''}`}
            onClick={() => setTab('clusters')}
          >
            Clusters / Groups
          </button>
        </div>

        {tab === 'grid' && (
          <div className="modal__body">
            <div className="modal__preview modal__preview--grid">
              {Array.from({ length: Math.min(rows, 5) }).map((_, r) => (
                <div key={r} className="preview-row">
                  {Array.from({ length: Math.min(cols, 7) }).map((_, c) => (
                    <div key={c} className="preview-desk" />
                  ))}
                </div>
              ))}
              {rows > 5 && <p className="preview-note">+ {rows - 5} more rows</p>}
            </div>
            <div className="modal__fields">
              <label>
                Rows
                <input type="number" min={1} max={12} value={rows} onChange={e => setRows(e.target.value)} />
              </label>
              <label>
                Columns
                <input type="number" min={1} max={12} value={cols} onChange={e => setCols(e.target.value)} />
              </label>
              <p className="modal__info">{rows * cols} desks total</p>
            </div>
          </div>
        )}

        {tab === 'clusters' && (
          <div className="modal__body">
            <div className="modal__preview modal__preview--clusters">
              {Array.from({ length: Math.min(numGroups, 6) }).map((_, g) => (
                desksPerGroup >= 7 ? (
                  /* Circle preview for 7+ desks */
                  <div key={g} className="preview-cluster preview-cluster--circle">
                    {Array.from({ length: Math.min(desksPerGroup, 12) }).map((_, d) => {
                      const angle = -Math.PI / 2 + (2 * Math.PI * d) / Math.min(desksPerGroup, 12);
                      const r = 22;
                      return (
                        <div
                          key={d}
                          className="preview-desk preview-desk--small"
                          style={{
                            position: 'absolute',
                            left: `${50 + r * Math.cos(angle)}%`,
                            top: `${50 + r * Math.sin(angle)}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div key={g} className="preview-cluster">
                    {Array.from({ length: Math.min(desksPerGroup, 6) }).map((_, d) => (
                      <div key={d} className="preview-desk preview-desk--small" />
                    ))}
                  </div>
                )
              ))}
              {numGroups > 6 && <p className="preview-note">+ {numGroups - 6} more groups</p>}
            </div>
            <div className="modal__fields">
              <label>
                Number of groups
                <input type="number" min={1} max={12} value={numGroups} onChange={e => setNumGroups(e.target.value)} />
              </label>
              <label>
                Desks per group
                <input type="number" min={2} max={12} value={desksPerGroup} onChange={e => setDesksPerGroup(e.target.value)} />
              </label>
              <p className="modal__info">
                {numGroups * desksPerGroup} desks total
                {desksPerGroup >= 7 && ' · circle layout'}
              </p>
            </div>
          </div>
        )}

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={close}>Cancel</button>
          <button className="btn btn--primary" onClick={apply}>Apply Template</button>
        </div>
      </div>
    </div>
  );
}
