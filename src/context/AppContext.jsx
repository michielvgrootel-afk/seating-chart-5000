import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ─── localStorage key ────────────────────────────────────────────────────────
const STORAGE_KEY = 'seating-chart-5000';

// ─── Initial State ────────────────────────────────────────────────────────────
const firstClassId = uuidv4();

// Each class now carries its own layout: { desks, roomElements }
const FRESH_STATE = {
  classes: [
    {
      id: firstClassId,
      name: 'Class 1',
      students: [],
      assignments: {},
      layout: { desks: [], roomElements: [] },
      relationships: [],
    },
  ],
  activeClassId: firstClassId,
  settings: {
    labelStyle: 'name',   // 'name' | 'initials' | 'number'
    fontSize: 13,
    darkMode: false,
    snapToGrid: true,
    gridSize: 20,
  },
  ui: {
    mode: 'assign',           // 'layout' | 'assign'
    selectedDeskId: null,
    showTemplateModal: false,
    showSettings: false,
    dragOverDeskId: null,
  },
};

/** Try to restore state from localStorage; fall back to FRESH_STATE. */
function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return FRESH_STATE;
    const saved = JSON.parse(raw);
    if (!saved.classes || !Array.isArray(saved.classes) || saved.classes.length === 0) {
      return FRESH_STATE;
    }
    // Ensure every class has a layout (guards against older saved data)
    const classes = saved.classes.map(c => ({
      ...c,
      layout: c.layout ?? { desks: [], roomElements: [] },
    }));
    return {
      ...FRESH_STATE,
      ...saved,
      classes,
      ui: FRESH_STATE.ui, // never restore transient UI state
    };
  } catch {
    return FRESH_STATE;
  }
}

const INITIAL_STATE = loadInitialState();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function snap(value, grid, enabled) {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

/** Return a new state with the active class's layout patched. */
function patchActiveLayout(state, layoutPatch) {
  return {
    ...state,
    classes: state.classes.map(c =>
      c.id === state.activeClassId
        ? { ...c, layout: { ...c.layout, ...layoutPatch } }
        : c
    ),
  };
}

/** Return the active class object (or null). */
function getActive(state) {
  return state.classes.find(c => c.id === state.activeClassId) ?? null;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    // ── Classes ──
    case 'ADD_CLASS': {
      const id = uuidv4();
      return {
        ...state,
        classes: [
          ...state.classes,
          {
            id,
            name: action.name || 'New Class',
            students: [],
            assignments: {},
            layout: { desks: [], roomElements: [] },
            relationships: [],
          },
        ],
        activeClassId: id,
      };
    }
    case 'RENAME_CLASS':
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      };
    case 'DELETE_CLASS': {
      const remaining = state.classes.filter(c => c.id !== action.id);
      if (remaining.length === 0) return state; // keep at least one
      return {
        ...state,
        classes: remaining,
        activeClassId:
          state.activeClassId === action.id ? remaining[0].id : state.activeClassId,
      };
    }
    case 'SET_ACTIVE_CLASS':
      return {
        ...state,
        activeClassId: action.id,
        ui: { ...state.ui, selectedDeskId: null }, // clear selection on switch
      };

    // ── Students ──
    case 'ADD_STUDENT': {
      const student = { id: uuidv4(), name: action.name.trim() };
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? { ...c, students: [...c.students, student] }
            : c
        ),
      };
    }
    case 'REMOVE_STUDENT':
      return {
        ...state,
        classes: state.classes.map(c => {
          if (c.id !== state.activeClassId) return c;
          const students = c.students.filter(s => s.id !== action.studentId);
          const assignments = { ...c.assignments };
          Object.keys(assignments).forEach(deskId => {
            if (assignments[deskId] === action.studentId) delete assignments[deskId];
          });
          return { ...c, students, assignments };
        }),
      };
    case 'BULK_ADD_STUDENTS': {
      const names = action.names
        .split('\n')
        .map(n => n.trim())
        .filter(Boolean);
      const newStudents = names.map(name => ({ id: uuidv4(), name }));
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? { ...c, students: [...c.students, ...newStudents] }
            : c
        ),
      };
    }
    case 'RENAME_STUDENT':
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? {
                ...c,
                students: c.students.map(s =>
                  s.id === action.studentId ? { ...s, name: action.name } : s
                ),
              }
            : c
        ),
      };

    // ── Layout – Desks ──
    case 'ADD_DESK': {
      const active = getActive(state);
      if (!active) return state;
      const desk = {
        id: uuidv4(),
        x: snap(action.x ?? 100, state.settings.gridSize, state.settings.snapToGrid),
        y: snap(action.y ?? 100, state.settings.gridSize, state.settings.snapToGrid),
        label: '',
        color: null,
        clusterId: null,
      };
      return patchActiveLayout(state, {
        desks: [...active.layout.desks, desk],
      });
    }
    case 'MOVE_DESK': {
      const active = getActive(state);
      if (!active) return state;
      return patchActiveLayout(state, {
        desks: active.layout.desks.map(d =>
          d.id === action.id
            ? {
                ...d,
                x: snap(action.x, state.settings.gridSize, state.settings.snapToGrid),
                y: snap(action.y, state.settings.gridSize, state.settings.snapToGrid),
              }
            : d
        ),
      });
    }
    case 'DELETE_DESK': {
      const active = getActive(state);
      if (!active) return state;
      const assignments = { ...active.assignments };
      delete assignments[action.id];
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? {
                ...c,
                layout: {
                  ...c.layout,
                  desks: c.layout.desks.filter(d => d.id !== action.id),
                },
                assignments,
              }
            : c
        ),
        ui: {
          ...state.ui,
          selectedDeskId:
            state.ui.selectedDeskId === action.id ? null : state.ui.selectedDeskId,
        },
      };
    }
    case 'SET_DESK_COLOR': {
      const active = getActive(state);
      if (!active) return state;
      return patchActiveLayout(state, {
        desks: active.layout.desks.map(d =>
          d.id === action.id ? { ...d, color: action.color } : d
        ),
      });
    }
    case 'SET_DESK_LABEL': {
      const active = getActive(state);
      if (!active) return state;
      return patchActiveLayout(state, {
        desks: active.layout.desks.map(d =>
          d.id === action.id ? { ...d, label: action.label } : d
        ),
      });
    }

    case 'SET_DESK_CLUSTER': {
      const active = getActive(state);
      if (!active) return state;
      return patchActiveLayout(state, {
        desks: active.layout.desks.map(d =>
          d.id === action.id ? { ...d, clusterId: action.clusterId } : d
        ),
      });
    }

    // ── Layout – Room Elements ──
    case 'ADD_ROOM_ELEMENT': {
      const active = getActive(state);
      if (!active) return state;
      const el = {
        id: uuidv4(),
        type: action.elementType,
        x: snap(action.x ?? 50, state.settings.gridSize, state.settings.snapToGrid),
        y: snap(action.y ?? 50, state.settings.gridSize, state.settings.snapToGrid),
        w: action.elementType === 'board' ? 300 : 120,
        h: action.elementType === 'board' ? 40 : 60,
        label: action.elementType === 'board' ? 'Board' : 'Teacher',
      };
      return patchActiveLayout(state, {
        roomElements: [...active.layout.roomElements, el],
      });
    }
    case 'MOVE_ROOM_ELEMENT': {
      const active = getActive(state);
      if (!active) return state;
      return patchActiveLayout(state, {
        roomElements: active.layout.roomElements.map(el =>
          el.id === action.id
            ? {
                ...el,
                x: snap(action.x, state.settings.gridSize, state.settings.snapToGrid),
                y: snap(action.y, state.settings.gridSize, state.settings.snapToGrid),
              }
            : el
        ),
      });
    }
    case 'DELETE_ROOM_ELEMENT': {
      const active = getActive(state);
      if (!active) return state;
      return patchActiveLayout(state, {
        roomElements: active.layout.roomElements.filter(el => el.id !== action.id),
      });
    }

    // ── Assignments ──
    case 'ASSIGN_STUDENT':
      return {
        ...state,
        classes: state.classes.map(c => {
          if (c.id !== state.activeClassId) return c;
          const assignments = { ...c.assignments };
          Object.keys(assignments).forEach(deskId => {
            if (assignments[deskId] === action.studentId) delete assignments[deskId];
          });
          if (action.deskId) assignments[action.deskId] = action.studentId;
          return { ...c, assignments };
        }),
      };
    case 'UNASSIGN_DESK':
      return {
        ...state,
        classes: state.classes.map(c => {
          if (c.id !== state.activeClassId) return c;
          const assignments = { ...c.assignments };
          delete assignments[action.deskId];
          return { ...c, assignments };
        }),
      };
    case 'RANDOMIZE_SEATS': {
      const active = getActive(state);
      if (!active) return state;

      const desks = active.layout.desks;
      const students = [...active.students];
      const existingAssignments = action.preserveManual ? { ...active.assignments } : {};

      const assignedStudentIds = new Set(Object.values(existingAssignments));
      const emptyDeskIds = desks.map(d => d.id).filter(id => !existingAssignments[id]);
      const unassignedStudents = students.filter(s => !assignedStudentIds.has(s.id));

      // Fisher-Yates shuffle
      const shuffled = [...unassignedStudents];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const shuffledDesks = [...emptyDeskIds];
      for (let i = shuffledDesks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDesks[i], shuffledDesks[j]] = [shuffledDesks[j], shuffledDesks[i]];
      }

      const newAssignments = { ...existingAssignments };
      shuffled.slice(0, shuffledDesks.length).forEach((student, i) => {
        newAssignments[shuffledDesks[i]] = student.id;
      });

      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId ? { ...c, assignments: newAssignments } : c
        ),
      };
    }
    case 'CLEAR_ASSIGNMENTS':
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId ? { ...c, assignments: {} } : c
        ),
      };

    // ── Templates ──
    case 'APPLY_TEMPLATE': {
      let newDesks = [];
      const { templateType, config } = action;

      if (templateType === 'grid') {
        const {
          rows, cols,
          deskW = 80, deskH = 60,
          gapX = 30, gapY = 30,
          startX = 60, startY = 90,
        } = config;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            newDesks.push({
              id: uuidv4(),
              x: startX + c * (deskW + gapX),
              y: startY + r * (deskH + gapY),
              label: `${r + 1}-${c + 1}`,
              color: null,
              clusterId: null, // grids have no auto-clustering
            });
          }
        }
      } else if (templateType === 'clusters') {
        const {
          numGroups = 4,
          desksPerGroup = 4,
          gapX = 60,
          gapY = 60,
          startX = 60,
          startY = 90,
        } = config;

        const useCircle = desksPerGroup >= 7;

        // ── Calculate cluster bounding box so we can space them ──
        let clusterW, clusterH;
        if (useCircle) {
          // Circle radius scales with desk count; desk is 80×58
          const deskW = 80, deskH = 58;
          const spacing = Math.max(deskW, deskH) + 15; // gap between desk centers on the ring
          const circumference = desksPerGroup * spacing;
          const rx = circumference / (2 * Math.PI) + deskW / 2;
          const ry = circumference / (2 * Math.PI) + deskH / 2;
          clusterW = Math.ceil(rx * 2 + deskW);
          clusterH = Math.ceil(ry * 2 + deskH);
        } else {
          const perRow = Math.ceil(Math.sqrt(desksPerGroup));
          const perCol = Math.ceil(desksPerGroup / perRow);
          clusterW = perRow * 85;
          clusterH = perCol * 65;
        }

        const clustersPerRow = Math.ceil(Math.sqrt(numGroups));
        for (let g = 0; g < numGroups; g++) {
          const clusterId = uuidv4();
          const col = g % clustersPerRow;
          const row = Math.floor(g / clustersPerRow);
          const baseX = startX + col * (clusterW + gapX);
          const baseY = startY + row * (clusterH + gapY);

          if (useCircle) {
            // ── Oval ring layout ──
            const deskW = 80, deskH = 58;
            const spacing = Math.max(deskW, deskH) + 15;
            const circumference = desksPerGroup * spacing;
            const rx = circumference / (2 * Math.PI);
            const ry = circumference / (2 * Math.PI) * 0.85; // slightly oval (wider)
            const cx = clusterW / 2 - deskW / 2;
            const cy = clusterH / 2 - deskH / 2;

            for (let d = 0; d < desksPerGroup; d++) {
              // Start from the top and go clockwise
              const angle = -Math.PI / 2 + (2 * Math.PI * d) / desksPerGroup;
              newDesks.push({
                id: uuidv4(),
                x: Math.round(baseX + cx + rx * Math.cos(angle)),
                y: Math.round(baseY + cy + ry * Math.sin(angle)),
                label: '',
                color: null,
                clusterId,
              });
            }
          } else {
            // ── Grid layout (under 7 desks) ──
            const perRow = Math.ceil(Math.sqrt(desksPerGroup));
            for (let d = 0; d < desksPerGroup; d++) {
              newDesks.push({
                id: uuidv4(),
                x: baseX + (d % perRow) * 85,
                y: baseY + Math.floor(d / perRow) * 65,
                label: '',
                color: null,
                clusterId,
              });
            }
          }
        }
      }

      // Only the active class's layout + assignments are reset
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? {
                ...c,
                layout: { desks: newDesks, roomElements: [] },
                assignments: {},
              }
            : c   // ← every other class is untouched
        ),
        ui: { ...state.ui, showTemplateModal: false },
      };
    }

    // ── Relationships ──
    case 'ADD_RELATIONSHIP': {
      const rel = {
        id: uuidv4(),
        studentA: action.studentA,
        studentB: action.studentB,
        type: action.relType, // 'avoid' | 'prefer'
      };
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? { ...c, relationships: [...(c.relationships ?? []), rel] }
            : c
        ),
      };
    }
    case 'REMOVE_RELATIONSHIP':
      return {
        ...state,
        classes: state.classes.map(c =>
          c.id === state.activeClassId
            ? { ...c, relationships: (c.relationships ?? []).filter(r => r.id !== action.id) }
            : c
        ),
      };

    // ── Import from CSV (multiple classes with students + relationships) ──
    case 'IMPORT_CSV': {
      // action.classes: [{ name, students: string[], relationships: [{ studentA, studentB, type }] }]
      // action.mode: 'merge' | 'overwrite' — per-class: merge adds to existing, overwrite replaces
      const mode = action.mode ?? 'merge';
      let updatedClasses = [...state.classes];
      let lastNewId = state.activeClassId;

      for (const incoming of action.classes) {
        const existingIdx = updatedClasses.findIndex(
          c => c.name.toLowerCase() === incoming.name.toLowerCase()
        );

        if (existingIdx >= 0 && mode === 'merge') {
          // Merge into existing class: add new students, skip duplicates
          const existing = updatedClasses[existingIdx];
          const existingNames = new Set(existing.students.map(s => s.name.toLowerCase()));
          const newStudents = incoming.students
            .filter(name => !existingNames.has(name.toLowerCase()))
            .map(name => ({ id: uuidv4(), name }));
          const allStudents = [...existing.students, ...newStudents];

          // Build name → id lookup for relationships
          const nameToId = {};
          for (const s of allStudents) {
            nameToId[s.name.toLowerCase()] = s.id;
          }

          // Add relationships, skip duplicates
          const existingRels = existing.relationships ?? [];
          const relSet = new Set(
            existingRels.map(r => [r.studentA, r.studentB].sort().join('|||') + '::' + r.type)
          );
          const newRels = [];
          for (const rel of incoming.relationships) {
            const idA = nameToId[rel.studentA.toLowerCase()];
            const idB = nameToId[rel.studentB.toLowerCase()];
            if (!idA || !idB) continue;
            const key = [idA, idB].sort().join('|||') + '::' + rel.type;
            if (relSet.has(key)) continue;
            relSet.add(key);
            newRels.push({ id: uuidv4(), studentA: idA, studentB: idB, type: rel.type });
          }

          updatedClasses[existingIdx] = {
            ...existing,
            students: allStudents,
            relationships: [...existingRels, ...newRels],
          };
          lastNewId = existing.id;
        } else {
          // Create new class (or overwrite)
          const classId = existingIdx >= 0 ? updatedClasses[existingIdx].id : uuidv4();
          const students = incoming.students.map(name => ({ id: uuidv4(), name }));

          // Build name → id lookup
          const nameToId = {};
          for (const s of students) {
            nameToId[s.name.toLowerCase()] = s.id;
          }

          const relationships = [];
          const relSet = new Set();
          for (const rel of incoming.relationships) {
            const idA = nameToId[rel.studentA.toLowerCase()];
            const idB = nameToId[rel.studentB.toLowerCase()];
            if (!idA || !idB) continue;
            const key = [idA, idB].sort().join('|||') + '::' + rel.type;
            if (relSet.has(key)) continue;
            relSet.add(key);
            relationships.push({ id: uuidv4(), studentA: idA, studentB: idB, type: rel.type });
          }

          const newClass = {
            id: classId,
            name: incoming.name,
            students,
            assignments: {},
            layout: { desks: [], roomElements: [] },
            relationships,
          };

          if (existingIdx >= 0) {
            updatedClasses[existingIdx] = newClass;
          } else {
            updatedClasses.push(newClass);
          }
          lastNewId = classId;
        }
      }

      return {
        ...state,
        classes: updatedClasses,
        activeClassId: lastNewId,
      };
    }

    // ── Import a single class ──
    case 'IMPORT_CLASS': {
      const incoming = {
        ...action.classData,
        // Always ensure layout exists
        layout: action.classData.layout ?? { desks: [], roomElements: [] },
      };

      if (action.replaceId) {
        // Overwrite the existing class that had the same name, preserving its ID
        const updated = state.classes.map(c =>
          c.id === action.replaceId ? { ...incoming, id: action.replaceId } : c
        );
        return { ...state, classes: updated, activeClassId: action.replaceId };
      } else {
        // Add as a brand-new class with a fresh ID (avoids any ID collisions)
        const newId = uuidv4();
        const newClass = { ...incoming, id: newId };
        return {
          ...state,
          classes: [...state.classes, newClass],
          activeClassId: newId,
        };
      }
    }

    // ── Settings ──
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    // ── UI ──
    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.ui } };

    // ── Persistence ──
    case 'LOAD_STATE': {
      const loaded = action.state;

      // ── Backward-compatibility migration ──────────────────────────────
      // Old format had a top-level `layout`; new format keeps layout per class.
      // If the loaded file is old, copy the shared layout into every class.
      let classes = loaded.classes ?? INITIAL_STATE.classes;
      if (loaded.layout && classes.length > 0 && !classes[0].layout) {
        classes = classes.map(c => ({
          ...c,
          layout: loaded.layout,
        }));
      }
      // Ensure every class has a layout field (guards against partial saves)
      classes = classes.map(c => ({
        ...c,
        layout: c.layout ?? { desks: [], roomElements: [] },
      }));

      return {
        ...FRESH_STATE,
        ...loaded,
        classes,
        ui: FRESH_STATE.ui, // never restore UI state
      };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const saveTimerRef = useRef(null);

  // ── Auto-save to localStorage (debounced 500ms) ──
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const toSave = {
          classes: state.classes,
          activeClassId: state.activeClassId,
          settings: state.settings,
          // ui is intentionally excluded — transient
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // localStorage full or unavailable — silently ignore
      }
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [state.classes, state.activeClassId, state.settings]);

  // ── Apply dark mode to document ──
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      state.settings.darkMode ? 'dark' : 'light'
    );
  }, [state.settings.darkMode]);

  const clearAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    // Reset to a completely fresh state
    dispatch({ type: 'LOAD_STATE', state: FRESH_STATE });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, clearAllData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ── Selectors ─────────────────────────────────────────────────────────────────
export function useActiveClass() {
  const { state } = useApp();
  return state.classes.find(c => c.id === state.activeClassId) ?? null;
}

/** Returns the active class's layout (desks + roomElements). */
export function useActiveLayout() {
  const activeClass = useActiveClass();
  return activeClass?.layout ?? { desks: [], roomElements: [] };
}

export function useAssignedStudentId(deskId) {
  const activeClass = useActiveClass();
  return activeClass?.assignments[deskId] ?? null;
}

/**
 * Cluster-aware relationship highlights.
 *
 * Returns a map of deskId → 'avoid' | 'prefer' | 'warning' where:
 *   avoid   = students with an "avoid" relationship are in the SAME cluster
 *   prefer  = students with a "prefer" relationship are in the SAME cluster
 *   warning = students with an "avoid" relationship are in DIFFERENT clusters
 *             but their specific desks are directly adjacent (facing each other)
 *
 * For desks without a cluster (clusterId === null) we fall back to distance-based
 * adjacency so the feature still works without explicit clustering.
 */
const ADJACENT_DISTANCE = 160; // two desks are "adjacent" if their centers are within this

export function useRelationshipHighlights() {
  const activeClass = useActiveClass();
  const layout = useActiveLayout();
  if (!activeClass) return {};

  const { assignments, relationships = [] } = activeClass;
  const { desks } = layout;
  if (relationships.length === 0) return {};

  // Build maps
  const studentToDesk = {};
  for (const [deskId, studentId] of Object.entries(assignments)) {
    studentToDesk[studentId] = deskId;
  }

  const deskById = {};
  for (const d of desks) {
    deskById[d.id] = d;
  }

  /** Distance between the centers of two desks (80×58). */
  function deskDist(a, b) {
    return Math.sqrt((a.x + 40 - b.x - 40) ** 2 + (a.y + 29 - b.y - 29) ** 2);
  }

  // Priority: avoid > warning > prefer
  const highlights = {};

  function markDesk(deskId, level) {
    const priority = { avoid: 3, warning: 2, prefer: 1 };
    const current = highlights[deskId];
    if (!current || priority[level] > priority[current]) {
      highlights[deskId] = level;
    }
  }

  for (const rel of relationships) {
    const deskAId = studentToDesk[rel.studentA];
    const deskBId = studentToDesk[rel.studentB];
    if (!deskAId || !deskBId || deskAId === deskBId) continue;

    const deskA = deskById[deskAId];
    const deskB = deskById[deskBId];
    if (!deskA || !deskB) continue;

    const clusterA = deskA.clusterId ?? null;
    const clusterB = deskB.clusterId ?? null;
    const dist = deskDist(deskA, deskB);

    // ── Same cluster ──
    if (clusterA && clusterB && clusterA === clusterB) {
      markDesk(deskAId, rel.type === 'avoid' ? 'avoid' : 'prefer');
      markDesk(deskBId, rel.type === 'avoid' ? 'avoid' : 'prefer');
    }
    // ── Both unclustered: fall back to direct adjacency ──
    else if (!clusterA && !clusterB) {
      if (dist <= ADJACENT_DISTANCE) {
        markDesk(deskAId, rel.type === 'avoid' ? 'avoid' : 'prefer');
        markDesk(deskBId, rel.type === 'avoid' ? 'avoid' : 'prefer');
      }
    }
    // ── Different clusters (or one clustered + one not):
    //    only warn if the two SPECIFIC desks are directly adjacent ──
    else if (rel.type === 'avoid' && dist <= ADJACENT_DISTANCE) {
      markDesk(deskAId, 'warning');
      markDesk(deskBId, 'warning');
    }
  }

  return highlights;
}

/** Returns all unique cluster IDs in the active layout. */
export function useClusterIds() {
  const layout = useActiveLayout();
  const ids = new Set();
  for (const d of layout.desks) {
    if (d.clusterId) ids.add(d.clusterId);
  }
  return [...ids];
}
