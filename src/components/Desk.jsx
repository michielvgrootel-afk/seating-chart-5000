import React, { useRef } from 'react';
import { useApp, useActiveClass } from '../context/AppContext';

const DESK_W = 80;
const DESK_H = 58;

export default function Desk({ desk, index, relHighlight, clusterColor }) {
  const { state, dispatch } = useApp();
  const activeClass = useActiveClass();
  const { settings, ui } = state;

  const studentId = activeClass?.assignments[desk.id] ?? null;
  const student = activeClass?.students.find(s => s.id === studentId) ?? null;

  const isDragOver = ui.dragOverDeskId === desk.id;
  const isSelected = ui.selectedDeskId === desk.id;
  const isLayoutMode = ui.mode === 'layout';

  // ── Drag (reposition) via pointer events ───────────────────────────────────
  const dragStartRef = useRef(null);

  function handlePointerDown(e) {
    if (!isLayoutMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: desk.x,
      origY: desk.y,
    };
  }

  function handlePointerMove(e) {
    if (!dragStartRef.current) return;
    const { startX, startY, origX, origY } = dragStartRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dispatch({ type: 'MOVE_DESK', id: desk.id, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) });
  }

  function handlePointerUp(e) {
    dragStartRef.current = null;
  }

  // ── Select / Delete in layout mode ─────────────────────────────────────────
  function handleClick(e) {
    if (!isLayoutMode) return;
    e.stopPropagation();
    dispatch({ type: 'SET_UI', ui: { selectedDeskId: isSelected ? null : desk.id } });
  }

  // ── Drop student (assign mode) ──────────────────────────────────────────────
  function handleDragOver(e) {
    if (isLayoutMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dispatch({ type: 'SET_UI', ui: { dragOverDeskId: desk.id } });
  }

  function handleDragLeave() {
    dispatch({ type: 'SET_UI', ui: { dragOverDeskId: null } });
  }

  function handleDrop(e) {
    if (isLayoutMode) return;
    e.preventDefault();
    dispatch({ type: 'SET_UI', ui: { dragOverDeskId: null } });
    const studentId = e.dataTransfer.getData('studentId');
    if (!studentId) return;
    dispatch({ type: 'ASSIGN_STUDENT', deskId: desk.id, studentId });
  }

  // ── Unassign on double-click (assign mode) ──────────────────────────────────
  function handleDoubleClick(e) {
    if (isLayoutMode) return;
    e.stopPropagation();
    if (studentId) {
      dispatch({ type: 'UNASSIGN_DESK', deskId: desk.id });
    }
  }

  // ── Label text ──────────────────────────────────────────────────────────────
  function getLabel() {
    if (student) {
      if (settings.labelStyle === 'initials') {
        return student.name
          .split(' ')
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 3);
      }
      return student.name;
    }
    if (settings.labelStyle === 'number') return String(index + 1);
    return desk.label || '';
  }

  const accentColor = desk.color || 'var(--accent)';

  return (
    <div
      className={[
        'desk',
        student ? 'desk--occupied' : 'desk--empty',
        isDragOver ? 'desk--dragover' : '',
        isSelected ? 'desk--selected' : '',
        isLayoutMode ? 'desk--layout-mode' : '',
        relHighlight === 'avoid' ? 'desk--rel-avoid' : '',
        relHighlight === 'prefer' ? 'desk--rel-prefer' : '',
        relHighlight === 'warning' ? 'desk--rel-warning' : '',
      ].filter(Boolean).join(' ')}
      style={{
        left: desk.x,
        top: desk.y,
        width: DESK_W,
        height: DESK_H,
        fontSize: settings.fontSize,
        '--desk-accent': accentColor,
        cursor: isLayoutMode ? 'grab' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title={
        isLayoutMode
          ? 'Drag to move · Click to select · Delete key to remove'
          : student
          ? `${student.name} · Double-click to unassign`
          : 'Drop a student here'
      }
    >
      {/* Cluster / color stripe */}
      {(clusterColor || desk.color) && (
        <div
          className="desk__stripe"
          style={{ background: clusterColor || desk.color }}
        />
      )}

      {/* Label */}
      <span className="desk__label">{getLabel()}</span>

      {/* Delete badge in layout mode */}
      {isSelected && isLayoutMode && (
        <button
          className="desk__delete-btn"
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_DESK', id: desk.id }); }}
          title="Delete desk"
        >
          ×
        </button>
      )}
    </div>
  );
}

export { DESK_W, DESK_H };
