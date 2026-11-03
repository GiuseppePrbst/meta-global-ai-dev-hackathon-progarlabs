// Pure helpers for the SAM showcase viewer (browser and Node tests). No network.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShowcaseCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Same palette as showcase.py; purple is the ProGarLabs accent.
  const PALETTE = [[52, 211, 153], [168, 85, 247], [34, 211, 238], [251, 146, 60],
    [244, 114, 182], [250, 204, 21], [96, 165, 250], [163, 230, 53]];

  // Stable colour per provider object ID inside one run: sorted IDs -> palette index.
  function colorMap(frames) {
    const ids = [...new Set(frames.flatMap(f => f.objects.map(o => String(o.id))))].sort();
    return Object.fromEntries(ids.map((id, i) => [id, PALETTE[i % PALETTE.length]]));
  }

  // Inference frame shown at playback time t: nearest earlier inferred frame, never
  // an interpolation. Frames without masks stay empty (they are real results).
  function frameAt(t, fps, count) {
    if (!(count > 0) || !(fps > 0) || !(t >= 0)) return 0;
    return Math.min(count - 1, Math.floor(t * fps + 1e-9));
  }

  // Label layers never merge: SAM segments; Muse proposes; the catalog states status.
  function labels(object, ordinal, concept, candidate) {
    const sam = `SAM · ${concept || 'objeto'} #${ordinal + 1}`;
    const muse = candidate ? `Muse (candidato): ${candidate.name}` : null;
    const status = candidate ? (candidate.status || 'experimental, no verificado') : null;
    return { sam, muse, status };
  }

  // Track summary from frames: visible frames, first/last and gaps per object.
  function tracks(frames) {
    const seen = {};
    frames.forEach((f, i) => f.objects.forEach(o => (seen[o.id] = seen[o.id] || []).push(i)));
    return Object.entries(seen).map(([id, idx]) => ({
      id, first: idx[0], last: idx[idx.length - 1], visible: idx.length,
      gaps: idx.slice(1).filter((v, k) => v - idx[k] > 1).length,
    }));
  }

  // Mask metrics against agent-reviewed references: always labelled with their status.
  function metricRows(m) {
    const fmt = v => (v == null ? '—' : typeof v === 'number' ? v.toFixed(3) : String(v));
    const rows = {
      'Referencia': `${m.reference_status} (${m.reference_complete ? 'completa' : 'parcial'})`,
      'Instancias acertadas': `${m.matched}/${m.reference_instances}`,
      'Omisiones': fmt(m.missed),
      'Falsos positivos': m.false_positives == null ? 'no medible (referencia parcial)' : fmt(m.false_positives),
      'IoU de máscara (media)': fmt(m.mean_mask_iou),
      'Dice (media)': fmt(m.mean_dice),
      'Boundary F1': fmt(m.boundary_f1),
    };
    return rows;
  }

  return { PALETTE, colorMap, frameAt, labels, tracks, metricRows };
});
