import { makeRng, shuffleInPlace } from './rng.js';

const TYPES = ['desert','forest','mountain','water','joker'];
const START_COUNTS = { desert:8, forest:7, mountain:6, water:4, joker:2 };

export class DeckManager {
  constructor(seedString) {
    this.rnd = makeRng(seedString);
    this.round = 1;               // 1..2
    this.history = [];            // stack of draws: [{a,b}]
    this._buildRoundDeck();
  }

  _buildRoundDeck() {
    // Vždy se míchá všech 27 karet (na začátku kola)
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
    // odečti podle historie v tomto kole
    const used = this.history.filter(h => h.round === this.round);
    for (const draw of used) {
      this.counts[draw.a.type]--;
      this.counts[draw.b.type]--;
    }
    this.left = this.deck.length - used.length*2;
  }

  getCounts() { return { ...this.counts, left: this.left }; }

  canDrawTwo() {
    return this.left >= 2;
  }

  drawTwo() {
    if (!this.canDrawTwo()) {
      return { done:false, message:'Konec kola: zbývá pouze 1 karta (nepoužívá se).', a:null, b:null, endOfRound:true };
    }

    // během jednoho tahu musíme druhou kartu vyloučit od té první
    const tempExcl = new Set();
    const a = this._drawCard(tempExcl);
    tempExcl.add(a.id);
    const b = this._drawCard(tempExcl);

    this.history.push({ round:this.round, a, b });
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


  _drawCard(exclude = undefined) {
    const usedIds = new Set();
    // už odehrané karty v tomto kole
    for (const h of this.history) if (h.round === this.round) {
      usedIds.add(h.a.id); usedIds.add(h.b.id);
    }
    // dočasně vyloučené (např. první karta v právě probíhajícím tahu)
    if (exclude) {
      for (const id of exclude) usedIds.add(id);
    }
    // vezmi první nepoužitou z aktuálně zamíchaného balíčku
    for (const c of this.deck) if (!usedIds.has(c.id)) return c;
    throw new Error('Deck underflow');
  }


  undo() {
    if (this.history.length === 0) return false;
    const last = this.history[this.history.length - 1];
    if (last.round !== this.round) return false;
    this.history.pop();
    this.turn = Math.max(0, this.turn - 1);
    this._recount();
    return true;
  }

  resetRound() {
    // zahoď historii tohoto kola, znovu zamíchej stejné karty (repro se seedem)
    this.history = this.history.filter(h => h.round !== this.round);
    this._buildRoundDeck();
  }

  startNextRound() {
    if (this.round >= 2) return false;
    this.round = 2;
    this._buildRoundDeck();  // zamíchej všechny karty znovu
    return true;
  }

  isGameOver() {
    return (this.round === 2 && this.left <= 1);
  }
}

export const TERRAIN_LABEL = {
  desert: 'Poušť',
  forest: 'Les',
  mountain: 'Hora',
  water: 'Voda',
  joker: 'Žolík',
};
