export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented';

export interface NoteSpelling {
  pc: number;
  flat: string;
  sharp: string;
  isBlack: boolean;
  boardLabel: string;
}

export interface IntervalInfo {
  semitones: number;
  short: string;
  name: string;
  label: string;
}

export interface ChordQualityInfo {
  quality: ChordQuality;
  intervals: readonly [number, number, number];
  label: string;
  shortSuffix: string;
  symbolSuffix: string;
}

export interface IdentifiedChord {
  root: number;
  quality: ChordQuality;
  rootName: string;
  name: string;
  shortName: string;
  pcs: [number, number, number];
}

export interface GridCoord {
  x: number;
  y: number;
}

export interface GridNode extends GridCoord {
  id: string;
  col: number;
  row: number;
  pc: number;
  screenX: number;
  screenY: number;
  flatName: string;
  sharpName: string;
  boardLabel: string;
  isBlack: boolean;
}

export interface GridTriangle {
  id: string;
  orientation: 'up' | 'down';
  quality: 'major' | 'minor';
  nodes: [GridNode, GridNode, GridNode];
  rootPc: number;
}

export interface GridEdge {
  id: string;
  from: GridNode;
  to: GridNode;
  axis: 'fifth' | 'majorThird' | 'minorThird';
}

export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const DEFAULT_SPACING = 88;

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export const NOTE_NAMES_FLAT: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

export const NOTE_NAMES_SHARP: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export const NOTE_SPELLINGS: readonly NoteSpelling[] = [
  { pc: 0, flat: 'C', sharp: 'C', isBlack: false, boardLabel: 'C' },
  { pc: 1, flat: 'Db', sharp: 'C#', isBlack: true, boardLabel: 'C# / Db' },
  { pc: 2, flat: 'D', sharp: 'D', isBlack: false, boardLabel: 'D' },
  { pc: 3, flat: 'Eb', sharp: 'D#', isBlack: true, boardLabel: 'D# / Eb' },
  { pc: 4, flat: 'E', sharp: 'E', isBlack: false, boardLabel: 'E' },
  { pc: 5, flat: 'F', sharp: 'F', isBlack: false, boardLabel: 'F' },
  { pc: 6, flat: 'Gb', sharp: 'F#', isBlack: true, boardLabel: 'F# / Gb' },
  { pc: 7, flat: 'G', sharp: 'G', isBlack: false, boardLabel: 'G' },
  { pc: 8, flat: 'Ab', sharp: 'G#', isBlack: true, boardLabel: 'G# / Ab' },
  { pc: 9, flat: 'A', sharp: 'A', isBlack: false, boardLabel: 'A' },
  { pc: 10, flat: 'Bb', sharp: 'A#', isBlack: true, boardLabel: 'A# / Bb' },
  { pc: 11, flat: 'B', sharp: 'B', isBlack: false, boardLabel: 'B' },
];

/**
 * Returns the note name for a pitch class.
 * Prompts use flat spellings by default (e.g. Db, Eb, Gb, Ab, Bb).
 */
export function noteName(pc: number, preferSharp = false): string {
  const normalized = mod12(pc);
  return preferSharp ? NOTE_NAMES_SHARP[normalized] : NOTE_NAMES_FLAT[normalized];
}

export function boardNoteLabel(pc: number): string {
  return NOTE_SPELLINGS[mod12(pc)].boardLabel;
}

export function isBlackKey(pc: number): boolean {
  return NOTE_SPELLINGS[mod12(pc)].isBlack;
}

export function parseNoteName(raw: string): number {
  const cleaned = raw.trim();
  const sharpIdx = NOTE_NAMES_SHARP.indexOf(cleaned);
  if (sharpIdx !== -1) return sharpIdx;
  const flatIdx = NOTE_NAMES_FLAT.indexOf(cleaned);
  if (flatIdx !== -1) return flatIdx;
  throw new Error(`Unknown note name: "${raw}"`);
}

export const INTERVALS: Record<number, IntervalInfo> = {
  0: { semitones: 0, short: 'P1', name: 'unison', label: 'Unison' },
  1: { semitones: 1, short: 'm2', name: 'minor second', label: 'Minor second' },
  2: { semitones: 2, short: 'M2', name: 'major second', label: 'Major second' },
  3: { semitones: 3, short: 'm3', name: 'minor third', label: 'Minor third' },
  4: { semitones: 4, short: 'M3', name: 'major third', label: 'Major third' },
  5: { semitones: 5, short: 'P4', name: 'perfect fourth', label: 'Perfect fourth' },
  6: { semitones: 6, short: 'TT', name: 'tritone', label: 'Tritone' },
  7: { semitones: 7, short: 'P5', name: 'perfect fifth', label: 'Perfect fifth' },
  8: { semitones: 8, short: 'm6', name: 'minor sixth', label: 'Minor sixth' },
  9: { semitones: 9, short: 'M6', name: 'major sixth', label: 'Major sixth' },
  10: { semitones: 10, short: 'm7', name: 'minor seventh', label: 'Minor seventh' },
  11: { semitones: 11, short: 'M7', name: 'major seventh', label: 'Major seventh' },
};

export function intervalInfo(semitones: number): IntervalInfo {
  return INTERVALS[mod12(semitones)];
}

export function intervalBetween(rootPc: number, targetPc: number): IntervalInfo {
  return INTERVALS[mod12(targetPc - rootPc)];
}

export const CHORD_QUALITIES: Record<ChordQuality, ChordQualityInfo> = {
  major: {
    quality: 'major',
    intervals: [0, 4, 7],
    label: 'major',
    shortSuffix: '',
    symbolSuffix: '',
  },
  minor: {
    quality: 'minor',
    intervals: [0, 3, 7],
    label: 'minor',
    shortSuffix: 'm',
    symbolSuffix: 'm',
  },
  diminished: {
    quality: 'diminished',
    intervals: [0, 3, 6],
    label: 'diminished',
    shortSuffix: 'dim',
    symbolSuffix: '°',
  },
  augmented: {
    quality: 'augmented',
    intervals: [0, 4, 8],
    label: 'augmented',
    shortSuffix: 'aug',
    symbolSuffix: '+',
  },
};

export const ALL_QUALITIES: readonly ChordQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
];

export function chordPitchClasses(
  root: number,
  quality: ChordQuality
): [number, number, number] {
  const r = mod12(root);
  const [i0, i1, i2] = CHORD_QUALITIES[quality].intervals;
  return [mod12(r + i0), mod12(r + i1), mod12(r + i2)];
}

export function chordDisplayName(
  root: number,
  quality: ChordQuality,
  rootLabel?: string
): string {
  const rName = rootLabel ?? noteName(root);
  return `${rName} ${CHORD_QUALITIES[quality].label}`;
}

export function chordShortName(
  root: number,
  quality: ChordQuality,
  rootLabel?: string
): string {
  const rName = rootLabel ?? noteName(root);
  return `${rName}${CHORD_QUALITIES[quality].shortSuffix}`;
}

/**
 * Tonnetz pitch class formula: (7x + 4y) mod 12
 * Directions:
 *  - right (+1, 0) = +7 (perfect fifth)
 *  - up-right (0, +1) = +4 (major third)
 *  - down-right (+1, -1) = +3 (minor third)
 */
export function pitchClassAt(x: number, y: number): number {
  return mod12(7 * x + 4 * y);
}

/**
 * Upward-pointing triangle anchored at (x, y):
 * (x, y), (x + 1, y), (x, y + 1).
 * At origin (0, 0), yields C (0), G (7), E (4).
 */
export function upwardTriangleAt(
  x = 0,
  y = 0
): [GridCoord, GridCoord, GridCoord] {
  return [
    { x, y },
    { x: x + 1, y },
    { x, y: y + 1 },
  ];
}

/**
 * Matching downward-pointing triangle sharing the C-E edge at (x, y):
 * (x, y), (x - 1, y + 1), (x, y + 1).
 * At origin (0, 0), yields C (0), A (9), E (4).
 */
export function downwardTriangleAt(
  x = 0,
  y = 0
): [GridCoord, GridCoord, GridCoord] {
  return [
    { x, y },
    { x: x - 1, y: y + 1 },
    { x, y: y + 1 },
  ];
}

export const ADJACENT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [-1, 1],
  [1, -1],
];

/**
 * Two notes are adjacent if their (x, y) differ by one of:
 * (1,0), (-1,0), (0,1), (0,-1), (-1,1), (1,-1).
 */
export function areAdjacent(a: GridCoord, b: GridCoord): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return ADJACENT_DELTAS.some(([ax, ay]) => ax === dx && ay === dy);
}

/**
 * A chord counts as "connected" if its three selected nodes have at least 2 adjacent pairs.
 */
export function connected(nodes: ReadonlyArray<GridCoord>): boolean {
  if (nodes.length < 3) return false;
  let adjacentPairs = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (areAdjacent(nodes[i], nodes[j])) {
        adjacentPairs++;
      }
    }
  }
  return adjacentPairs >= 2;
}

/**
 * Generates the 6-column x 5-row Tonnetz grid.
 * Row y starts at x = -floor(y / 2), screen X = (x + y / 2) * spacing, and row 0 is at the bottom.
 */
export function generateGrid(
  cols = GRID_COLS,
  rows = GRID_ROWS,
  spacing = DEFAULT_SPACING
): GridNode[] {
  const nodes: GridNode[] = [];
  const rowHeight = spacing * (Math.sqrt(3) / 2);

  for (let y = 0; y < rows; y++) {
    const xStart = -Math.floor(y / 2);
    for (let col = 0; col < cols; col++) {
      const x = xStart + col;
      const pc = pitchClassAt(x, y);
      const spelling = NOTE_SPELLINGS[pc];
      const screenX = (x + y / 2) * spacing;
      const screenY = (rows - 1 - y) * rowHeight;

      nodes.push({
        id: `node_${x}_${y}`,
        x,
        y,
        col,
        row: y,
        pc,
        screenX,
        screenY,
        flatName: spelling.flat,
        sharpName: spelling.sharp,
        boardLabel: spelling.boardLabel,
        isBlack: spelling.isBlack,
      });
    }
  }

  return nodes;
}

export function generateTriangles(nodes: ReadonlyArray<GridNode>): GridTriangle[] {
  const byCoord = new Map<string, GridNode>();
  for (const n of nodes) {
    byCoord.set(`${n.x},${n.y}`, n);
  }

  const triangles: GridTriangle[] = [];

  for (const n of nodes) {
    // Upward triangle anchored at (x, y): (x, y), (x+1, y), (x, y+1) -> Major triad with root at (x, y)
    const upCoords = upwardTriangleAt(n.x, n.y);
    const upA = byCoord.get(`${upCoords[0].x},${upCoords[0].y}`);
    const upB = byCoord.get(`${upCoords[1].x},${upCoords[1].y}`);
    const upC = byCoord.get(`${upCoords[2].x},${upCoords[2].y}`);
    if (upA && upB && upC) {
      triangles.push({
        id: `tri_up_${n.x}_${n.y}`,
        orientation: 'up',
        quality: 'major',
        nodes: [upA, upB, upC],
        rootPc: upA.pc,
      });
    }

    // Downward triangle anchored at bottom vertex (x, y): (x, y), (x-1, y+1), (x, y+1) -> Minor triad with root at (x-1, y+1)
    const downCoords = downwardTriangleAt(n.x, n.y);
    const dnA = byCoord.get(`${downCoords[0].x},${downCoords[0].y}`);
    const dnB = byCoord.get(`${downCoords[1].x},${downCoords[1].y}`);
    const dnC = byCoord.get(`${downCoords[2].x},${downCoords[2].y}`);
    if (dnA && dnB && dnC) {
      triangles.push({
        id: `tri_down_${n.x}_${n.y}`,
        orientation: 'down',
        quality: 'minor',
        nodes: [dnA, dnB, dnC],
        rootPc: dnB.pc,
      });
    }
  }

  return triangles;
}

export function generateEdges(nodes: ReadonlyArray<GridNode>): GridEdge[] {
  const byCoord = new Map<string, GridNode>();
  for (const n of nodes) {
    byCoord.set(`${n.x},${n.y}`, n);
  }

  const edges: GridEdge[] = [];
  const directions: ReadonlyArray<{
    dx: number;
    dy: number;
    axis: GridEdge['axis'];
  }> = [
    { dx: 1, dy: 0, axis: 'fifth' },
    { dx: 0, dy: 1, axis: 'majorThird' },
    { dx: 1, dy: -1, axis: 'minorThird' },
  ];

  for (const n of nodes) {
    for (const dir of directions) {
      const target = byCoord.get(`${n.x + dir.dx},${n.y + dir.dy}`);
      if (target) {
        edges.push({
          id: `edge_${n.x}_${n.y}_${target.x}_${target.y}`,
          from: n,
          to: target,
          axis: dir.axis,
        });
      }
    }
  }

  return edges;
}

/**
 * Identifies a 3-note triad from its pitch classes.
 * Names all four triad qualities: major, minor, diminished, augmented.
 */
export function identify(
  pcs: ReadonlyArray<number>,
  preferredRoot?: number
): IdentifiedChord | null {
  const normalized = Array.from(new Set(pcs.map(mod12)));
  if (normalized.length !== 3) {
    return null;
  }

  const candidates = [...normalized];
  if (preferredRoot !== undefined) {
    const pref = mod12(preferredRoot);
    const idx = candidates.indexOf(pref);
    if (idx > 0) {
      candidates.splice(idx, 1);
      candidates.unshift(pref);
    }
  }

  for (const candidateRoot of candidates) {
    const rel = normalized
      .map((pc) => mod12(pc - candidateRoot))
      .sort((a, b) => a - b);

    for (const quality of ALL_QUALITIES) {
      const target = CHORD_QUALITIES[quality].intervals;
      if (
        rel[0] === target[0] &&
        rel[1] === target[1] &&
        rel[2] === target[2]
      ) {
        const rootName = noteName(candidateRoot);
        return {
          root: candidateRoot,
          quality,
          rootName,
          name: chordDisplayName(candidateRoot, quality, rootName),
          shortName: chordShortName(candidateRoot, quality, rootName),
          pcs: chordPitchClasses(candidateRoot, quality),
        };
      }
    }
  }

  return null;
}

/**
 * Checks whether two sets of 3 pitch classes contain the exact same pitch classes.
 */
export function samePitchClassSet(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>
): boolean {
  const setA = new Set(a.map(mod12));
  const setB = new Set(b.map(mod12));
  if (setA.size !== setB.size) return false;
  for (const v of setA) {
    if (!setB.has(v)) return false;
  }
  return true;
}

/**
 * Finds a connected 3-node shape on the board for the given root and quality.
 * Prefers canonical geometric shapes:
 *  - major: upward triangle
 *  - minor: downward triangle
 *  - diminished: straight line of 3 going down-right (+1, -1)
 *  - augmented: straight line of 3 going up-right (0, +1)
 * Returns the 3 GridNodes ordered as [rootNode, thirdNode, fifthNode], or null if not found.
 */
export function findShape(
  root: number,
  quality: ChordQuality,
  grid?: ReadonlyArray<GridNode>
): [GridNode, GridNode, GridNode] | null {
  const nodes = grid ?? generateGrid();
  const byCoord = new Map<string, GridNode>();
  for (const n of nodes) {
    byCoord.set(`${n.x},${n.y}`, n);
  }

  const [rPc, thirdPc, fifthPc] = chordPitchClasses(root, quality);

  // 1. Check canonical geometric shapes first
  if (quality === 'major') {
    for (const n of nodes) {
      if (n.pc !== rPc) continue;
      const nFifth = byCoord.get(`${n.x + 1},${n.y}`);
      const nThird = byCoord.get(`${n.x},${n.y + 1}`);
      if (nThird && nFifth && nThird.pc === thirdPc && nFifth.pc === fifthPc) {
        return [n, nThird, nFifth];
      }
    }
  } else if (quality === 'minor') {
    for (const n of nodes) {
      if (n.pc !== rPc) continue;
      // Downward triangle has root at (x-1, y+1), third at (x, y), fifth at (x, y+1)
      // Relative to root at (rx, ry): third is (rx + 1, ry - 1), fifth is (rx + 1, ry)
      const nThird = byCoord.get(`${n.x + 1},${n.y - 1}`);
      const nFifth = byCoord.get(`${n.x + 1},${n.y}`);
      if (nThird && nFifth && nThird.pc === thirdPc && nFifth.pc === fifthPc) {
        return [n, nThird, nFifth];
      }
    }
  } else if (quality === 'diminished') {
    // Straight line going down-right: (+1, -1) steps
    for (const n of nodes) {
      if (n.pc !== rPc) continue;
      const nThird = byCoord.get(`${n.x + 1},${n.y - 1}`);
      const nFifth = byCoord.get(`${n.x + 2},${n.y - 2}`);
      if (nThird && nFifth && nThird.pc === thirdPc && nFifth.pc === fifthPc) {
        return [n, nThird, nFifth];
      }
    }
  } else if (quality === 'augmented') {
    // Straight line going up-right: (0, +1) steps.
    // Because augmented triads divide the octave into 3 equal major thirds, any of the 3 chord tones can start the line!
    for (const n of nodes) {
      const n1 = byCoord.get(`${n.x},${n.y + 1}`);
      const n2 = byCoord.get(`${n.x},${n.y + 2}`);
      if (!n1 || !n2) continue;
      const lineNodes = [n, n1, n2];
      const rootNode = lineNodes.find((ln) => ln.pc === rPc);
      const thirdNode = lineNodes.find((ln) => ln.pc === thirdPc);
      const fifthNode = lineNodes.find((ln) => ln.pc === fifthPc);
      if (rootNode && thirdNode && fifthNode) {
        return [rootNode, thirdNode, fifthNode];
      }
    }
  }

  // 2. Fallback: any connected 3 nodes on the board matching [rPc, thirdPc, fifthPc]
  const roots = nodes.filter((n) => n.pc === rPc);
  const thirds = nodes.filter((n) => n.pc === thirdPc);
  const fifths = nodes.filter((n) => n.pc === fifthPc);

  let bestShape: [GridNode, GridNode, GridNode] | null = null;
  let bestAdjCount = -1;

  for (const nr of roots) {
    for (const nt of thirds) {
      for (const nf of fifths) {
        const candidate: [GridNode, GridNode, GridNode] = [nr, nt, nf];
        if (connected(candidate)) {
          const adjCount =
            (areAdjacent(nr, nt) ? 1 : 0) +
            (areAdjacent(nt, nf) ? 1 : 0) +
            (areAdjacent(nr, nf) ? 1 : 0);
          if (adjCount > bestAdjCount) {
            bestAdjCount = adjCount;
            bestShape = candidate;
          }
        }
      }
    }
  }

  return bestShape;
}

/**
 * Voices a set of pitch classes as ascending MIDI notes starting from the bass note (MIDI 60 + bassPc).
 * The first note in the returned array is the bass note; upper voices are stacked strictly ascending above it.
 */
export function voice(
  pcs: ReadonlyArray<number>,
  bassPc?: number
): number[] {
  if (pcs.length === 0) return [];
  const uniquePcs = Array.from(new Set(pcs.map(mod12)));
  const bass = bassPc !== undefined ? mod12(bassPc) : uniquePcs[0];
  const bassMidi = 60 + bass;

  const upperOffsets = uniquePcs
    .filter((pc) => pc !== bass)
    .map((pc) => mod12(pc - bass))
    .sort((a, b) => a - b);

  return [bassMidi, ...upperOffsets.map((offset) => bassMidi + offset)];
}

/**
 * Required bass pitch class for a given inversion:
 *  - 0 (root position): root
 *  - 1 (first inversion): third
 *  - 2 (second inversion): fifth
 */
export function inversionBassPc(
  root: number,
  quality: ChordQuality,
  inversion: 0 | 1 | 2 = 0
): number {
  const pcs = chordPitchClasses(root, quality);
  return pcs[inversion];
}

export function inversionLabel(inversion: 0 | 1 | 2): string {
  if (inversion === 1) return '1st inversion (3rd in the bass)';
  if (inversion === 2) return '2nd inversion (5th in the bass)';
  return 'Root position (root in the bass)';
}
