// Zvláštní bonus – červené karty (pravidla: 2–4 hráči = 1 karta) :contentReference[oaicite:6]{index=6}
export function drawRedBonus(rnd) {
  const id = 1 + Math.floor(rnd() * 5); // 1..5
  // Název ponechán generický; doplníš podle vlastních obrázků/obsahu
  return { id, name: `Zvláštní bonus #${id}`, image: `assets/bonus/red-${id}.svg` };
}
