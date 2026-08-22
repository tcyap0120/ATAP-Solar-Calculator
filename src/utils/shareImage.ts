/**
 * Turning a DOM node into an image and getting it to a customer.
 *
 * Kept separate from any one page because "render it, then send it to WhatsApp" is the same job
 * everywhere: phones want a real file in the share sheet, desktops want it on the clipboard.
 */
import html2canvas from 'html2canvas';

/**
 * Render a FIXED-WIDTH element to a canvas.
 *
 * The element must not depend on viewport media queries — it is cloned offscreen and captured at
 * its own intrinsic size, with no windowWidth simulation. That is deliberate: simulating a window
 * width means html2canvas lays the clone out in an iframe of that width, and any size measured in
 * this document no longer matches what gets painted. A poster built at a fixed px width sidesteps
 * the whole problem, so the capture is identical on a phone and a desktop.
 */
export const captureFixedWidthElement = async (
  el: HTMLElement,
  backgroundColor = '#ffffff'
): Promise<HTMLCanvasElement> => {
  const clone = el.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0px',
    // The preview scales the poster down with a transform; the capture must not inherit that.
    transform: 'none',
    transformOrigin: 'top left',
    margin: '0',
    zIndex: '-1',
    pointerEvents: 'none',
  });

  document.body.appendChild(clone);

  // Let the browser lay the clone out and finish decoding any <img> inside it.
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  await Promise.all(
    Array.from(clone.querySelectorAll('img')).map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(res => {
            img.onload = () => res();
            img.onerror = () => res();
          })
    )
  );

  // Measured here, but the element is fixed-width with no media queries, so this is also its size
  // inside html2canvas's iframe.
  const w = clone.offsetWidth;
  const h = clone.offsetHeight;

  try {
    return await html2canvas(clone, {
      scale: 2,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 15000,
      // NO width/height. Those would override the bounds html2canvas measures inside its own
      // iframe, which is the only measurement guaranteed to match what gets painted.
      //
      // windowWidth/windowHeight only size that iframe. They are set from the element so the
      // viewport is always big enough to hold it — otherwise a phone would render this 1600px
      // poster into a 390px-wide iframe. Harmless here precisely because the poster has no
      // responsive rules for a different viewport width to change.
      windowWidth: w + 200,
      windowHeight: h + 200,
    });
  } finally {
    document.body.removeChild(clone);
  }
};

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), type, quality));

export const downloadCanvas = (canvas: HTMLCanvasElement, fileName: string) => {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
};

/** What actually happened, so the caller can show the right message. */
export type ShareOutcome = 'shared' | 'dismissed' | 'copied' | 'saved';

/**
 * Send a rendered canvas to WhatsApp (or whatever the OS offers), degrading in three steps:
 *   1. Phones: hand a real File to the share sheet, so it arrives in a chat as a photo.
 *   2. Desktop: copy the image — one Ctrl+V into WhatsApp Web sends it.
 *   3. Neither available: save the file so it can be attached by hand.
 */
export const shareCanvas = async (
  canvas: HTMLCanvasElement,
  opts: { fileName: string; title: string; text?: string }
): Promise<ShareOutcome> => {
  const nav = navigator as any;

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.95);
  if (jpeg && nav.share && nav.canShare) {
    const file = new File([jpeg], opts.fileName, { type: 'image/jpeg' });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: opts.title, text: opts.text });
        return 'shared';
      } catch (err: any) {
        // Dismissing the sheet is a completed interaction, not a failure to fall through from.
        if (err?.name === 'AbortError') return 'dismissed';
      }
    }
  }

  try {
    const png = await canvasToBlob(canvas, 'image/png');
    if (png && nav.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await nav.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      return 'copied';
    }
  } catch {
    // Clipboard blocked (permissions, insecure context) — fall through to saving.
  }

  downloadCanvas(canvas, opts.fileName);
  return 'saved';
};
