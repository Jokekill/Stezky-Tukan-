// ===== Zvláštní bonus – červené karty (ponecháno) =====
export function drawRedBonus(rnd) {
  const id = 1 + Math.floor(rnd() * 5); // 1..5
  return { id, name: `Zvláštní bonus #${id}`, image: `assets/bonus/red-${id}.svg` };
}

/** ===== Mapové bonusy =====
 *  Atrakce: 5 karet, každá za +6 bodů.
 *  Města: A–E; pro 2–4 hráče (tier1): A=3..E=7; pro 5–8 hráčů (tier2): A=2..E=5.
 *  Obrázky:
 *    - Atrakce: assets/bonus/Monument.png, Kniha.png, Tukan.png, Kočka.png, Drak.png
 *    - Města:   assets/bonus/harbor.png
 */

export const ATTRACTIONS = [
  { key:'Monument', title:'Monument', points:6, image:'assets/bonus/Monument.png' },
  { key:'Kniha',    title:'Kniha',    points:6, image:'assets/bonus/Kniha.png' },
  { key:'Tukan',    title:'Tukan',    points:6, image:'assets/bonus/Tukan.png' },
  { key:'Kočka',    title:'Kočka',    points:6, image:'assets/bonus/Kočka.png' },
  { key:'Drak',     title:'Drak',     points:6, image:'assets/bonus/Drak.png'  },
];

const CITY_LETTERS = ['A','B','C','D','E'];
const CITY_POINTS_TIER1 = { A:3, B:4, C:5, D:6, E:7 }; // 1. hráč
const CITY_POINTS_TIER2 = { A:2, B:3, C:4, D:5, E:5 }; // 2. hráč (pouze 5–8 hráčů)
const CITY_IMAGE = 'assets/bonus/harbor.png';

const STORAGE_NS = 'tucana.mapbonus';

function storageKey(seed){ return `${STORAGE_NS}:${seed}`; }
function loadState(seed) {
  try { return JSON.parse(localStorage.getItem(storageKey(seed)) || '{}'); } catch { return {}; }
}
function saveState(seed, obj) {
  try { localStorage.setItem(storageKey(seed), JSON.stringify(obj)); } catch {}
}
export function resetMapBonuses(seed) { saveState(seed, {}); }

/**
 * Vyrenderuje bonusové karty (Atrakce + Města) do containeru.
 * players: číslo 2–8; při >4 zobrazí i druhý tier u měst.
 */
export function renderMapBonuses(container, seed, players=4) {
  const state = loadState(seed);
  container.innerHTML = '';

  // Skupina: Atrakce
  container.appendChild(groupHead('Atrakce'));
  const g1 = document.createElement('div');
  g1.className = 'bonus-grid';
  container.appendChild(g1);

  ATTRACTIONS.forEach(b => {
    const card = makeBonusCard({
      key: `attr|${b.key}`,
      title: b.title,
      points: b.points,
      image: b.image,
      claimed: !!state[`attr|${b.key}`],
    });
    g1.appendChild(card);
    wireToggle(card, seed);
  });

  // Skupina: Města
  container.appendChild(groupHead('Města (propojení A–E)'));
  const g2 = document.createElement('div');
  g2.className = 'bonus-grid';
  container.appendChild(g2);

  // Tier 1 – vždy
  CITY_LETTERS.forEach(L => {
    const card = makeBonusCard({
      key: `city|${L}|1`,
      title: `Města ${L}–${L} (1. hráč)`,
      points: CITY_POINTS_TIER1[L],
      image: CITY_IMAGE,
      claimed: !!state[`city|${L}|1`],
    });
    g2.appendChild(card);
    wireToggle(card, seed);
  });

  // Tier 2 – jen pokud players > 4
  if (players > 4) {
    CITY_LETTERS.forEach(L => {
      const card = makeBonusCard({
        key: `city|${L}|2`,
        title: `Města ${L}–${L} (2. hráč)`,
        points: CITY_POINTS_TIER2[L],
        image: CITY_IMAGE,
        claimed: !!state[`city|${L}|2`],
      });
      g2.appendChild(card);
      wireToggle(card, seed);
    });
  }
}

function groupHead(text) {
  const h = document.createElement('h4');
  h.className = 'grouphead';
  h.textContent = text;
  return h;
}

function makeBonusCard({ key, title, points, image, claimed }) {
  const card = document.createElement('div');
  card.className = 'bonus-card map';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.dataset.key = key;
  card.style.setProperty('--bg-img', `url("${encodeURI(image)}")`);

  const titleEl = document.createElement('div');
  titleEl.className = 'title';
  titleEl.textContent = title;

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = `+${points}`;

  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = '✓ Získáno';

  card.appendChild(badge);
  card.appendChild(titleEl);
  card.appendChild(status);

  setClaimed(card, claimed);
  return card;
}

function wireToggle(card, seed) {
  const toggle = () => {
    const st = loadState(seed);
    const k = card.dataset.key;
    const newVal = !card.classList.contains('claimed');
    setClaimed(card, newVal);
    st[k] = newVal;
    saveState(seed, st);
  };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
}

function setClaimed(card, val) {
  if (val) {
    card.classList.add('claimed');
    card.setAttribute('aria-pressed', 'true');
  } else {
    card.classList.remove('claimed');
    card.setAttribute('aria-pressed', 'false');
  }
}
