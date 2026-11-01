import {
  ALL_QUALITIES,
  ChordQuality,
  findShape,
  generateGrid,
  GridNode,
  intervalInfo,
  inversionBassPc,
  inversionLabel,
  mod12,
  noteName,
} from './theory';

export type LevelKind =
  | 'interval'
  | 'build'
  | 'earq'
  | 'earint'
  | 'earbuild'
  | 'progressions';

export interface IntervalRound {
  kind: 'interval';
  rootPc: number;
  rootNodeId?: string;
  semitones: number;
  eyebrow: string;
  title: string;
  instruction: string;
}

export interface BuildRound {
  kind: 'build';
  rootPc: number;
  rootDisplay?: string;
  quality: ChordQuality;
  showNotes?: boolean;
  inversion?: 0 | 1 | 2;
  requireBass?: boolean;
  roman?: string;
  keyName?: string;
  eyebrow: string;
  title: string;
  instruction: string;
}

export interface EarQualityRound {
  kind: 'earq';
  rootPc: number;
  quality: ChordQuality;
  options: readonly ChordQuality[];
  eyebrow: string;
  title: string;
  instruction: string;
}

export interface EarIntervalRound {
  kind: 'earint';
  rootPc: number;
  semitones: number;
  options: readonly number[];
  eyebrow: string;
  title: string;
  instruction: string;
}

export interface EarBuildRound {
  kind: 'earbuild';
  rootPc: number;
  rootDisplay: string;
  quality: ChordQuality;
  eyebrow: string;
  title: string;
  instruction: string;
}

export type LevelRound =
  | IntervalRound
  | BuildRound
  | EarQualityRound
  | EarIntervalRound
  | EarBuildRound;

export interface LevelDef {
  id: number;
  worldId: number;
  worldTitle: string;
  kind: LevelKind;
  kindTag: string;
  title: string;
  subtitle: string;
  briefing: string;
  staticRounds?: readonly LevelRound[];
  generateRounds: (grid?: ReadonlyArray<GridNode>) => LevelRound[];
}

export interface WorldDef {
  id: number;
  title: string;
  subtitle: string;
  levels: readonly LevelDef[];
}

const DEFAULT_GRID = generateGrid();

/**
 * Returns all root pitch classes (0..11) that have a solvable connected shape
 * for the given chord quality on the 6x5 Tonnetz grid.
 */
export function getSolvableRoots(
  quality: ChordQuality,
  grid: ReadonlyArray<GridNode> = DEFAULT_GRID
): number[] {
  const roots: number[] = [];
  for (let pc = 0; pc < 12; pc++) {
    if (findShape(pc, quality, grid) !== null) {
      roots.push(pc);
    }
  }
  return roots;
}

/**
 * Finds a central node on the grid for a given pitch class so that interval prompts
 * ring a comfortable node near the middle of the board.
 */
export function pickCentralNodeForPc(
  pc: number,
  grid: ReadonlyArray<GridNode> = DEFAULT_GRID
): GridNode {
  const normalized = mod12(pc);
  const candidates = grid.filter((n) => n.pc === normalized);
  if (candidates.length === 0) {
    return grid[0];
  }
  // Prefer rows 1..3 and columns 1..4
  const scored = [...candidates].sort((a, b) => {
    const distA = Math.abs(a.col - 2.5) + Math.abs(a.row - 2);
    const distB = Math.abs(b.col - 2.5) + Math.abs(b.row - 2);
    return distA - distB;
  });
  return scored[0];
}

function makeIntervalRound(
  rootPc: number,
  semitones: number,
  eyebrow = 'Find the interval'
): IntervalRound {
  const rootName = noteName(rootPc);
  const info = intervalInfo(semitones);
  const rootNode = pickCentralNodeForPc(rootPc);
  return {
    kind: 'interval',
    rootPc: mod12(rootPc),
    rootNodeId: rootNode.id,
    semitones,
    eyebrow,
    title: `${info.label} above ${rootName}`,
    instruction: `Tap any node that is a ${info.name} (+${semitones} semitones) above the ringed ${rootName}.`,
  };
}

function makeBuildRound(opts: {
  rootPc: number;
  rootDisplay?: string;
  quality: ChordQuality;
  showNotes?: boolean;
  inversion?: 0 | 1 | 2;
  requireBass?: boolean;
  roman?: string;
  keyName?: string;
  eyebrow?: string;
}): BuildRound {
  const rootDisplay = opts.rootDisplay ?? noteName(opts.rootPc);
  const qualityLabel = opts.quality;
  const title = `${rootDisplay} ${qualityLabel}`;

  const [r, t, f] = [
    opts.rootPc,
    mod12(
      opts.rootPc +
        (opts.quality === 'minor' || opts.quality === 'diminished' ? 3 : 4)
    ),
    mod12(
      opts.rootPc +
        (opts.quality === 'diminished'
          ? 6
          : opts.quality === 'augmented'
            ? 8
            : 7)
    ),
  ];

  // Format note names appropriately (use sharp if rootDisplay uses #)
  const preferSharp = rootDisplay.includes('#') || ['G', 'D', 'A', 'E', 'B'].includes(rootDisplay);
  const noteList = `${noteName(r, preferSharp)} – ${noteName(t, preferSharp)} – ${noteName(f, preferSharp)}`;

  let instruction = 'Tap 3 connected nodes on the lattice to build this triad.';
  if (opts.showNotes) {
    instruction = `Notes: ${noteList}. Tap a connected triangle of these 3 notes.`;
  } else if (opts.requireBass && opts.inversion !== undefined) {
    const bassPc = inversionBassPc(opts.rootPc, opts.quality, opts.inversion);
    const bassName = noteName(bassPc, preferSharp);
    instruction = `${inversionLabel(opts.inversion)} — tap ${bassName} first, then the other two chord tones.`;
  } else if (opts.roman && opts.keyName) {
    instruction = `Chord ${opts.roman} in ${opts.keyName}. Tap 3 connected nodes to form ${title}.`;
  }

  let eyebrow = opts.eyebrow ?? 'Build the triad';
  if (opts.requireBass && opts.inversion !== undefined) {
    eyebrow =
      opts.inversion === 1
        ? 'First inversion'
        : opts.inversion === 2
          ? 'Second inversion'
          : 'Root position';
  } else if (opts.roman && opts.keyName) {
    eyebrow = `Key of ${opts.keyName} · ${opts.roman}`;
  }

  return {
    kind: 'build',
    rootPc: mod12(opts.rootPc),
    rootDisplay,
    quality: opts.quality,
    showNotes: opts.showNotes,
    inversion: opts.inversion,
    requireBass: opts.requireBass,
    roman: opts.roman,
    keyName: opts.keyName,
    eyebrow,
    title,
    instruction,
  };
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a balanced, shuffled list of items of length `count` from `pool`.
 */
function balancedSample<T>(pool: readonly T[], count: number): T[] {
  const result: T[] = [];
  const fullCopies = Math.floor(count / pool.length);
  const remainder = count % pool.length;
  for (let i = 0; i < fullCopies; i++) {
    result.push(...shuffle(pool));
  }
  if (remainder > 0) {
    result.push(...shuffle(pool).slice(0, remainder));
  }
  return shuffle(result);
}

function generateEarQualityRounds(
  qualities: readonly ChordQuality[],
  count: number,
  grid: ReadonlyArray<GridNode> = DEFAULT_GRID
): EarQualityRound[] {
  const chosenQualities = balancedSample(qualities, count);
  let lastRoot = -1;

  return chosenQualities.map((quality, idx) => {
    const solvable = getSolvableRoots(quality, grid);
    const filtered = solvable.filter((r) => r !== lastRoot);
    const pool = filtered.length > 0 ? filtered : solvable;
    const rootPc = pool[Math.floor(Math.random() * pool.length)];
    lastRoot = rootPc;

    return {
      kind: 'earq',
      rootPc,
      quality,
      options: qualities,
      eyebrow: `Ear training · Round ${idx + 1} of ${count}`,
      title: 'What chord quality do you hear?',
      instruction:
        'Listen to the chord and choose its quality. The shape will light up on the board when you solve it.',
    };
  });
}

function generateEarIntervalRounds(
  semitonePool: readonly number[],
  count: number
): EarIntervalRound[] {
  const chosenIntervals = balancedSample(semitonePool, count);
  const allRoots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let lastRoot = -1;

  return chosenIntervals.map((semitones, idx) => {
    const availableRoots = allRoots.filter((r) => r !== lastRoot);
    const rootPc =
      availableRoots[Math.floor(Math.random() * availableRoots.length)];
    lastRoot = rootPc;

    return {
      kind: 'earint',
      rootPc,
      semitones,
      options: semitonePool,
      eyebrow: `Ear interval · Round ${idx + 1} of ${count}`,
      title: `Interval above ${noteName(rootPc)}`,
      instruction:
        'Two notes play melodically, then together. Pick the interval name below.',
    };
  });
}

function generateEarBuildRounds(
  qualities: readonly ChordQuality[],
  count: number,
  grid: ReadonlyArray<GridNode> = DEFAULT_GRID
): EarBuildRound[] {
  const chosenQualities = balancedSample(qualities, count);
  let lastRoot = -1;

  return chosenQualities.map((quality, idx) => {
    const solvable = getSolvableRoots(quality, grid);
    const filtered = solvable.filter((r) => r !== lastRoot);
    const pool = filtered.length > 0 ? filtered : solvable;
    const rootPc = pool[Math.floor(Math.random() * pool.length)];
    lastRoot = rootPc;
    const rootDisplay = noteName(rootPc);

    return {
      kind: 'earbuild',
      rootPc,
      rootDisplay,
      quality,
      eyebrow: `Build by ear · Round ${idx + 1} of ${count}`,
      title: `${rootDisplay} ?`,
      instruction: `Root is ${rootDisplay}. Listen to the chord quality, then build the connected triad on the board.`,
    };
  });
}

export const LEVELS: readonly LevelDef[] = [
  // ================= WORLD 1: STEPS (Levels 1-5) =================
  {
    id: 1,
    worldId: 1,
    worldTitle: 'Steps',
    kind: 'interval',
    kindTag: 'Interval',
    title: 'Major Thirds',
    subtitle: 'Step up-right (+4 semitones)',
    briefing:
      'On the Tonnetz lattice, stepping up and to the right moves up by a major third (+4 semitones). Look for the ringed root note and tap the note directly up-right from it.',
    staticRounds: [
      makeIntervalRound(0, 4), // C -> E
      makeIntervalRound(7, 4), // G -> B
      makeIntervalRound(5, 4), // F -> A
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 2,
    worldId: 1,
    worldTitle: 'Steps',
    kind: 'interval',
    kindTag: 'Interval',
    title: 'Perfect Fifths',
    subtitle: 'Step right (+7 semitones)',
    briefing:
      'Moving straight to the right along any horizontal row ascends by a perfect fifth (+7 semitones). Find the ringed root note and step one node to the right.',
    staticRounds: [
      makeIntervalRound(0, 7), // C -> G
      makeIntervalRound(2, 7), // D -> A
      makeIntervalRound(5, 7), // F -> C
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 3,
    worldId: 1,
    worldTitle: 'Steps',
    kind: 'interval',
    kindTag: 'Interval',
    title: 'Minor Thirds',
    subtitle: 'Step down-right (+3 semitones)',
    briefing:
      'Stepping down and to the right moves up by a minor third (+3 semitones). Notice how going up-right (+4) and down-right (+3) add up to a perfect fifth (+7) to the right.',
    staticRounds: [
      makeIntervalRound(9, 3), // A -> C
      makeIntervalRound(4, 3), // E -> G
      makeIntervalRound(2, 3), // D -> F
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 4,
    worldId: 1,
    worldTitle: 'Steps',
    kind: 'interval',
    kindTag: 'Interval',
    title: 'Perfect Fourths',
    subtitle: 'Step left (+5 semitones)',
    briefing:
      'A perfect fourth (+5 semitones) is the inversion of a perfect fifth (+7). Because 5 + 7 = 12, stepping one node to the left along a row always gives a perfect fourth above the root.',
    staticRounds: [
      makeIntervalRound(0, 5), // C -> F
      makeIntervalRound(7, 5), // G -> C
      makeIntervalRound(2, 5), // D -> G
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 5,
    worldId: 1,
    worldTitle: 'Steps',
    kind: 'interval',
    kindTag: 'Interval',
    title: 'Compass Check',
    subtitle: 'Mixed intervals (5 rounds)',
    briefing:
      'Put all four directions together: right for a perfect fifth, left for a perfect fourth, up-right for a major third, and down-right for a minor third. Use the lattice geometry as your map.',
    staticRounds: [
      makeIntervalRound(0, 4), // M3 above C -> E
      makeIntervalRound(9, 3), // m3 above A -> C
      makeIntervalRound(7, 7), // P5 above G -> D
      makeIntervalRound(5, 5), // P4 above F -> Bb
      makeIntervalRound(3, 4), // M3 above Eb -> G
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },

  // ================= WORLD 2: TRIADS (Levels 6-8) =================
  {
    id: 6,
    worldId: 2,
    worldTitle: 'Triads',
    kind: 'build',
    kindTag: 'Build',
    title: 'Major Triads',
    subtitle: 'Upward warm triangles (C, G, F)',
    briefing:
      'Every upward-pointing triangle on the Tonnetz is a major triad: root at bottom-left, major third at the top apex, and perfect fifth at bottom-right. Tap all three touching corners to build C, G, and F major.',
    staticRounds: [
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'major', showNotes: true }),
      makeBuildRound({ rootPc: 7, rootDisplay: 'G', quality: 'major', showNotes: true }),
      makeBuildRound({ rootPc: 5, rootDisplay: 'F', quality: 'major', showNotes: true }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 7,
    worldId: 2,
    worldTitle: 'Triads',
    kind: 'build',
    kindTag: 'Build',
    title: 'Minor Triads',
    subtitle: 'Downward cool triangles (Am, Em, Dm)',
    briefing:
      'Every downward-pointing triangle is a minor triad: root at top-left, minor third at the bottom apex, and perfect fifth at top-right. Build A minor, E minor, and D minor by selecting their downward triangles.',
    staticRounds: [
      makeBuildRound({ rootPc: 9, rootDisplay: 'A', quality: 'minor', showNotes: true }),
      makeBuildRound({ rootPc: 4, rootDisplay: 'E', quality: 'minor', showNotes: true }),
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'minor', showNotes: true }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 8,
    worldId: 2,
    worldTitle: 'Triads',
    kind: 'build',
    kindTag: 'Build',
    title: 'Major or Minor Mix',
    subtitle: 'D, Bm, Eb, F#m without note hints',
    briefing:
      'Now the individual note names are hidden. Find the root note on the board first, then trace an upward triangle for major or a downward triangle for minor.',
    staticRounds: [
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'major', showNotes: false }),
      makeBuildRound({ rootPc: 11, rootDisplay: 'B', quality: 'minor', showNotes: false }),
      makeBuildRound({ rootPc: 3, rootDisplay: 'Eb', quality: 'major', showNotes: false }),
      makeBuildRound({ rootPc: 6, rootDisplay: 'F#', quality: 'minor', showNotes: false }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },

  // ================= WORLD 3: INVERSIONS (Levels 9-11) =================
  {
    id: 9,
    worldId: 3,
    worldTitle: 'Inversions',
    kind: 'build',
    kindTag: 'Inversion',
    title: 'First Inversion',
    subtitle: 'Third in the bass (C, G, Am)',
    briefing:
      'An inversion changes which chord tone sits lowest in the bass. In first inversion, the third of the chord is the bass note—so you must tap the third FIRST, followed by the other two notes of the triangle.',
    staticRounds: [
      makeBuildRound({
        rootPc: 0,
        rootDisplay: 'C',
        quality: 'major',
        inversion: 1,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 7,
        rootDisplay: 'G',
        quality: 'major',
        inversion: 1,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 9,
        rootDisplay: 'A',
        quality: 'minor',
        inversion: 1,
        requireBass: true,
      }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 10,
    worldId: 3,
    worldTitle: 'Inversions',
    kind: 'build',
    kindTag: 'Inversion',
    title: 'Second Inversion',
    subtitle: 'Fifth in the bass (C, F, Dm)',
    briefing:
      'In second inversion, the perfect fifth of the triad sits in the bass. Find the chord triangle on the lattice, tap its fifth (the right-most corner) as note #1, then complete the triad.',
    staticRounds: [
      makeBuildRound({
        rootPc: 0,
        rootDisplay: 'C',
        quality: 'major',
        inversion: 2,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 5,
        rootDisplay: 'F',
        quality: 'major',
        inversion: 2,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 2,
        rootDisplay: 'D',
        quality: 'minor',
        inversion: 2,
        requireBass: true,
      }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 11,
    worldId: 3,
    worldTitle: 'Inversions',
    kind: 'build',
    kindTag: 'Inversion',
    title: 'Mixed Inversions',
    subtitle: 'Watch the required bass (5 rounds)',
    briefing:
      'Switch smoothly between root position, first inversion, and second inversion. Check the prompt to see which chord member belongs in the bass and tap that node first.',
    staticRounds: [
      makeBuildRound({
        rootPc: 7,
        rootDisplay: 'G',
        quality: 'major',
        inversion: 1,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 9,
        rootDisplay: 'A',
        quality: 'minor',
        inversion: 2,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 5,
        rootDisplay: 'F',
        quality: 'major',
        inversion: 1,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 4,
        rootDisplay: 'E',
        quality: 'minor',
        inversion: 1,
        requireBass: true,
      }),
      makeBuildRound({
        rootPc: 2,
        rootDisplay: 'D',
        quality: 'major',
        inversion: 2,
        requireBass: true,
      }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },

  // ================= WORLD 4: TENSION (Levels 12-14) =================
  {
    id: 12,
    worldId: 4,
    worldTitle: 'Tension',
    kind: 'build',
    kindTag: 'Build',
    title: 'Diminished Triads',
    subtitle: 'Down-right lines of three (B, D, E)',
    briefing:
      'A diminished triad stacks two minor thirds (+3 and +3). Because down-right is a minor third on the Tonnetz, every diminished triad is a straight diagonal line of three touching notes going down-right.',
    staticRounds: [
      makeBuildRound({ rootPc: 11, rootDisplay: 'B', quality: 'diminished' }),
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'diminished' }),
      makeBuildRound({ rootPc: 4, rootDisplay: 'E', quality: 'diminished' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 13,
    worldId: 4,
    worldTitle: 'Tension',
    kind: 'build',
    kindTag: 'Build',
    title: 'Augmented Triads',
    subtitle: 'Up-right lines of three (C, D, Eb)',
    briefing:
      'An augmented triad stacks two major thirds (+4 and +4), dividing the octave into three equal parts. On the Tonnetz, an augmented triad forms a straight diagonal line of three touching notes going up-right.',
    staticRounds: [
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'augmented' }),
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'augmented' }),
      makeBuildRound({ rootPc: 3, rootDisplay: 'Eb', quality: 'augmented' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 14,
    worldId: 4,
    worldTitle: 'Tension',
    kind: 'build',
    kindTag: 'Build',
    title: 'Four Flavours Mixed',
    subtitle: 'Triangles and lines combined (5 rounds)',
    briefing:
      'Combine all four triad qualities: upward triangles for major, downward triangles for minor, down-right lines for diminished, and up-right lines for augmented.',
    staticRounds: [
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'major' }),
      makeBuildRound({ rootPc: 11, rootDisplay: 'B', quality: 'diminished' }),
      makeBuildRound({ rootPc: 3, rootDisplay: 'Eb', quality: 'augmented' }),
      makeBuildRound({ rootPc: 9, rootDisplay: 'A', quality: 'minor' }),
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'diminished' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },

  // ================= WORLD 5: EAR (Levels 15-20) =================
  {
    id: 15,
    worldId: 5,
    worldTitle: 'Ear',
    kind: 'earq',
    kindTag: 'Ear · Quality',
    title: 'Major or Minor',
    subtitle: 'Bright vs. warm-dark (6 rounds)',
    briefing:
      'Listen to each triad and decide whether it is major or minor. After you pick the right quality, watch its upward or downward triangle light up on the lattice.',
    generateRounds(grid = DEFAULT_GRID) {
      return generateEarQualityRounds(['major', 'minor'], 6, grid);
    },
  },
  {
    id: 16,
    worldId: 5,
    worldTitle: 'Ear',
    kind: 'earq',
    kindTag: 'Ear · Quality',
    title: 'Four Colours',
    subtitle: 'Major, minor, diminished, augmented (8 rounds)',
    briefing:
      'Distinguish all four triad qualities by ear: stable major, wistful minor, tense compact diminished, and dreamy wide augmented. Use the Listen button any time you want a replay.',
    generateRounds(grid = DEFAULT_GRID) {
      return generateEarQualityRounds(ALL_QUALITIES, 8, grid);
    },
  },
  {
    id: 17,
    worldId: 5,
    worldTitle: 'Ear',
    kind: 'earint',
    kindTag: 'Ear · Interval',
    title: 'Core Intervals',
    subtitle: 'm3, M3, P4, P5 (6 rounds)',
    briefing:
      'Two notes play one after the other and then together. Identify whether the distance is a minor third (m3), major third (M3), perfect fourth (P4), or perfect fifth (P5).',
    generateRounds() {
      return generateEarIntervalRounds([3, 4, 5, 7], 6);
    },
  },
  {
    id: 18,
    worldId: 5,
    worldTitle: 'Ear',
    kind: 'earint',
    kindTag: 'Ear · Interval',
    title: 'Wider Intervals',
    subtitle: 'Seconds, thirds, fourth/fifth, tritone & sixths (8 rounds)',
    briefing:
      'Expand your ear to include crunchy minor and major seconds (m2, M2), the restless tritone (TT), and expressive minor and major sixths (m6, M6) alongside the core intervals.',
    generateRounds() {
      return generateEarIntervalRounds([1, 2, 3, 4, 5, 6, 7, 8, 9], 8);
    },
  },
  {
    id: 19,
    worldId: 5,
    worldTitle: 'Ear',
    kind: 'earbuild',
    kindTag: 'Ear · Build',
    title: 'Build by Ear: Major & Minor',
    subtitle: 'Root given, quality by ear (5 rounds)',
    briefing:
      'You are given the chord root, while its quality is hidden. Listen carefully to tell whether the triad is major or minor, then build the connected triangle on the board.',
    generateRounds(grid = DEFAULT_GRID) {
      return generateEarBuildRounds(['major', 'minor'], 5, grid);
    },
  },
  {
    id: 20,
    worldId: 5,
    worldTitle: 'Ear',
    kind: 'earbuild',
    kindTag: 'Ear · Build',
    title: 'Build by Ear: All Four',
    subtitle: 'Triangles and lines by ear (6 rounds)',
    briefing:
      'The ultimate ear challenge: the root is named, and the chord could be major, minor, diminished, or augmented. Hear its colour and trace its triangle or line on the lattice.',
    generateRounds(grid = DEFAULT_GRID) {
      return generateEarBuildRounds(ALL_QUALITIES, 6, grid);
    },
  },

  // ================= WORLD 6: PROGRESSIONS (Levels 21-25) =================
  {
    id: 21,
    worldId: 6,
    worldTitle: 'Progressions',
    kind: 'progressions',
    kindTag: 'Progression',
    title: 'I–IV–V–I in C',
    subtitle: 'C – F – G – C',
    briefing:
      'On the Tonnetz, I, IV, and V sit right next to each other along the row of fifths. Build each chord in sequence and hear the full cadence play back at the end.',
    staticRounds: [
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'major', roman: 'I', keyName: 'C major' }),
      makeBuildRound({ rootPc: 5, rootDisplay: 'F', quality: 'major', roman: 'IV', keyName: 'C major' }),
      makeBuildRound({ rootPc: 7, rootDisplay: 'G', quality: 'major', roman: 'V', keyName: 'C major' }),
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'major', roman: 'I', keyName: 'C major' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 22,
    worldId: 6,
    worldTitle: 'Progressions',
    kind: 'progressions',
    kindTag: 'Progression',
    title: 'ii–V–I in G',
    subtitle: 'Am – D – G',
    briefing:
      'The ii–V–I turnaround is the backbone of jazz and classic harmony. Notice how A minor (ii), D major (V), and G major (I) form a compact cluster of neighboring triangles.',
    staticRounds: [
      makeBuildRound({ rootPc: 9, rootDisplay: 'A', quality: 'minor', roman: 'ii', keyName: 'G major' }),
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'major', roman: 'V', keyName: 'G major' }),
      makeBuildRound({ rootPc: 7, rootDisplay: 'G', quality: 'major', roman: 'I', keyName: 'G major' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 23,
    worldId: 6,
    worldTitle: 'Progressions',
    kind: 'progressions',
    kindTag: 'Progression',
    title: 'I–V–vi–IV in D',
    subtitle: 'D – A – Bm – G',
    briefing:
      'Build the timeless four-chord pop progression in D major. Watch how D major (I) and B minor (vi) share two common tones across a single shared edge.',
    staticRounds: [
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'major', roman: 'I', keyName: 'D major' }),
      makeBuildRound({ rootPc: 9, rootDisplay: 'A', quality: 'major', roman: 'V', keyName: 'D major' }),
      makeBuildRound({ rootPc: 11, rootDisplay: 'B', quality: 'minor', roman: 'vi', keyName: 'D major' }),
      makeBuildRound({ rootPc: 7, rootDisplay: 'G', quality: 'major', roman: 'IV', keyName: 'D major' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 24,
    worldId: 6,
    worldTitle: 'Progressions',
    kind: 'progressions',
    kindTag: 'Progression',
    title: 'i–bVI–bIII–bVII in A minor',
    subtitle: 'Am – F – C – G',
    briefing:
      'Explore natural minor harmony in A minor. Step from A minor (i) to F major (bVI), C major (bIII), and G major (bVII), tracing shared edges across the lattice.',
    staticRounds: [
      makeBuildRound({ rootPc: 9, rootDisplay: 'A', quality: 'minor', roman: 'i', keyName: 'A minor' }),
      makeBuildRound({ rootPc: 5, rootDisplay: 'F', quality: 'major', roman: 'bVI', keyName: 'A minor' }),
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'major', roman: 'bIII', keyName: 'A minor' }),
      makeBuildRound({ rootPc: 7, rootDisplay: 'G', quality: 'major', roman: 'bVII', keyName: 'A minor' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
  {
    id: 25,
    worldId: 6,
    worldTitle: 'Progressions',
    kind: 'progressions',
    kindTag: 'Progression',
    title: 'I–vi–ii–V in F',
    subtitle: 'F – Dm – Gm – C',
    briefing:
      'Finish your journey with the classic circle turnaround in F major: F major (I) folds into its relative minor D minor (vi), steps to G minor (ii), and resolves home through C major (V).',
    staticRounds: [
      makeBuildRound({ rootPc: 5, rootDisplay: 'F', quality: 'major', roman: 'I', keyName: 'F major' }),
      makeBuildRound({ rootPc: 2, rootDisplay: 'D', quality: 'minor', roman: 'vi', keyName: 'F major' }),
      makeBuildRound({ rootPc: 7, rootDisplay: 'G', quality: 'minor', roman: 'ii', keyName: 'F major' }),
      makeBuildRound({ rootPc: 0, rootDisplay: 'C', quality: 'major', roman: 'V', keyName: 'F major' }),
    ],
    generateRounds() {
      return [...this.staticRounds!];
    },
  },
];

export const WORLDS: readonly WorldDef[] = [
  {
    id: 1,
    title: '1. Steps',
    subtitle: 'Directions & intervals on the lattice',
    levels: LEVELS.filter((l) => l.worldId === 1),
  },
  {
    id: 2,
    title: '2. Triads',
    subtitle: 'Major & minor triangles',
    levels: LEVELS.filter((l) => l.worldId === 2),
  },
  {
    id: 3,
    title: '3. Inversions',
    subtitle: 'Bass note order & voicings',
    levels: LEVELS.filter((l) => l.worldId === 3),
  },
  {
    id: 4,
    title: '4. Tension',
    subtitle: 'Diminished & augmented lines',
    levels: LEVELS.filter((l) => l.worldId === 4),
  },
  {
    id: 5,
    title: '5. Ear',
    subtitle: 'Listen, identify & build by ear',
    levels: LEVELS.filter((l) => l.worldId === 5),
  },
  {
    id: 6,
    title: '6. Progressions',
    subtitle: 'Harmonic journeys across keys',
    levels: LEVELS.filter((l) => l.worldId === 6),
  },
];

export function getLevelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
