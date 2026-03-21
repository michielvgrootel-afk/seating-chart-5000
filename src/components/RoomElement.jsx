import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function RoomElement({ element }) {
  const { state, dispatch } = useApp();
  const isLayoutMode = state.ui.mode === 'layout';
  const isSelected = state.ui.selectedDeskId === `el-${element.id}`;

  const dragStartRef = useRef(null);

  function handlePointerDown(e) {
    if (!isLayoutMode) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y,
    };
  }

  function handlePointerMove(e) {
    if (!dragStartRef.current) return;
    const { startX, startY, origX, origY } = dragStartRef.current;
    dispatch({
      type: 'MOVE_ROOM_ELEMENT',
      id: element.id,
      x: Math.max(0, origX + (e.clientX - startX)),
      y: Math.max(0, origY + (e.clientY - startY)),
    });
  }

  function handlePointerUp() {
    dragStartRef.current = null;
  }

  function handleClick(e) {
    if (!isLayoutMode) return;
    e.stopPropagation();
    dispatch({ type: 'SET_UI', ui: { selectedDeskId: isSelected ? null : `el-${element.id}` } });
  }

  return (
    <div
      className={[
        'room-element',
        `room-element--${element.type}`,
        isSelected ? 'room-element--selected' : '',
        isLayoutMode ? 'room-element--layout-mode' : '',
      ].filter(Boolean).join(' ')}
      style={{
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        cursor: isLayoutMode ? 'grab' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <span className="room-element__label">{element.label}</span>

      {isSelected && isLayoutMode && (
        <button
          className="desk__delete-btn"
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_ROOM_ELEMENT', id: element.id }); }}
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  );
}
