/**
 * Womby, the Gut Feeling wombat, drawn as pixel art.
 * Each pose is built on a small grid from simple shapes, then outlined and shaded,
 * so every sprite shares one consistent silhouette and palette.
 */

export type WombyPose = "happy" | "curious" | "thinking" | "sleepy" | "encouraging" | "celebrate" | "wave";

export const WOMBY_W = 28;
export const WOMBY_H = 26;

const PAL: Record<string, string> = {
  o: "#4a2f20", // outline
  b: "#a8754c", // body
  d: "#8c5f3b", // body shade
  h: "#b98459", // body highlight
  m: "#e3c29b", // muzzle / belly
  n: "#2e1d14", // nose
  e: "#1f1511", // eye
  w: "#ffffff", // eye shine
  c: "#f3a3a0", // cheek
  g: "#5aa469", // leaf
  G: "#3d7f4d", // leaf dark
  s: "#7a5233", // stem
  y: "#f6c945", // sparkle
  k: "#ee8a8a", // heart
  q: "#5b4a9e", // question / zz ink
  t: "#a99ddb", // thought bubble
};

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: WOMBY_H }, () => Array.from({ length: WOMBY_W }, () => "."));
}

function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, ch: string) {
  for (let y = 0; y < WOMBY_H; y++)
    for (let x = 0; x < WOMBY_W; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y][x] = ch;
    }
}

function put(g: Grid, x: number, y: number, ch: string) {
  if (y >= 0 && y < WOMBY_H && x >= 0 && x < WOMBY_W) g[y][x] = ch;
}

function pattern(g: Grid, x0: number, y0: number, rows: string[]) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== "." && put(g, x0 + dx, y0 + dy, ch)));
}

/** Outline every filled body pixel that touches empty space, and shade the lower-right edge. */
function finish(g: Grid) {
  const body = new Set(["b", "d", "h", "m", "c", "e", "w", "n"]);
  const out = g.map((r) => [...r]);
  for (let y = 0; y < WOMBY_H; y++)
    for (let x = 0; x < WOMBY_W; x++) {
      if (!body.has(g[y][x])) continue;
      const empty = (xx: number, yy: number) => yy < 0 || yy >= WOMBY_H || xx < 0 || xx >= WOMBY_W || !body.has(g[yy][xx]);
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) out[y][x] = "o";
    }
  for (let y = 0; y < WOMBY_H; y++)
    for (let x = 0; x < WOMBY_W; x++) {
      if (out[y][x] !== "b") continue;
      // soft shade on the right and bottom, highlight on the upper left
      if (out[y][x + 1] === "o" || out[y + 1]?.[x] === "o") out[y][x] = "d";
      else if (out[y][x - 1] === "o" && y < 12) out[y][x] = "h";
    }
  return out;
}

function base(): Grid {
  const g = blank();
  // ears
  ellipse(g, 7.5, 5.2, 2.6, 2.6, "b");
  ellipse(g, 20.5, 5.2, 2.6, 2.6, "b");
  // one round body (wombats are wonderfully potato-shaped) and two stubby feet
  ellipse(g, 14, 14.6, 11.2, 9.2, "b");
  ellipse(g, 8.5, 23.4, 2.6, 1.6, "b");
  ellipse(g, 19.5, 23.4, 2.6, 1.6, "b");
  // inner ears
  put(g, 7, 5, "c");
  put(g, 20, 5, "c");
  // muzzle and belly
  ellipse(g, 14, 14.2, 4.2, 2.8, "m");
  ellipse(g, 14, 20.6, 4.6, 2.4, "m");
  // nose
  pattern(g, 12, 12, ["nnnn", ".nn."]);
  // cheeks
  pattern(g, 6, 14, ["cc"]);
  pattern(g, 20, 14, ["cc"]);
  return g;
}

function eyesOpen(g: Grid, lookUp = false) {
  const y = lookUp ? 9 : 10;
  pattern(g, 8, y, ["ew", "ee"]);
  pattern(g, 18, y, ["ew", "ee"]);
}

function eyesHappy(g: Grid) {
  // ^ ^ eyes
  pattern(g, 8, 10, [".e.", "e.e"]);
  pattern(g, 17, 10, [".e.", "e.e"]);
}

function eyesClosed(g: Grid) {
  pattern(g, 8, 11, ["eee"]);
  pattern(g, 17, 11, ["eee"]);
}

function smile(g: Grid, big = false) {
  if (big) pattern(g, 12, 15, ["e..e", ".ee."]);
  else pattern(g, 12, 15, ["e..e", ".ee."].map((r, i) => (i === 0 ? r : r)));
}

function smallMouth(g: Grid) {
  pattern(g, 13, 15, ["ee"]);
}

function paws(g: Grid, wave = false) {
  pattern(g, 7, 18, ["dd", "dd"]);
  if (wave) ellipse(g, 25, 8.5, 1.9, 2.4, "b");
  else pattern(g, 19, 18, ["dd", "dd"]);
}

function sprout(g: Grid) {
  pattern(g, 12, 0, ["gg.GG", "gggGG", "..s..", "..s.."]);
}

function sparkles(g: Grid) {
  pattern(g, 1, 2, [".y.", "yyy", ".y."]);
  pattern(g, 24, 1, [".y.", "yyy", ".y."]);
  put(g, 26, 9, "y");
  put(g, 1, 10, "y");
}

function question(g: Grid) {
  pattern(g, 23, 0, [".qqq.", "q...q", "...q.", "..q..", ".....", "..q.."]);
}

function thought(g: Grid) {
  put(g, 21, 6, "t");
  pattern(g, 23, 3, ["tt", "tt"]);
  pattern(g, 25, 0, ["ttt", "ttt", "ttt"]);
}

function zz(g: Grid) {
  pattern(g, 19, 3, ["qqq", "..q", ".q.", "qqq"]);
  pattern(g, 24, 0, ["qqqq", "..q.", ".q..", "qqqq"]);
}

function heart(g: Grid) {
  pattern(g, 22, 1, ["kk.kk", "kkkkk", ".kkk.", "..k.."]);
}

function build(pose: WombyPose): Grid {
  const g = base();
  switch (pose) {
    case "happy":
      eyesOpen(g);
      smile(g);
      paws(g);
      sprout(g);
      break;
    case "curious":
      eyesOpen(g, true);
      smallMouth(g);
      paws(g);
      break;
    case "thinking":
      eyesOpen(g, true);
      smallMouth(g);
      paws(g);
      break;
    case "sleepy":
      eyesClosed(g);
      smallMouth(g);
      paws(g);
      break;
    case "encouraging":
      eyesHappy(g);
      smile(g, true);
      paws(g);
      sprout(g);
      break;
    case "celebrate":
      eyesHappy(g);
      smile(g, true);
      paws(g);
      sprout(g);
      break;
    case "wave":
      eyesOpen(g);
      smile(g);
      paws(g, true);
      break;
  }
  const out = finish(g);
  // accessories are drawn after the outline pass so they keep their own colours
  if (pose === "curious") question(out);
  if (pose === "thinking") thought(out);
  if (pose === "sleepy") zz(out);
  if (pose === "encouraging") heart(out);
  if (pose === "celebrate") sparkles(out);
  return out;
}

export interface PixelRun {
  x: number;
  y: number;
  w: number;
  fill: string;
}

const cache = new Map<WombyPose, PixelRun[]>();

/** Horizontal runs of same-coloured pixels: few SVG rects, crisp at any size. */
export function wombyRuns(pose: WombyPose): PixelRun[] {
  const hit = cache.get(pose);
  if (hit) return hit;
  const g = build(pose);
  const runs: PixelRun[] = [];
  for (let y = 0; y < WOMBY_H; y++) {
    let x = 0;
    while (x < WOMBY_W) {
      const ch = g[y][x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < WOMBY_W && g[y][x + w] === ch) w++;
      runs.push({ x, y, w, fill: PAL[ch] });
      x += w;
    }
  }
  cache.set(pose, runs);
  return runs;
}

/** ASCII preview, handy when tweaking the sprite. */
export function wombyAscii(pose: WombyPose) {
  return build(pose)
    .map((r) => r.join(""))
    .join("\n");
}
