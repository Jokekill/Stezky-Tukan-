import { shuffleInPlace } from './rng.js';

// Vygeneruje kruhovou sekvenci 10 písmen (A..E, každé 2x) bez sousedních shod,
// a to i mezi posledním a prvním (wrap-around).
export function generateCityLayout(rnd) {
  const letters = ['A','A','B','B','C','C','D','D','E','E'];
  // backtracking s náhodným pořadím (pro rozumnou rozmanitost)
  const pool = shuffleInPlace([...letters], rnd);
  const out = [];

  function okToPlace(ch, pos) {
    const prev = (pos === 0) ? out[out.length-1] : out[pos-1];
    if (prev && prev === ch) return false;
    if (pos === 9) {
      // wrap-around constraint
      if (out[0] === ch) return false;
    }
    return true;
  }

  function bt(pos, bag) {
    if (pos === 10) return true;
    // seřaď podle zbývajících kusů (heuristika)
    const options = [...new Set(bag)];
    shuffleInPlace(options, rnd);
    for (const ch of options) {
      if (!okToPlace(ch, pos)) continue;
      // použij jeden výskyt ch
      const idx = bag.indexOf(ch);
      const nextBag = bag.slice(0, idx).concat(bag.slice(idx+1));
      out[pos] = ch;
      if (bt(pos+1, nextBag)) return true;
    }
    out[pos] = undefined;
    return false;
  }

  bt(0, pool);
  return out;
}

export function rotateLayout(layout, offset) {
  const o = ((offset % layout.length) + layout.length) % layout.length;
  return layout.slice(o).concat(layout.slice(0, o));
}

export function layoutToText(layout) {
  // "1:A 2:B 3:C ..." (pro snadné kopírování)
  return layout.map((L, i) => `${i+1}:${L}`).join(' ');
}

/* ✳️ Pozn.: pokud bys chtěl doslova „oficiální“ karty rozložení,
   můžeš sem přidat pole LAYOUT_CARDS = [ ['D','C','E','A',...], ... ]
   a v main.js přepnout zdroj sekvence. Pravidla uvádějí 13 karet
   rozložení. :contentReference[oaicite:5]{index=5} */
