import { makeRng, shuffleInPlace } from './rng.js';

const TYPES = ['desert','forest','mountain','water','joker'];
const START_COUNTS = { desert:8, forest:7, mountain:6, water:4, joker:2 };

export class DeckManager {
  constructor(seedString) {
    this.rnd = makeRng(seedString);
    this.history = [];  // [{a,b}]
    this._buildDeck();
    this.turn = 0;
  }

  _buildDeck() {
    this.deck = [];
    for (const t of TYPES) {
      const n = START_COUNTS[t];
      for (let i=0;i<n;i++) this.deck.push({ type:t, id:`${t}-${i+1}` });
    }
    shuffleInPlace(this.deck, this.rnd);
    this._recount();
    this.turn = 0;
  }

  _recount() {
    this.counts = { ...START_COUNTS };
    for (const draw of this.history) {
      this.counts[draw.a.type]--;
      this.counts[draw.b.type]--;
    }
    this.left = this.deck.length - this.history.length * 2;
  }

  getCounts() { return { ...this.counts, left: this.left }; }

  canDrawTwo() { return this.left >= 2; }

  _drawCard(exclude = undefined) {
    const usedIds = new Set();
    for (const h of this.history) { usedIds.add(h.a.id); usedIds.add(h.b.id); }
    if (exclude) for (const id of exclude) usedIds.add(id);
    for (const c of this.deck) if (!usedIds.has(c.id)) return c;
    throw new Error('Deck underflow');
  }

  drawTwo() {
    if (!this.canDrawTwo()) {
      return { done:false, message:'Konec kola: zbývá pouze 1 karta (nepoužívá se).', a:null, b:null, endOfRound:true };
    }
    const tempExcl = new Set();
    const a = this._drawCard(tempExcl);
    tempExcl.add(a.id);
    const b = this._drawCard(tempExcl);

    this.history.push({ a, b });
    this.turn++;
    this._recount();

    let msg = '';
    let endOfRound = false;
    if (this.left === 1) {
      msg = 'Konec kola: zbývá 1 karta (odložte ji stranou a zamíchejte nové kolo).';
      endOfRound = true;
    }
    return { done:true, a, b, message:msg, endOfRound };
  }

  undo() {
    if (this.history.length === 0) return false;
    this.history.pop();
    this.turn = Math.max(0, this.turn - 1);
    this._recount();
    return true;
  }

  newRound() {
    this.history = [];
    this._buildDeck(); // nové zamíchání
  }
}

export const TERRAIN_LABEL = {
  desert: 'Poušť',
  forest: 'Les',
  mountain: 'Hora',
  water: 'Voda',
  joker: 'Žolík',
};
