// Pure coordinate transforms for the private viewer and its Node test. No DOM access.
// Pointer (CSS px) -> painted content box -> canvas backing pixels -> prepared media pixels.
// getBoundingClientRect already includes CSS scaling, zoom and transforms, so device
// pixel ratio never enters the mapping. Final integer conversion stays in the backend,
// which hands floats to the official meta_sam_parser builder rules (floor/ceil).
(function (root) {
  'use strict';
  const ZERO = { left: 0, top: 0, right: 0, bottom: 0 };

  // Painted area inside an element for object-fit: contain, after border+padding insets.
  function contentBox(rect, natural, insets = ZERO) {
    const inner = {
      left: rect.left + insets.left, top: rect.top + insets.top,
      width: rect.width - insets.left - insets.right,
      height: rect.height - insets.top - insets.bottom,
    };
    const scale = Math.min(inner.width / natural.width, inner.height / natural.height);
    const width = natural.width * scale, height = natural.height * scale;
    return {
      left: inner.left + (inner.width - width) / 2,
      top: inner.top + (inner.height - height) / 2,
      width, height,
    };
  }

  // Null outside the painted media (letterbox, padding): never clamp a stray click in.
  function clientToMedia(point, rect, natural, target, insets = ZERO) {
    const box = contentBox(rect, natural, insets);
    if (!(box.width > 0 && box.height > 0)) return null;
    const u = (point.x - box.left) / box.width, v = (point.y - box.top) / box.height;
    if (!(u >= 0 && u <= 1 && v >= 0 && v <= 1)) return null;
    return { x: u * target.width, y: v * target.height };
  }

  // Prepared-media pixels -> canvas backing pixels, for drawing prompts and polygons.
  function mediaToCanvas(point, natural, target) {
    return { x: point.x * natural.width / target.width, y: point.y * natural.height / target.height };
  }

  // Drag corners in any order -> [left, top, right, bottom] clamped to the media.
  // Boxes thinner than one prepared pixel are rejected (zero width/height).
  function normalizeBox(a, b, target) {
    const clamp = (value, max) => Math.min(max, Math.max(0, value));
    const left = clamp(Math.min(a.x, b.x), target.width), right = clamp(Math.max(a.x, b.x), target.width);
    const top = clamp(Math.min(a.y, b.y), target.height), bottom = clamp(Math.max(a.y, b.y), target.height);
    return right - left < 1 || bottom - top < 1 ? null : [left, top, right, bottom];
  }

  // Video frame i is shown by seeking to its middle, avoiding boundary rounding.
  function frameTime(index, fps) { return (index + 0.5) / fps; }

  const api = { contentBox, clientToMedia, mediaToCanvas, normalizeBox, frameTime };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LabGeometry = api;
})(typeof window !== 'undefined' ? window : globalThis);
