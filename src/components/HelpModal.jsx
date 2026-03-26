import React, { useState } from 'react';

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: (
      <>
        <p>Welcome to <strong>Seating Chart 5000</strong>! Here's how to set up your first seating chart in a few minutes:</p>
        <ol>
          <li><strong>Create a class</strong> — click the <code>+</code> button next to "Classes" in the left panel. Rename it by clicking ✏️.</li>
          <li><strong>Set up your room</strong> — switch to <strong>Edit Layout</strong> mode (top bar), then click <strong>📐 Templates</strong> to choose a desk arrangement. Pick rows &amp; columns, or clusters.</li>
          <li><strong>Add students</strong> — switch back to <strong>Assign Students</strong> mode. Type names one by one, or use <strong>+ Bulk add</strong> to paste a whole list (one name per line).</li>
          <li><strong>Assign seats</strong> — drag students from the roster onto desks, or hit <strong>🎲 Randomize All</strong> for a quick shuffle.</li>
          <li><strong>Done!</strong> — export as an image with <strong>📷 Export PNG</strong> to print or project on screen.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'layout',
    title: 'Room Layout',
    content: (
      <>
        <h4>Templates</h4>
        <p>Use <strong>📐 Templates</strong> in the sidebar to quickly set up desks in rows &amp; columns, or in clusters/groups. Groups of 7 or more desks are arranged in a circle automatically.</p>
        <p className="help-warning">⚠️ Applying a template replaces all existing desks for the current class.</p>

        <h4>Manual Editing</h4>
        <ul>
          <li>Switch to <strong>Edit Layout</strong> mode in the top bar</li>
          <li><strong>Double-click</strong> on the canvas to add a desk</li>
          <li><strong>Drag</strong> any desk to reposition it</li>
          <li><strong>Click</strong> a desk to select it, then press <strong>Delete</strong> or <strong>Backspace</strong> to remove it</li>
          <li>Use <strong>+ Board</strong> or <strong>+ Teacher Desk</strong> to add room furniture</li>
        </ul>

        <h4>Clusters</h4>
        <p>Desks can be grouped into clusters. When a desk is selected in Edit Layout mode, use the <strong>Cluster group</strong> dropdown to assign it to a cluster. Clusters are shown with colour-coded stripes.</p>
      </>
    ),
  },
  {
    id: 'students',
    title: 'Students & Seating',
    content: (
      <>
        <h4>Adding Students</h4>
        <ul>
          <li>Type a name and press <strong>Enter</strong> or click <strong>Add</strong></li>
          <li>For a whole class at once: click <strong>+ Bulk add (paste list)</strong>, paste names (one per line), then click <strong>Add Names</strong></li>
        </ul>

        <h4>Assigning Seats</h4>
        <ul>
          <li><strong>Drag</strong> a student name from the sidebar onto a desk</li>
          <li><strong>Double-click</strong> an occupied desk to unassign that student</li>
          <li><strong>🎲 Randomize All</strong> — shuffles everyone randomly</li>
          <li><strong>🎲 Fill Empty Seats</strong> — only assigns students that don't have a seat yet, keeping manual placements</li>
          <li><strong>Clear Assignments</strong> — removes all seat assignments (desks stay)</li>
        </ul>
      </>
    ),
  },
  {
    id: 'relationships',
    title: 'Relationships',
    content: (
      <>
        <p>Use the <strong>Relationships</strong> tab (in the sidebar) to mark which students should or shouldn't sit together.</p>
        <ul>
          <li>Select a student, choose <strong>Can't sit with</strong> or <strong>Works well with</strong>, then select up to 3 other students at once</li>
          <li>When students with a relationship are in the <strong>same cluster</strong>, their desks highlight:
            <ul>
              <li>🔴 <strong>Red</strong> — "can't sit with" students in the same cluster</li>
              <li>🟢 <strong>Green</strong> — "works well with" students in the same cluster</li>
              <li>🟠 <strong>Orange</strong> — "can't sit with" students in adjacent seats of neighbouring clusters</li>
            </ul>
          </li>
        </ul>
        <p>The highlights help you see problems at a glance when using <strong>Randomize</strong> or rearranging students manually.</p>
      </>
    ),
  },
  {
    id: 'saving',
    title: 'Saving & Loading',
    content: (
      <>
        <h4>Automatic Save</h4>
        <p>Your work is <strong>automatically saved</strong> in your browser. You can close the tab and come back later — everything will still be there.</p>

        <h4>Saving to a File</h4>
        <ul>
          <li>Click <strong>💾 Save Class</strong> in the top bar to download the current class as a file</li>
          <li>You can also click the 💾 icon next to any class name in the sidebar</li>
          <li>The file is saved as <code>.class.json</code> — keep it safe as a backup or to share a layout</li>
        </ul>

        <h4>Loading from a File</h4>
        <ul>
          <li>Click <strong>📂 Load Class</strong> in the top bar to import a previously saved class file</li>
          <li>If a class with the same name already exists, you'll be asked whether to overwrite it</li>
        </ul>

        <h4>CSV Import (Bulk Setup)</h4>
        <p>Have lots of classes and students? Use <strong>📄 CSV Import</strong> in the top bar to upload everything at once from a spreadsheet.</p>
        <ol>
          <li>Click <strong>📄 CSV Import</strong>, then <strong>📥 Download Template</strong> to get a blank CSV file</li>
          <li>Open the template in Excel, Google Sheets, or any spreadsheet program</li>
          <li>Fill in the columns: <strong>Class</strong>, <strong>Student Name</strong>, and optionally up to 5 "Prefer" and 5 "Avoid" names per student</li>
          <li>Save as CSV and upload it — all your classes, students, and relationships will be created</li>
        </ol>
        <p>If a class already exists, you can choose to <strong>merge</strong> (add new students) or <strong>overwrite</strong> (replace entirely).</p>

        <h4>Exporting an Image</h4>
        <p>Click <strong>📷 Export PNG</strong> to save the seating chart as an image. Great for printing or displaying on a projector.</p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    content: (
      <>
        <p><strong>Your data never leaves your computer.</strong></p>
        <ul>
          <li>Student names are stored <strong>only in your browser</strong> — they are never sent to any server</li>
          <li>No accounts, no login, no tracking, no analytics</li>
          <li>Saved files stay on your own device</li>
          <li>Exported images only contain what's visible on the canvas</li>
          <li>Each colleague who opens this page has their <strong>own separate data</strong> — nobody can see each other's classes</li>
        </ul>
        <p className="help-warning">⚠️ If you clear your browser data or use a different browser/device, your auto-saved data won't be there. Use <strong>💾 Save Class</strong> to keep a backup file.</p>
      </>
    ),
  },
  {
    id: 'tips',
    title: 'Tips & Tricks',
    content: (
      <>
        <ul>
          <li><strong>Multiple classes</strong> — create separate classes for each period or group. Each has its own layout, roster, and relationships.</li>
          <li><strong>Snap to grid</strong> — enable it in Display Settings (⚙️) for neat alignment when dragging desks.</li>
          <li><strong>Dark mode</strong> — toggle in Display Settings if you prefer a darker look.</li>
          <li><strong>Name style</strong> — switch between full names, initials, or seat numbers in Display Settings. Initials work well when projecting on a big screen.</li>
          <li><strong>Font size</strong> — adjust the slider in Display Settings to make names bigger or smaller.</li>
          <li><strong>Colour-code desks</strong> — in Edit Layout mode, select a desk to assign it a colour for visual grouping.</li>
          <li><strong>Keyboard shortcuts</strong> — select a desk and press <strong>Delete</strong> to remove it quickly.</li>
        </ul>
      </>
    ),
  },
];

export default function HelpModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('getting-started');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal help-modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Help & Instructions</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="help-layout">
          <nav className="help-nav">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                className={`help-nav__item ${activeSection === section.id ? 'help-nav__item--active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </nav>

          <div className="help-content">
            {SECTIONS.find(s => s.id === activeSection)?.content}
          </div>
        </div>
      </div>
    </div>
  );
}
