import { describe, it, expect } from 'vitest';
import {
  pitchClassAt,
  upwardTriangleAt,
  downwardTriangleAt,
  identify,
  findShape,
  generateGrid,
  connected,
  areAdjacent,
  voice,
  chordPitchClasses,
  noteName,
  mod12,
} from '../src/theory';
import { LEVELS, BuildRound, getSolvableRoots } from '../src/levels';

describe('Music Theory & Tonnetz Math', () => {
  it('computes pitch class = (7x + 4y) mod 12 correctly', () => {
    expect(pitchClassAt(0, 0)).toBe(0); // C
    expect(pitchClassAt(1, 0)).toBe(7); // G (right = +7)
    expect(pitchClassAt(0, 1)).toBe(4); // E (up-right = +4)
    expect(pitchClassAt(1, -1)).toBe(3); // Eb/D# (down-right = +3)
  });

  it('yields C-G-E for upward triangle at the origin and C-A-E for matching downward triangle', () => {
    // Upward triangle at (0, 0): (0,0), (1,0), (0,1)
    const upCoords = upwardTriangleAt(0, 0);
    const upPcs = upCoords.map((c) => pitchClassAt(c.x, c.y));
    expect(upPcs).toEqual([0, 7, 4]); // C, G, E
    expect(upPcs.map((pc) => noteName(pc))).toEqual(['C', 'G', 'E']);

    // Matching downward triangle: (0,0), (-1,1), (0,1)
    const downCoords = downwardTriangleAt(0, 0);
    const downPcs = downCoords.map((c) => pitchClassAt(c.x, c.y));
    expect(downPcs).toEqual([0, 9, 4]); // C, A, E
    expect(downPcs.map((pc) => noteName(pc))).toEqual(['C', 'A', 'E']);
  });

  it('identify() names all four triad qualities: major, minor, diminished, augmented', () => {
    // Major: C - E - G (0, 4, 7)
    const majorChord = identify([0, 4, 7]);
    expect(majorChord).not.toBeNull();
    expect(majorChord?.quality).toBe('major');
    expect(majorChord?.root).toBe(0);
    expect(majorChord?.name).toBe('C major');

    // Minor: A - C - E (9, 0, 4)
    const minorChord = identify([9, 0, 4]);
    expect(minorChord).not.toBeNull();
    expect(minorChord?.quality).toBe('minor');
    expect(minorChord?.root).toBe(9);
    expect(minorChord?.name).toBe('A minor');

    // Diminished: B - D - F (11, 2, 5)
    const dimChord = identify([11, 2, 5]);
    expect(dimChord).not.toBeNull();
    expect(dimChord?.quality).toBe('diminished');
    expect(dimChord?.root).toBe(11);
    expect(dimChord?.name).toBe('B diminished');

    // Augmented: C - E - G# (0, 4, 8)
    const augChord = identify([0, 4, 8]);
    expect(augChord).not.toBeNull();
    expect(augChord?.quality).toBe('augmented');
    expect(augChord?.root).toBe(0);
    expect(augChord?.name).toBe('C augmented');

    // Works with any permutation
    expect(identify([4, 7, 0])?.quality).toBe('major');
    expect(identify([7, 0, 4])?.quality).toBe('major');
    expect(identify([2, 11, 5])?.quality).toBe('diminished');
  });

  it('verifies adjacency and connected() logic', () => {
    // (0,0) and (1,0) differ by (1,0) -> adjacent
    expect(areAdjacent({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
    // (0,0) and (0,1) differ by (0,1) -> adjacent
    expect(areAdjacent({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(true);
    // (0,0) and (1,-1) differ by (1,-1) -> adjacent
    expect(areAdjacent({ x: 0, y: 0 }, { x: 1, y: -1 })).toBe(true);
    // (0,0) and (2,0) -> not adjacent
    expect(areAdjacent({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);

    // Triangle of 3 nodes: all 3 pairs adjacent -> connected
    expect(
      connected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ])
    ).toBe(true);

    // Line of 3 nodes: (0,0)-(1,-1)-(2,-2) has 2 adjacent pairs -> connected
    expect(
      connected([
        { x: 0, y: 0 },
        { x: 1, y: -1 },
        { x: 2, y: -2 },
      ])
    ).toBe(true);

    // Disconnected: 3 isolated nodes
    expect(
      connected([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
      ])
    ).toBe(false);
  });

  it('voices chords starting from the bass note with ascending upper voices', () => {
    // C major root position: C (60), E (64), G (67)
    expect(voice([0, 4, 7], 0)).toEqual([60, 64, 67]);

    // C major 1st inversion: E (64) in bass, G (67), C (72)
    expect(voice([0, 4, 7], 4)).toEqual([64, 67, 72]);

    // C major 2nd inversion: G (67) in bass, C (72), E (76)
    expect(voice([0, 4, 7], 7)).toEqual([67, 72, 76]);
  });

  it('verifies that the 6x5 grid has 30 nodes and proper row offsets', () => {
    const grid = generateGrid(6, 5, 80);
    expect(grid.length).toBe(30);

    // Row 0: xStart = -floor(0/2) = 0 -> x from 0 to 5
    const row0 = grid.filter((n) => n.row === 0);
    expect(row0.map((n) => n.x)).toEqual([0, 1, 2, 3, 4, 5]);

    // Row 1: xStart = -floor(1/2) = 0 -> x from 0 to 5
    const row1 = grid.filter((n) => n.row === 1);
    expect(row1.map((n) => n.x)).toEqual([0, 1, 2, 3, 4, 5]);

    // Row 2: xStart = -floor(2/2) = -1 -> x from -1 to 4
    const row2 = grid.filter((n) => n.row === 2);
    expect(row2.map((n) => n.x)).toEqual([-1, 0, 1, 2, 3, 4]);

    // Row 3: xStart = -floor(3/2) = -1 -> x from -1 to 4
    const row3 = grid.filter((n) => n.row === 3);
    expect(row3.map((n) => n.x)).toEqual([-1, 0, 1, 2, 3, 4]);

    // Row 4: xStart = -floor(4/2) = -2 -> x from -2 to 3
    const row4 = grid.filter((n) => n.row === 4);
    expect(row4.map((n) => n.x)).toEqual([-2, -1, 0, 1, 2, 3]);
  });
});

describe('Every chord target in every build level is solvable on the board', () => {
  const grid = generateGrid();

  it('has solvable roots for all four qualities', () => {
    for (const quality of ['major', 'minor', 'diminished', 'augmented'] as const) {
      const solvable = getSolvableRoots(quality, grid);
      expect(solvable.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('finds a valid connected shape on the grid for every static build target across all levels', () => {
    for (const level of LEVELS) {
      const rounds = level.generateRounds(grid);
      for (const round of rounds) {
        if (round.kind === 'build' || round.kind === 'earbuild') {
          const shape = findShape(round.rootPc, round.quality, grid);
          expect(
            shape,
            `Shape for level ${level.id} (${level.title}), chord ${noteName(round.rootPc)} ${round.quality} must exist on the board`
          ).not.toBeNull();

          if (shape) {
            expect(connected(shape)).toBe(true);
            const pcs = shape.map((n) => n.pc);
            const targetPcs = chordPitchClasses(round.rootPc, round.quality);
            expect(pcs.sort()).toEqual(targetPcs.sort());
          }
        }
      }
    }
  });
});
