/**
 * Serialise app state to a JSON file and trigger a download.
 * Layout is now stored inside each class object (version 2+).
 * No data is sent anywhere — this is a pure client-side download.
 */
export function saveToJson(state, markClean) {
  const payload = {
    version: 2,
    savedAt: new Date().toISOString(),
    classes: state.classes,      // each class contains its own layout
    activeClassId: state.activeClassId,
    settings: state.settings,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'seating-chart.json';
  link.click();
  URL.revokeObjectURL(url);

  if (markClean) markClean();
}

/**
 * Save a single class to a .class.json file.
 * The file can later be imported into any seating chart session.
 * No data is sent anywhere — pure client-side download.
 */
export function saveClassToJson(classObj) {
  const payload = {
    version: 2,
    type: 'seating-chart-class',
    savedAt: new Date().toISOString(),
    class: classObj,
  };
  const safeName = classObj.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.class.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker and load a single class from a .class.json file.
 * Also accepts full seating-chart files — imports the active (or first) class from them.
 * Returns a Promise that resolves with the raw class object, or rejects on error.
 */
export function loadClassFromJson() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error('No file selected'));

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);

          // Single-class file (saved with saveClassToJson)
          if (data.type === 'seating-chart-class' && data.class) {
            resolve(data.class);
            return;
          }
          // Full state file — pull out the active class (or first)
          if (data.classes && Array.isArray(data.classes) && data.classes.length > 0) {
            const cls =
              data.classes.find(c => c.id === data.activeClassId) ?? data.classes[0];
            resolve(cls);
            return;
          }
          throw new Error('Not a valid class or seating chart file.');
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}

/**
 * Open a file picker and load state from a JSON file.
 * Returns a Promise that resolves with the loaded state object, or rejects on error.
 */
export function loadFromJson() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error('No file selected'));

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.classes || !Array.isArray(data.classes)) {
            throw new Error('Invalid seating chart file.');
          }
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}
