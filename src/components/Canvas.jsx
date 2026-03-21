import React, { useRef } from 'react';
import { useApp, useActiveLayout, useRelationshipHighlights, useClusterIds } from '../context/AppContext';
import Desk from './Desk';
import RoomElement from './RoomElement';

const CANVAS_W = 1400;
const CANVAS_H = 900;

export default function Canvas({ canvasRef }) {
  const { state, dispatch } = useApp();
  const { ui, settings } = state;
  const layout = useActiveLayout(); // ← per-class layout
  const relationshipHighlights = useRelationshipHighlights();
  const clusterIds = useClusterIds();
  const isLayoutMode = ui.mode === 'layout';

  // Build cluster color map
  const CLUSTER_PALETTE = [
    '#3b82f6', '#ef4444', '#22c55e', '#f97316',
    '#a855f7', '#eab308', '#06b6d4', '#ec4899',
    '#14b8a6', '#6366f1', '#f43f5e', '#84cc16',
  ];
  const clusterColorMap = {};
  clusterIds.forEach((id, i) => {
    clusterColorMap[id] = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
  });

  // Click on empty canvas area: deselect
  function handleCanvasClick() {
    if (ui.selectedDeskId) {
      dispatch({ type: 'SET_UI', ui: { selectedDeskId: null } });
    }
  }

  // Double-click canvas in layout mode: add desk at click position
  function handleCanvasDoubleClick(e) {
    if (!isLayoutMode) return;
    if (e.target !== e.currentTarget) return; // only bare canvas, not desk children
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 40; // center the desk
    const y = e.clientY - rect.top - 29;
    dispatch({ type: 'ADD_DESK', x: Math.max(0, x), y: Math.max(0, y) });
  }

  // Keyboard delete for selected desk
  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedDeskId) {
      if (ui.selectedDeskId.startsWith('el-')) {
        dispatch({ type: 'DELETE_ROOM_ELEMENT', id: ui.selectedDeskId.replace('el-', '') });
      } else {
        dispatch({ type: 'DELETE_DESK', id: ui.selectedDeskId });
      }
    }
  }

  // Draw grid lines if snap is enabled
  const showGrid = settings.snapToGrid;

  return (
    <div className="canvas-wrapper">
      <div
        ref={canvasRef}
        className={`canvas ${isLayoutMode ? 'canvas--layout-mode' : ''}`}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          backgroundSize: showGrid ? `${settings.gridSize}px ${settings.gridSize}px` : undefined,
        }}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Classroom canvas"
      >
        {/* ── Front-of-class indicator ─────────────────────────────────── */}
        <div className="canvas__front" onDoubleClick={e => e.stopPropagation()}>
          <div className="canvas__front-wall">
            <div className="canvas__front-screen">
              <svg className="canvas__front-screen-icon" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="7" y1="12" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="13" y1="12" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="5" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>Board / Screen</span>
            </div>
          </div>
          <div className="canvas__front-chevrons" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <svg key={i} className="canvas__front-chevron" viewBox="0 0 10 6" fill="none">
                <polyline points="1,1 5,5 9,1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ))}
          </div>
        </div>

        {/* Room elements (board, teacher desk) */}
        {layout.roomElements.map(el => (
          <RoomElement key={el.id} element={el} />
        ))}

        {/* Student desks */}
        {layout.desks.map((desk, index) => (
          <Desk
            key={desk.id}
            desk={desk}
            index={index}
            relHighlight={relationshipHighlights[desk.id] ?? null}
            clusterColor={desk.clusterId ? (clusterColorMap[desk.clusterId] ?? null) : null}
          />
        ))}

        {/* Empty state */}
        {layout.desks.length === 0 && (
          <div className="canvas__empty">
            {isLayoutMode
              ? <>
                  <span className="canvas__empty-icon">🪑</span>
                  <p>Double-click anywhere to add a desk</p>
                  <p>or use <strong>Templates</strong> for a quick start</p>
                </>
              : <>
                  <span className="canvas__empty-icon">🪑</span>
                  <p>Switch to <strong>Layout mode</strong> to add desks first</p>
                </>
            }
          </div>
        )}
      </div>
    </div>
  );
}
