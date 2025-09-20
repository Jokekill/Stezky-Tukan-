import { makeRng } from './rng.js';
import { DeckManager, TERRAIN_LABEL } from './deck.js';
import { generateCityLayout, rotateLayout, layoutToText } from './layout.js';
import { drawRedBonus } from './bonus.js';

let seed = getSeedFromUrl() || 'tucana';
let rng = makeRng(seed);
let deck = new DeckManager(seed);
let layout = null;

const $ = sel => document.querySelector(sel);

const el = {
  seedInput: $('#seedInput'),
  applySeed: $('#applySeed'),
  randomSeed: $('#randomSeed'),

  roundLabel: $('#roundLabel'),
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
  resetRound: $('#resetRound'),
  newGame: $('#newGame'),

  history: $('#history'),

  // layout
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
  el.seedInput.value = seed;
  updateDeckUI(true);
  wireEvents();
  // Vygeneruj výchozí rozložení
  doGenLayout();
}

function wireEvents() {
  el.applySeed.addEventListener('click', () => {
    seed = el.seedInput.value.trim() || 'tucana';
    setSeedInUrl(seed);
    rng = makeRng(seed);
    deck = new DeckManager(seed);
    layout = null; // nové losování
    updateDeckUI(true);
    doGenLayout();
    clearBonus();
  });

  el.randomSeed.addEventListener('click', () => {
    const s = `seed-${Math.random().toString(36).slice(2,8)}`;
    el.seedInput.value = s;
    el.applySeed.click();
  });

  el.drawTwo.addEventListener('click', onDrawTwo);
  el.undo.addEventListener('click', () => { if (deck.undo()) updateDeckUI(); });
  el.resetRound.addEventListener('click', () => { deck.resetRound(); updateDeckUI(true); });
  el.newGame.addEventListener('click', () => {
    deck = new DeckManager(seed);
    updateDeckUI(true);
    clearBonus();
  });

  el.genLayout.addEventListener('click', doGenLayout);
  el.applyOffset.addEventListener('click', applyLayoutOffset);
  el.copyLayout.addEventListener('click', () => {
    navigator.clipboard.writeText(layoutToText(getCurrentLayout())).then(()=>{
      toast('Zkopírováno do schránky.');
    });
  });

  el.drawRedBonus.addEventListener('click', () => {
    const b = drawRedBonus(rng);
    el.redBonusImg.src = b.image;
    el.redBonusImg.alt = b.name;
    el.redBonusLabel.textContent = b.name;
  });
}

function onDrawTwo() {
  const res = deck.drawTwo();
  if (!res.done && res.endOfRound) {
    el.deckMessage.textContent = res.message;
    // nabídnout přechod do dalšího kola
    if (deck.round === 1) {
      const btn = document.createElement('button');
      btn.textContent = 'Zahájit 2. kolo (zamíchat)';
      btn.addEventListener('click', () => { deck.startNextRound(); updateDeckUI(true); });
      el.deckMessage.appendChild(document.createTextNode(' '));
      el.deckMessage.appendChild(btn);
    } else {
      // po 2. kole už se další nekoná
      toast('Konec hry – balíček byl vyčerpán podruhé.');
    }
    updateDeckUI();
    return;
  }
  if (res.done) {
    showCard(el.cardA, res.a.type);
    showCard(el.cardB, res.b.type);
    appendHistory(res.a.type, res.b.type, deck.turn, deck.round);
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
  el.roundLabel.textContent = `Kolo: ${deck.round}/2`;
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

function showCard(node, type) {
  node.dataset.type = type;
  node.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = (type === 'none') ? '—' :
    (TERRAIN_LABEL[type] || type);
  node.appendChild(span);
  // Když dodáš obrázky, můžeš sem přidat <img src="assets/terrain/TYPE.svg">
}

function appendHistory(a, b, turn, round) {
  const li = document.createElement('li');
  li.textContent = `Kolo ${round}, tah ${turn}: ${TERRAIN_LABEL[a]} + ${TERRAIN_LABEL[b]}`;
  el.history.appendChild(li);
}

function doGenLayout() {
  layout = generateCityLayout(rng);
  renderLayout(layout);
}

function getCurrentLayout() {
  const off = parseInt(el.layoutOffset.value || '0', 10);
  return rotateLayout(layout, off);
}

function applyLayoutOffset() {
  renderLayout(getCurrentLayout());
}

function renderLayout(L) {
  el.layoutVis.innerHTML = '';
  L.forEach((letter, i) => {
    const div = document.createElement('div');
    div.className = 'tile';
    div.innerHTML = `<span class="n">${i+1}</span><span class="L">${letter}</span>`;
    el.layoutVis.appendChild(div);
  });
}

function clearBonus() {
  el.redBonusImg.src = '';
  el.redBonusImg.alt = 'Zvláštní bonus';
  el.redBonusLabel.textContent = '—';
}

function toast(txt) {
  el.deckMessage.textContent = txt;
}

/*** URL helpers ***/
function getSeedFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('seed');
}
function setSeedInUrl(s) {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', s);
  history.replaceState(null, '', url.toString());
}
