import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, useActiveClass, useActiveLayout, useClusterIds } from '../context/AppContext';
import { saveClassToJson } from '../utils/fileIO';

// ─── Colour palette for desk tagging ─────────────────────────────────────────
const DESK_COLORS = [
  { label: 'None',   value: null,      hex: 'transparent' },
  { label: 'Red',    value: '#ef4444', hex: '#ef4444' },
  { label: 'Orange', value: '#f97316', hex: '#f97316' },
  { label: 'Yellow', value: '#eab308', hex: '#eab308' },
  { label: 'Green',  value: '#22c55e', hex: '#22c55e' },
  { label: 'Blue',   value: '#3b82f6', hex: '#3b82f6' },
  { label: 'Purple', value: '#a855f7', hex: '#a855f7' },
];

// ─── Class List ───────────────────────────────────────────────────────────────
function ClassList() {
  const { state, dispatch } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  function startEdit(cls) {
    setEditingId(cls.id);
    setEditName(cls.name);
  }

  function commitEdit(id) {
    if (editName.trim()) dispatch({ type: 'RENAME_CLASS', id, name: editName.trim() });
    setEditingId(null);
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section__header">
        <span>Classes</span>
        <button
          className="icon-btn"
          title="Add new class"
          onClick={() => dispatch({ type: 'ADD_CLASS', name: `Class ${state.classes.length + 1}` })}
        >+</button>
      </div>
      <ul className="class-list">
        {state.classes.map(cls => (
          <li
            key={cls.id}
            className={`class-list__item ${cls.id === state.activeClassId ? 'class-list__item--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_CLASS', id: cls.id })}
          >
            {editingId === cls.id ? (
              <input
                className="class-list__edit-input"
                value={editName}
                autoFocus
                onChange={e => setEditName(e.target.value)}
                onBlur={() => commitEdit(cls.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(cls.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="class-list__name">{cls.name}</span>
            )}
            <div className="class-list__actions">
              <button
                className="icon-btn icon-btn--sm"
                title={`Save "${cls.name}" to file`}
                onClick={(e) => { e.stopPropagation(); saveClassToJson(cls); }}
              >💾</button>
              <button
                className="icon-btn icon-btn--sm"
                title="Rename"
                onClick={(e) => { e.stopPropagation(); startEdit(cls); }}
              >✏️</button>
              {state.classes.length > 1 && (
                <button
                  className="icon-btn icon-btn--sm icon-btn--danger"
                  title="Delete class"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${cls.name}"? This cannot be undone.`)) {
                      dispatch({ type: 'DELETE_CLASS', id: cls.id });
                    }
                  }}
                >🗑️</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Roster Panel ─────────────────────────────────────────────────────────────
function RosterPanel() {
  const { state, dispatch } = useApp();
  const activeClass = useActiveClass();
  const [newName, setNewName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');

  if (!activeClass) return null;

  const assignments = activeClass.assignments;
  const assignedStudentIds = new Set(Object.values(assignments));

  function addStudent() {
    if (!newName.trim()) return;
    dispatch({ type: 'ADD_STUDENT', name: newName });
    setNewName('');
  }

  function bulkAdd() {
    if (!bulkText.trim()) return;
    dispatch({ type: 'BULK_ADD_STUDENTS', names: bulkText });
    setBulkText('');
    setShowBulk(false);
  }

  function randomize(preserveManual) {
    dispatch({ type: 'RANDOMIZE_SEATS', preserveManual });
  }

  function clearAll() {
    if (window.confirm('Clear all seat assignments for this class?')) {
      dispatch({ type: 'CLEAR_ASSIGNMENTS' });
    }
  }

  function startEditStudent(student) {
    setEditingStudentId(student.id);
    setEditStudentName(student.name);
  }

  function commitEditStudent(studentId) {
    if (editStudentName.trim()) {
      dispatch({ type: 'RENAME_STUDENT', studentId, name: editStudentName.trim() });
    }
    setEditingStudentId(null);
  }

  const unassigned = activeClass.students.filter(s => !assignedStudentIds.has(s.id));
  const seated = activeClass.students.filter(s => assignedStudentIds.has(s.id));

  return (
    <div className="sidebar-section sidebar-section--grow">
      {/* Assignment controls */}
      <div className="sidebar-section__header">
        <span>Roster</span>
        <span className="badge">{activeClass.students.length}</span>
      </div>

      {/* Randomize / Clear */}
      <div className="assignment-controls">
        <button
          className="btn btn--primary btn--sm btn--full"
          onClick={() => randomize(false)}
          disabled={activeClass.students.length === 0 || activeClass.layout.desks.length === 0}
          title="Randomize all seats"
        >
          🎲 Randomize All
        </button>
        <button
          className="btn btn--ghost btn--sm btn--full"
          onClick={() => randomize(true)}
          disabled={unassigned.length === 0 || activeClass.layout.desks.length === 0}
          title="Assign only unassigned students, keep manual placements"
        >
          🎲 Fill Empty Seats
        </button>
        <button
          className="btn btn--ghost btn--sm btn--full"
          onClick={clearAll}
          disabled={Object.keys(assignments).length === 0}
        >
          Clear Assignments
        </button>
      </div>

      {/* Unassigned students (draggable) */}
      {unassigned.length > 0 && (
        <div className="roster-group">
          <p className="roster-group__label">Unassigned ({unassigned.length})</p>
          <ul className="roster-list">
            {unassigned.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                isAssigned={false}
                isEditing={editingStudentId === student.id}
                editName={editStudentName}
                onEditName={setEditStudentName}
                onStartEdit={() => startEditStudent(student)}
                onCommitEdit={() => commitEditStudent(student.id)}
                onDelete={() => dispatch({ type: 'REMOVE_STUDENT', studentId: student.id })}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Seated students */}
      {seated.length > 0 && (
        <div className="roster-group">
          <p className="roster-group__label">Seated ({seated.length})</p>
          <ul className="roster-list roster-list--seated">
            {seated.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                isAssigned={true}
                isEditing={editingStudentId === student.id}
                editName={editStudentName}
                onEditName={setEditStudentName}
                onStartEdit={() => startEditStudent(student)}
                onCommitEdit={() => commitEditStudent(student.id)}
                onDelete={() => dispatch({ type: 'REMOVE_STUDENT', studentId: student.id })}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Add student */}
      <div className="add-student">
        <input
          className="input"
          placeholder="Student name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addStudent()}
        />
        <button className="btn btn--primary btn--sm" onClick={addStudent}>Add</button>
      </div>

      {/* Bulk add */}
      {!showBulk ? (
        <button className="btn btn--ghost btn--sm btn--full" onClick={() => setShowBulk(true)}>
          + Bulk add (paste list)
        </button>
      ) : (
        <div className="bulk-add">
          <textarea
            className="input input--textarea"
            placeholder={"One name per line:\nAnna B.\nBen C.\nCarlos D."}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={6}
            autoFocus
          />
          <div className="bulk-add__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setShowBulk(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={bulkAdd}>Add Names</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Relationships Panel ──────────────────────────────────────────────────────
function RelationshipsPanel() {
  const { state, dispatch } = useApp();
  const activeClass = useActiveClass();
  const [studentA, setStudentA] = useState('');
  const [others, setOthers] = useState(['']); // up to 3 slots
  const [relType, setRelType] = useState('avoid');

  if (!activeClass) return null;

  const { students, relationships = [] } = activeClass;

  // All currently selected IDs (studentA + filled others) to disable in dropdowns
  const selectedIds = new Set([studentA, ...others].filter(Boolean));

  function setOtherAt(index, value) {
    setOthers(prev => prev.map((v, i) => (i === index ? value : v)));
  }

  function addSlot() {
    if (others.length < 3) setOthers(prev => [...prev, '']);
  }

  function removeSlot(index) {
    setOthers(prev => prev.filter((_, i) => i !== index));
  }

  function addRelationships() {
    if (!studentA) return;
    const filled = others.filter(id => id && id !== studentA);
    if (filled.length === 0) return;

    let skipped = 0;
    for (const partnerId of filled) {
      // Check for duplicate
      const exists = relationships.some(
        r =>
          (r.studentA === studentA && r.studentB === partnerId) ||
          (r.studentA === partnerId && r.studentB === studentA)
      );
      if (exists) {
        skipped++;
        continue;
      }
      dispatch({ type: 'ADD_RELATIONSHIP', studentA, studentB: partnerId, relType });
    }
    if (skipped > 0) {
      alert(`${skipped} duplicate relationship(s) were skipped.`);
    }
    // Reset form but keep studentA selected for quick repeat entry
    setOthers(['']);
  }

  function getName(id) {
    return students.find(s => s.id === id)?.name ?? '(removed)';
  }

  const filledCount = others.filter(id => id && id !== studentA).length;

  return (
    <div className="sidebar-section sidebar-section--grow">
      <div className="sidebar-section__header">
        <span>Relationships</span>
        <span className="badge">{relationships.length}</span>
      </div>

      {/* Add relationship form */}
      {students.length >= 2 ? (
        <div className="rel-form">
          {/* Student 1 */}
          <label className="rel-form__label">Student</label>
          <div className="rel-form__row">
            <select className="input input--select" value={studentA} onChange={e => setStudentA(e.target.value)}>
              <option value="">Select student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Type toggle */}
          <div className="rel-form__row">
            <div className="rel-form__type-toggle">
              <button
                className={`rel-type-btn ${relType === 'avoid' ? 'rel-type-btn--active-avoid' : ''}`}
                onClick={() => setRelType('avoid')}
              >
                Can't sit with
              </button>
              <button
                className={`rel-type-btn ${relType === 'prefer' ? 'rel-type-btn--active-prefer' : ''}`}
                onClick={() => setRelType('prefer')}
              >
                Works well with
              </button>
            </div>
          </div>

          {/* Partner slots (up to 3) */}
          {others.map((partnerId, i) => (
            <div className="rel-form__row" key={i}>
              <select
                className="input input--select"
                value={partnerId}
                onChange={e => setOtherAt(i, e.target.value)}
              >
                <option value="">{`Student ${i + 2}…`}</option>
                {students.map(s => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={s.id === studentA || (selectedIds.has(s.id) && s.id !== partnerId)}
                  >
                    {s.name}
                  </option>
                ))}
              </select>
              {others.length > 1 && (
                <button
                  className="icon-btn icon-btn--sm icon-btn--danger"
                  title="Remove this slot"
                  onClick={() => removeSlot(i)}
                >×</button>
              )}
            </div>
          ))}

          {/* Add another slot (max 3) */}
          {others.length < 3 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={addSlot}
              style={{ alignSelf: 'flex-start' }}
            >
              + Add another
            </button>
          )}

          <button
            className="btn btn--primary btn--sm btn--full"
            onClick={addRelationships}
            disabled={!studentA || filledCount === 0}
          >
            + Add {filledCount > 1 ? `${filledCount} Relationships` : 'Relationship'}
          </button>
        </div>
      ) : (
        <p className="rel-empty">Add at least 2 students to define relationships.</p>
      )}

      {/* Existing relationships */}
      {relationships.length > 0 ? (
        <ul className="rel-list">
          {relationships.map(rel => (
            <li key={rel.id} className={`rel-item rel-item--${rel.type}`}>
              <span className="rel-item__names">{getName(rel.studentA)} & {getName(rel.studentB)}</span>
              <span className={`rel-item__type rel-item__type--${rel.type}`}>
                {rel.type === 'avoid' ? 'Avoid' : 'Prefer'}
              </span>
              <button
                className="icon-btn icon-btn--sm icon-btn--danger"
                title="Remove relationship"
                onClick={() => dispatch({ type: 'REMOVE_RELATIONSHIP', id: rel.id })}
              >×</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rel-empty">No relationships defined yet.</p>
      )}
    </div>
  );
}

// ─── Student Row ──────────────────────────────────────────────────────────────
function StudentRow({ student, isAssigned, isEditing, editName, onEditName, onStartEdit, onCommitEdit, onDelete }) {
  function handleDragStart(e) {
    e.dataTransfer.setData('studentId', student.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <li
      className={`roster-item ${isAssigned ? 'roster-item--seated' : 'roster-item--unassigned'}`}
      draggable={!isAssigned && !isEditing}
      onDragStart={handleDragStart}
      title={isAssigned ? 'Seated' : 'Drag onto a desk to assign'}
    >
      {isEditing ? (
        <input
          className="roster-item__edit-input"
          value={editName}
          autoFocus
          onChange={e => onEditName(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={e => { if (e.key === 'Enter') onCommitEdit(); }}
        />
      ) : (
        <>
          <span className="roster-item__drag-handle">{isAssigned ? '✓' : '⋮⋮'}</span>
          <span className="roster-item__name">{student.name}</span>
          <div className="roster-item__actions">
            <button className="icon-btn icon-btn--sm" title="Rename" onClick={onStartEdit}>✏️</button>
            <button
              className="icon-btn icon-btn--sm icon-btn--danger"
              title="Remove student"
              onClick={() => { if (window.confirm(`Remove ${student.name}?`)) onDelete(); }}
            >×</button>
          </div>
        </>
      )}
    </li>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel() {
  const { state, dispatch } = useApp();
  const { settings } = state;

  function update(patch) {
    dispatch({ type: 'UPDATE_SETTINGS', settings: patch });
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section__header"><span>Display Settings</span></div>
      <div className="settings-grid">
        <label className="settings-row">
          <span>Name style</span>
          <select
            className="input input--select"
            value={settings.labelStyle}
            onChange={e => update({ labelStyle: e.target.value })}
          >
            <option value="name">Full name</option>
            <option value="initials">Initials</option>
            <option value="number">Seat number</option>
          </select>
        </label>

        <label className="settings-row">
          <span>Font size</span>
          <div className="settings-row__slider">
            <input
              type="range"
              min={9}
              max={20}
              value={settings.fontSize}
              onChange={e => update({ fontSize: +e.target.value })}
            />
            <span>{settings.fontSize}px</span>
          </div>
        </label>

        <label className="settings-row settings-row--toggle">
          <span>Snap to grid</span>
          <input
            type="checkbox"
            checked={settings.snapToGrid}
            onChange={e => update({ snapToGrid: e.target.checked })}
          />
        </label>

        <label className="settings-row settings-row--toggle">
          <span>Dark mode</span>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={e => update({ darkMode: e.target.checked })}
          />
        </label>

      </div>
    </div>
  );
}

// ─── Layout Controls ──────────────────────────────────────────────────────────
// ── Cluster colour palette — maps a cluster ID to a stable colour ──
const CLUSTER_PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f97316',
  '#a855f7', '#eab308', '#06b6d4', '#ec4899',
  '#14b8a6', '#6366f1', '#f43f5e', '#84cc16',
];

/** Given a list of cluster IDs, returns a map of clusterId → color. */
function buildClusterColorMap(clusterIds) {
  const map = {};
  clusterIds.forEach((id, i) => {
    map[id] = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
  });
  return map;
}

function LayoutControls() {
  const { state, dispatch } = useApp();
  const layout = useActiveLayout();
  const clusterIds = useClusterIds();
  const isLayoutMode = state.ui.mode === 'layout';

  const selectedDeskId = state.ui.selectedDeskId;
  const selectedDesk = selectedDeskId
    ? layout.desks.find(d => d.id === selectedDeskId) ?? null
    : null;

  const clusterColorMap = buildClusterColorMap(clusterIds);

  function handleClusterChange(e) {
    const value = e.target.value;
    if (value === '__new__') {
      dispatch({ type: 'SET_DESK_CLUSTER', id: selectedDeskId, clusterId: uuidv4() });
    } else {
      dispatch({ type: 'SET_DESK_CLUSTER', id: selectedDeskId, clusterId: value || null });
    }
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section__header"><span>Layout</span></div>
      <div className="layout-controls">
        <button
          className="btn btn--ghost btn--sm btn--full"
          onClick={() => dispatch({ type: 'SET_UI', ui: { showTemplateModal: true } })}
        >
          📐 Templates
        </button>
        {isLayoutMode && (
          <>
            <button
              className="btn btn--ghost btn--sm btn--full"
              onClick={() => dispatch({ type: 'ADD_DESK', x: 100, y: 100 })}
            >
              + Add Desk
            </button>
            <button
              className="btn btn--ghost btn--sm btn--full"
              onClick={() => dispatch({ type: 'ADD_ROOM_ELEMENT', elementType: 'board', x: 100, y: 20 })}
            >
              + Board
            </button>
            <button
              className="btn btn--ghost btn--sm btn--full"
              onClick={() => dispatch({ type: 'ADD_ROOM_ELEMENT', elementType: 'teacherDesk', x: 100, y: 80 })}
            >
              + Teacher Desk
            </button>

            {/* Cluster assignment for selected desk */}
            {selectedDesk && (
              <div className="cluster-assign">
                <label className="cluster-assign__label">Cluster group</label>
                <select
                  className="input input--select"
                  value={selectedDesk.clusterId ?? ''}
                  onChange={handleClusterChange}
                >
                  <option value="">None</option>
                  {clusterIds.map((cid, i) => (
                    <option key={cid} value={cid}>
                      Cluster {i + 1}
                    </option>
                  ))}
                  <option value="__new__">+ New cluster</option>
                </select>
                {selectedDesk.clusterId && clusterColorMap[selectedDesk.clusterId] && (
                  <span
                    className="cluster-assign__swatch"
                    style={{ background: clusterColorMap[selectedDesk.clusterId] }}
                  />
                )}
              </div>
            )}

            {layout.desks.length > 0 && (
              <button
                className="btn btn--ghost btn--sm btn--full btn--danger-ghost"
                onClick={() => {
                  if (window.confirm('Remove all desks and room elements?')) {
                    layout.desks.forEach(d => dispatch({ type: 'DELETE_DESK', id: d.id }));
                    layout.roomElements.forEach(el => dispatch({ type: 'DELETE_ROOM_ELEMENT', id: el.id }));
                  }
                }}
              >
                🗑️ Clear Layout
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Root ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'relationships'
  const { clearAllData } = useApp();

  return (
    <aside className="sidebar">
      <ClassList />
      <LayoutControls />
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'roster' ? 'sidebar-tab--active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Roster
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'relationships' ? 'sidebar-tab--active' : ''}`}
          onClick={() => setActiveTab('relationships')}
        >
          Relationships
        </button>
      </div>
      {activeTab === 'roster' ? <RosterPanel /> : <RelationshipsPanel />}
      <div className="sidebar__bottom">
        {showSettings && <SettingsPanel />}
        {showSettings && (
          <button
            className="btn btn--ghost btn--sm btn--full btn--danger-ghost"
            style={{ marginBottom: 4 }}
            onClick={() => {
              if (window.confirm('This will delete ALL classes, students, and layouts from this browser. Are you sure?')) {
                clearAllData();
              }
            }}
          >
            🗑️ Clear All Data
          </button>
        )}
        <button
          className="btn btn--ghost btn--sm btn--full"
          onClick={() => setShowSettings(s => !s)}
        >
          ⚙️ {showSettings ? 'Hide' : 'Display'} Settings
        </button>
      </div>
    </aside>
  );
}
