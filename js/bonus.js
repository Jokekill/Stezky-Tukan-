// Mapové bonusy – města + jedna náhodná atrakce (deterministicky dle seedu)

import { makeRng } from './rng.js';

/* Atrakce: jedna náhodná dle seedu, vždy za +6 */
export const ATTRACTIONS = [
  { key:'Monument', title:'Monument', points:6, image:'assets/bonus/monument.png' },
  { key:'Kniha',    title:'Kniha',    points:6, image:'assets/bonus/kniha.png' },
  { key:'Tukan',    title:'Tukan',    points:6, image:'assets/bonus/tukan.png' },
  { key:'Kočka',    title:'Kočka',    points:6, image:'assets/bonus/kočka.png' },
  { key:'Drak',     title:'Drak',     points:6, image:'assets/bonus/drak.png'  },
];

const CITY_LETTERS = ['A','B','C','D','E'];
const CITY_POINTS_TIER1 = { A:3, B:4, C:5, D:6, E:7 }; // 1. hráč (2–4 hráči)
const CITY_POINTS_TIER2 = { A:2, B:3, C:4, D:5, E:5 }; // 2. hráč (5–8 hráčů)
const CITY_IMAGE = 'assets/bonus/harbor.png';

const STORAGE_NS = 'tucana.mapbonus';
const K = seed => `${STORAGE_NS}:${seed}`;

function loadState(seed) {
  try { return JSON.parse(localStorage.getItem(K(seed)) || '{}'); } catch { return {}; }
}
function saveState(seed, obj) {
  try { localStorage.setItem(K(seed), JSON.stringify(obj)); } catch {}
}
export function resetMapBonuses(seed) { saveState(seed, {}); }

/* ====== Renderery ====== */

/** Města do jednoho řádku (A..E), případně i 2. hráč při players>4 */
export function renderCityBonuses(container, seed, players=4) {
  const state = loadState(seed);
  container.innerHTML = '';

  // ŘÁDEK: 1. hráč (A–E)
  const row1 = document.createElement('div');
  row1.className = 'bonus-row cities-row';
  CITY_LETTERS.forEach(L => {
    const card = makeCityCard({
      key: `city|${L}|1`,
      title: L,                      // jen písmeno
      tier: 1,
      points: CITY_POINTS_TIER1[L],
      image: CITY_IMAGE,
      claimed: !!state[`city|${L}|1`],
    });
    row1.appendChild(card);
    wireToggle(card, seed);
  });
  container.appendChild(row1);

  // Oddělovač + 2. hráč (jen pro 5–8 hráčů)
  if (players > 4) {
    const sep = document.createElement('div');
    sep.className = 'tier-sep';
    sep.innerHTML = '<span>Bonus pro 2.&nbsp;hráče</span>';
    container.appendChild(sep);

    const row2 = document.createElement('div');
    row2.className = 'bonus-row cities-row tier2';
    CITY_LETTERS.forEach(L => {
      const card = makeCityCard({
        key: `city|${L}|2`,
        title: L,                    // jen písmeno
        tier: 2,
        points: CITY_POINTS_TIER2[L],
        image: CITY_IMAGE,
        claimed: !!state[`city|${L}|2`],
      });
      row2.appendChild(card);
      wireToggle(card, seed);
    });
    container.appendChild(row2);
  }
}


/** Jedna náhodná atrakce dle seedu (deterministická) */
export function renderAttractionBonus(container, seed) {
  const state = loadState(seed);
  container.innerHTML = '';
  container.classList.add('bonus-row');

  const rnd = makeRng(`${seed}|attraction`);
  const idx = Math.floor(rnd() * ATTRACTIONS.length);
  const a = ATTRACTIONS[idx];

  const card = makeAttractionCard({
    key: `attr|${a.key}`,
    title: a.title,
    points: a.points,
    image: a.image,
    claimed: !!state[`attr|${a.key}`],
  });
  container.appendChild(card);
  wireToggle(card, seed);
}

/* ====== Karty ====== */

function makeCityCard({ key, title, tier, points, image, claimed }) {
  const card = document.createElement('div');
  card.className = 'bonus-card map';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.dataset.key = key;
  card.style.setProperty('--bg-img', `url("${encodeURI(image)}")`);

  const titleEl = document.createElement('div');
  titleEl.className = 'title';
  titleEl.textContent = title;          // jen písmeno (A..E)

  // body (pravý horní roh)
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = `+${points}`;

  // nenápadná značka tieru (levý horní roh), ať se dají odlišit dvě "A"
  const tierEl = document.createElement('div');
  tierEl.className = 'tier';
  tierEl.textContent = `${tier}.`;

  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = '✓ Získáno';

  card.appendChild(badge);
  card.appendChild(tierEl);
  card.appendChild(titleEl);
  card.appendChild(status);

  setClaimed(card, claimed);
  return card;
}

function makeAttractionCard({ key, title, points, image, claimed }) {
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

/* ====== Interakce ====== */

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
