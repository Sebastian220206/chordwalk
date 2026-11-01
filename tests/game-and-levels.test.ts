import { describe, it, expect, beforeEach } from 'vitest';
import {
  LEVELS,
  WORLDS,
  getLevelById,
  getSolvableRoots,
  pickCentralNodeForPc,
} from '../src/levels';
import {
  calculateStars,
  loadAllProgress,
  saveLevelResult,
} from '../src/storage';
import {
  chordPitchClasses,
  findShape,
  generateGrid,
  identify,
  inversionBassPc,
  inversionLabel,
  mod12,
  noteName,
  pitchClassAt,
  voice,
} from '../src/theory';

describe('Level Definitions & World Structure', () => {
  it('defines exactly 25 levels across 6 worlds', () => {
    expect(LEVELS.length).toBe(25);
    expect(WORLDS.length).toBe(6);

    const worldIds = WORLDS.map((w) => w.id);
    expect(worldIds).toEqual([1, 2, 3, 4, 5, 6]);

    LEVELS.forEach((lvl, index) => {
      expect(lvl.id).toBe(index + 1);
      expect(lvl.title.length).toBeGreaterThan(0);
      expect(lvl.briefing.length).toBeGreaterThan(0);
      expect(getLevelById(lvl.id)).toBe(lvl);
    });
  });

  it('generates non-empty valid rounds for all 25 levels', () => {
    const grid = generateGrid();
    LEVELS.forEach((lvl) => {
      const rounds = lvl.generateRounds(grid);
      expect(rounds.length).toBeGreaterThanOrEqual(3);
      rounds.forEach((round) => {
        expect(round.eyebrow).toBeDefined();
        expect(round.title).toBeDefined();
        expect(round.instruction).toBeDefined();
      });
    });
  });

  it('picks central nodes correctly for interval prompts', () => {
    const grid = generateGrid();
    for (let pc = 0; pc < 12; pc++) {
      const node = pickCentralNodeForPc(pc, grid);
      expect(node.pc).toBe(pc);
      expect(node.row).toBeGreaterThanOrEqual(0);
      expect(node.row).toBeLessThanOrEqual(4);
    }
  });

  it('verifies that ear levels select solvable roots only', () => {
    const grid = generateGrid();
    // Test Level 15 (Major/Minor earq)
    const lvl15 = getLevelById(15)!;
    const r15 = lvl15.generateRounds(grid);
    expect(r15.length).toBe(6);
    r15.forEach((round) => {
      if (round.kind === 'earq') {
        const shape = findShape(round.rootPc, round.quality, grid);
        expect(shape).not.toBeNull();
      }
    });

    // Test Level 16 (Four colours earq)
    const lvl16 = getLevelById(16)!;
    const r16 = lvl16.generateRounds(grid);
    expect(r16.length).toBe(8);
    r16.forEach((round) => {
      if (round.kind === 'earq') {
        const shape = findShape(round.rootPc, round.quality, grid);
        expect(shape).not.toBeNull();
      }
    });

    // Test Level 19 & 20 (Build by ear)
    const lvl19 = getLevelById(19)!;
    lvl19.generateRounds(grid).forEach((round) => {
      if (round.kind === 'earbuild') {
        const shape = findShape(round.rootPc, round.quality, grid);
        expect(shape).not.toBeNull();
      }
    });

    const lvl20 = getLevelById(20)!;
    lvl20.generateRounds(grid).forEach((round) => {
      if (round.kind === 'earbuild') {
        const shape = findShape(round.rootPc, round.quality, grid);
        expect(shape).not.toBeNull();
      }
    });
  });
});

describe('Inversions & Voicing Logic', () => {
  it('correctly calculates bass pitch classes for root position, 1st and 2nd inversions', () => {
    // C Major (0, 4, 7)
    expect(inversionBassPc(0, 'major', 0)).toBe(0); // C
    expect(inversionBassPc(0, 'major', 1)).toBe(4); // E
    expect(inversionBassPc(0, 'major', 2)).toBe(7); // G

    // A Minor (9, 0, 4)
    expect(inversionBassPc(9, 'minor', 0)).toBe(9); // A
    expect(inversionBassPc(9, 'minor', 1)).toBe(0); // C
    expect(inversionBassPc(9, 'minor', 2)).toBe(4); // E

    // Labels
    expect(inversionLabel(0)).toContain('Root');
    expect(inversionLabel(1)).toContain('1st inversion');
    expect(inversionLabel(2)).toContain('2nd inversion');
  });

  it('voices chords ascending above the bass', () => {
    // F Major in 1st inversion: bass is A (69), upper voices are C (72) and F (77)
    const fMajorPcs = chordPitchClasses(5, 'major'); // [5, 9, 0]
    const bassA = 9;
    const voiced = voice(fMajorPcs, bassA);
    expect(voiced[0]).toBe(69); // A4
    expect(voiced[1]).toBe(72); // C5
    expect(voiced[2]).toBe(77); // F5
    // Strictly ascending
    expect(voiced[0]).toBeLessThan(voiced[1]);
    expect(voiced[1]).toBeLessThan(voiced[2]);
  });
});

describe('Progression Levels (World 6)', () => {
  const grid = generateGrid();

  it('checks Level 21: I-IV-V-I in C', () => {
    const lvl21 = getLevelById(21)!;
    const rounds = lvl21.generateRounds(grid);
    expect(rounds.length).toBe(4);
    const chords = rounds.map((r: any) => `${noteName(r.rootPc)} ${r.quality}`);
    expect(chords).toEqual(['C major', 'F major', 'G major', 'C major']);
  });

  it('checks Level 22: ii-V-I in G', () => {
    const lvl22 = getLevelById(22)!;
    const rounds = lvl22.generateRounds(grid);
    expect(rounds.length).toBe(3);
    const chords = rounds.map((r: any) => `${noteName(r.rootPc)} ${r.quality}`);
    expect(chords).toEqual(['A minor', 'D major', 'G major']);
  });

  it('checks Level 23: I-V-vi-IV in D', () => {
    const lvl23 = getLevelById(23)!;
    const rounds = lvl23.generateRounds(grid);
    expect(rounds.length).toBe(4);
    const chords = rounds.map((r: any) => `${noteName(r.rootPc)} ${r.quality}`);
    expect(chords).toEqual(['D major', 'A major', 'B minor', 'G major']);
  });

  it('checks Level 24: i-bVI-bIII-bVII in A minor', () => {
    const lvl24 = getLevelById(24)!;
    const rounds = lvl24.generateRounds(grid);
    expect(rounds.length).toBe(4);
    const chords = rounds.map((r: any) => `${noteName(r.rootPc)} ${r.quality}`);
    expect(chords).toEqual(['A minor', 'F major', 'C major', 'G major']);
  });

  it('checks Level 25: I-vi-ii-V in F', () => {
    const lvl25 = getLevelById(25)!;
    const rounds = lvl25.generateRounds(grid);
    expect(rounds.length).toBe(4);
    const chords = rounds.map((r: any) => `${noteName(r.rootPc)} ${r.quality}`);
    expect(chords).toEqual(['F major', 'D minor', 'G minor', 'C major']);
  });
});

describe('Scoring and Progress Storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  it('calculates stars per acceptance criteria: 3 for 0 mistakes, 2 for 1-2, 1 otherwise', () => {
    expect(calculateStars(0)).toBe(3);
    expect(calculateStars(1)).toBe(2);
    expect(calculateStars(2)).toBe(2);
    expect(calculateStars(3)).toBe(1);
    expect(calculateStars(10)).toBe(1);
  });

  it('saves and updates level progress in localStorage', () => {
    const res1 = saveLevelResult(1, 3);
    expect(res1.stars).toBe(1);
    expect(res1.isNewBest).toBe(true);

    let progress = loadAllProgress();
    expect(progress[1].bestStars).toBe(1);
    expect(progress[1].bestMistakes).toBe(3);

    // Better attempt: 1 mistake -> 2 stars
    const res2 = saveLevelResult(1, 1);
    expect(res2.stars).toBe(2);
    expect(res2.isNewBest).toBe(true);

    progress = loadAllProgress();
    expect(progress[1].bestStars).toBe(2);
    expect(progress[1].bestMistakes).toBe(1);

    // Flawless attempt: 0 mistakes -> 3 stars
    const res3 = saveLevelResult(1, 0);
    expect(res3.stars).toBe(3);
    expect(res3.isNewBest).toBe(true);

    progress = loadAllProgress();
    expect(progress[1].bestStars).toBe(3);
    expect(progress[1].bestMistakes).toBe(0);

    // Worse attempt does not overwrite best
    const res4 = saveLevelResult(1, 5);
    expect(res4.isNewBest).toBe(false);

    progress = loadAllProgress();
    expect(progress[1].bestStars).toBe(3);
    expect(progress[1].bestMistakes).toBe(0);
  });
});
