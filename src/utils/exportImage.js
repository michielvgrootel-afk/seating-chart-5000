import html2canvas from 'html2canvas';

/**
 * Captures the canvas element as a PNG and triggers a browser download.
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - The filename without extension
 */
export async function exportAsPng(element, filename = 'seating-chart') {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--canvas-bg').trim() || '#f5f5f5',
      scale: 2, // 2× for sharper output
      useCORS: false,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Export failed:', err);
    alert('Export failed. Please try again.');
  }
}
