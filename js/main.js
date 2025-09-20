import { makeRng } from './rng.js';
import { DeckManager, TERRAIN_LABEL } from './deck.js';
import { generateCityLayout, rotateLayout, layoutToText } from './layout.js';
import { drawRedBonus } from './bonus.js';

const DEFAULT_VISIBLE = { deck:true, bonus:true, layout:false };

let seed = getSeedFromUrl() || loadSeed() || 'tucana';
let rng = makeRng(seed);
let deck = new DeckManager(seed);
let layout = null;

const $ = sel => document.querySelector(sel);

const el = {
  // menu
  menuToggle: $('#menuToggle'),
  menuPanel: $('#menuPanel'),
  modDeck: $('#modDeck'),
  modLayout: $('#modLayout'),
  modBonus: $('#modBonus'),
  seedInput: $('#seedInput'),
  applySeed: $('#applySeed'),
  randomSeed: $('#randomSeed'),

  // deck UI
  turnLabel: $('#turnLabel'),
  leftLabel: $('#leftLabel'),
  deckMessage: $('#deckMessage'),
  cnt: {
    desert: $('#cnt-desert'),
    forest: $('#cnt-forest'),
    mountain: $('#cnt-mountain'),
    water:   $('#cnt-water'),
    joker:   $('#cnt-joker'),
  },
  cardA: $('#cardA'),
  cardB: $('#cardB'),
  drawTwo: $('#drawTwo'),
  undo: $('#undo'),
  newRound: $('#newRound'),
  history: $('#history'),

  // modules
  deckSection: $('#deckSection'),
  layoutSection: $('#layoutSection'),
  bonusSection: $('#bonusSection'),

  // layout UI
  genLayout: $('#genLayout'),
  layoutVis: $('#layoutVis'),
  layoutOffset: $('#layoutOffset'),
  applyOffset: $('#applyOffset'),
  copyLayout: $('#copyLayout'),

  // bonus
  drawRedBonus: $('#drawRedBonus'),
  redBonusImg: $('#redBonusImg'),
  redBonusLabel: $('#redBonusLabel'),
};

init();

function init() {
  // seed
  el.seedInput.value = seed;
  // modules visibility
  applySavedVisibility();

  updateDeckUI(true);
  wireEvents();
  // předvygeneruj layout
  doGenLayout();
}

/* ===== Menu & viditelnost modulů ===== */
function wireEvents() {
  // hamburger
  el.menuToggle.addEventListener('click', () => toggleMenu());
  document.addEventListener('click', (e) => {
    if (!el.menuPanel.hidden && !el.menuPanel.contains(e.target) && e.target !== el.menuToggle) {
      closeMenu();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // module toggles
  el.modDeck.addEventListener('change', onVisibilityChange);
  el.modLayout.addEventListener('change', onVisibilityChange);
  el.modBonus.addEventListener('change', onVisibilityChange);

  // seed
  el.applySeed.addEventListener('click', () => {
    seed = el.seedInput.value.trim() || 'tucana';
    setSeedInUrl(seed);
    saveSeed(seed);
    rng = makeRng(seed);
    deck = new DeckManager(seed);
    layout = null;
    updateDeckUI(true);
    doGenLayout();
    clearBonus();
  });
  el.randomSeed.addEventListener('click', () => {
    const s = `seed-${Math.random().toString(36).slice(2,8)}`;
    el.seedInput.value = s;
    el.applySeed.click();
  });

  // deck
  el.drawTwo.addEventListener('click', onDrawTwo);
  el.undo.addEventListener('click', () => { if (deck.undo()) updateDeckUI(); });
  el.newRound.addEventListener('click', () => { deck.newRound(); updateDeckUI(true); clearBonus(); });

  // layout
  el.genLayout.addEventListener('click', doGenLayout);
  el.applyOffset.addEventListener('click', applyLayoutOffset);
  el.copyLayout.addEventListener('click', () => {
    navigator.clipboard.writeText(layoutToText(getCurrentLayout())).then(()=> toast('Zkopírováno do schránky.'));
  });

  // bonus
  el.drawRedBonus.addEventListener('click', () => {
    const b = drawRedBonus(rng);
    el.redBonusImg.src = b.image;
    el.redBonusImg.alt = b.name;
    el.redBonusLabel.textContent = b.name;
  });
}

function toggleMenu() {
  const open = el.menuPanel.hidden;
  el.menuPanel.hidden = !open;
  el.menuToggle.setAttribute('aria-expanded', String(open));
}
function closeMenu() { el.menuPanel.hidden = true; el.menuToggle.setAttribute('aria-expanded','false'); }

function onVisibilityChange() {
  el.deckSection.hidden   = !el.modDeck.checked;
  el.layoutSection.hidden = !el.modLayout.checked;
  el.bonusSection.hidden  = !el.modBonus.checked;
  saveVisibility();
}
function applySavedVisibility() {
  const vis = loadVisibility();
  el.modDeck.checked   = !!vis.deck;
  el.modLayout.checked = !!vis.layout;
  el.modBonus.checked  = !!vis.bonus;

  el.deckSection.hidden   = !vis.deck;
  el.layoutSection.hidden = !vis.layout;
  el.bonusSection.hidden  = !vis.bonus;
}

/* ===== Tahy ===== */
function onDrawTwo() {
  const res = deck.drawTwo();
  if (!res.done && res.endOfRound) {
    el.deckMessage.textContent = res.message;  // pouze info; další kolo ručně tlačítkem
    updateDeckUI();
    return;
  }
  if (res.done) {
    showCard(el.cardA, res.a.type);
    showCard(el.cardB, res.b.type);
    appendHistory(res.a.type, res.b.type, deck.turn);
    if (res.message) el.deckMessage.textContent = res.message;
    updateDeckUI();
  }
}

function updateDeckUI(resetFaces=false) {
  const cs = deck.getCounts();
  el.cnt.desert.textContent = cs.desert;
  el.cnt.forest.textContent = cs.forest;
  el.cnt.mountain.textContent = cs.mountain;
  el.cnt.water.textContent = cs.water;
  el.cnt.joker.textContent = cs.joker;

  el.leftLabel.textContent = `Zbývá karet: ${cs.left}`;
  el.turnLabel.textContent = `Tah: ${deck.turn}`;
  el.drawTwo.disabled = !deck.canDrawTwo();
  el.undo.disabled = (deck.turn === 0);

  if (resetFaces) {
    showCard(el.cardA, 'none');
    showCard(el.cardB, 'none');
    el.history.innerHTML = '';
    el.deckMessage.textContent = '';
  }
}

/* Obrázky = background + barevný overlay + text */
const TERRAIN_IMG = {
  desert:   'assets/terrain/desert.png',
  forest:   'assets/terrain/forest.png',
  mountain: 'assets/terrain/mountain.png', // dodej soubor
  water:    'assets/terrain/water.png',
  joker:    'assets/terrain/joker.png'
};

function showCard(node, type) {
  node.dataset.type = type;
  node.innerHTML = '';

  if (type === 'none') {
    const span = document.createElement('span');
    span.textContent = '—';
    node.style.setProperty('--bg-img', 'none');
    node.appendChild(span);
    return;
  }

  const imgPath = TERRAIN_IMG[type];
  if (imgPath) {
    node.style.setProperty('--bg-img', `url("${imgPath}")`);
  } else {
    node.style.setProperty('--bg-img', 'none');
  }

  const span = document.createElement('span');
  span.textContent = TERRAIN_LABEL[type] || type;
  node.appendChild(span);
}

function appendHistory(a, b, turn) {
  const li = document.createElement('li');
  li.textContent = `Tah ${turn}: ${TERRAIN_LABEL[a]} + ${TERRAIN_LABEL[b]}`;
  el.history.appendChild(li);
}

/* ===== Rozložení měst ===== */
function doGenLayout() {
  layout = generateCityLayout(rng);
  renderLayout(layout);
}
function getCurrentLayout() {
  const off = parseInt(el.layoutOffset.value || '0', 10);
  return rotateLayout(layout, off);
}
function applyLayoutOffset() { renderLayout(getCurrentLayout()); }
function renderLayout(L) {
  el.layoutVis.innerHTML = '';
  L.forEach((letter, i) => {
    const div = document.createElement('div');
    div.className = 'tile';
    div.innerHTML = `<span class="n">${i+1}</span><span class="L">${letter}</span>`;
    el.layoutVis.appendChild(div);
  });
}

/* ===== Bonus ===== */
function clearBonus() {
  el.redBonusImg.src = '';
  el.redBonusImg.alt = 'Zvláštní bonus';
  el.redBonusLabel.textContent = '—';
}

function toast(txt) { el.deckMessage.textContent = txt; }

/*** URL + storage helpers ***/
function getSeedFromUrl() { const url = new URL(window.location.href); return url.searchParams.get('seed'); }
function setSeedInUrl(s) { const url = new URL(window.location.href); url.searchParams.set('seed', s); history.replaceState(null, '', url.toString()); }
function saveSeed(s){ try{ localStorage.setItem('tucana.seed', s); }catch{} }
function loadSeed(){ try{ return localStorage.getItem('tucana.seed') || ''; }catch{ return ''; } }

function saveVisibility(){
  const v = { deck:el.modDeck.checked, layout:el.modLayout.checked, bonus:el.modBonus.checked };
  try{ localStorage.setItem('tucana.visible', JSON.stringify(v)); }catch{}
}
function loadVisibility(){
  try{
    const raw = localStorage.getItem('tucana.visible');
    if (!raw) return { ...DEFAULT_VISIBLE };
    const v = JSON.parse(raw);
    return { deck:!!v.deck, layout:!!v.layout, bonus:!!v.bonus };
  }catch{ return { ...DEFAULT_VISIBLE }; }
}
