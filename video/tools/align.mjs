// Section timing for one-take episodes: where each section starts in the spoken take.
const tokens = (text) => text.toLowerCase().match(/[\p{L}\p{N}'’]+/gu) || [];

// With word timings (HeyGen Voice): walk the words in order and match each section's first words.
export function sectionStarts(sections, words) {
  const spoken = words.map((w) => tokens(w.text).join(''));
  const starts = [];
  let i = 0;
  for (const s of sections) {
    starts.push(words[Math.min(i, words.length - 1)]?.start_time ?? 0);
    i += tokens(s.text).length; // advance past this section's words
    // Re-sync: snap to where the next section's first three words appear nearby (not just one common word).
    const next = sections[starts.length]?.text;
    if (next) {
      const head = tokens(next).slice(0, 3);
      const at = (k) => head.every((t, j) => spoken[k + j] === t);
      for (const d of [0, -1, 1, -2, 2, -3, 3]) if (at(i + d)) { i += d; break; }
    }
  }
  return starts.map((t, k) => (k === 0 ? 0 : Math.max(0, t - 0.15)));
}

// Without timings (scratch voice): spread sections by word count across the duration.
export function estimatedStarts(sections, duration) {
  const counts = sections.map((s) => tokens(s.text).length);
  const total = counts.reduce((a, b) => a + b, 0);
  let acc = 0;
  return counts.map((c) => { const t = (acc / total) * duration; acc += c; return t; });
}

export const fullText = (sections) => sections.map((s) => s.text).join(' ');
