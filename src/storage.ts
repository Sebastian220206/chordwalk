/**
 * Storage module for Chordwalk.
 * Wrapped in try/catch to protect against private browsing / disabled storage.
 */

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  bestStars: number; // 0, 1, 2, or 3
  bestMistakes: number;
  completedAt?: number;
}

const STORAGE_KEY_PROGRESS = 'chordwalk_progress_v1';
const STORAGE_KEY_THEME = 'chordwalk_theme';

export function calculateStars(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export function loadAllProgress(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    console.warn('Could not read progress from localStorage:', e);
  }
  return {};
}

export function saveLevelResult(
  levelId: number,
  mistakes: number
): { stars: number; isNewBest: boolean } {
  const stars = calculateStars(mistakes);
  let isNewBest = false;

  try {
    const all = loadAllProgress();
    const existing = all[levelId];

    if (!existing) {
      all[levelId] = {
        levelId,
        completed: true,
        bestStars: stars,
        bestMistakes: mistakes,
        completedAt: Date.now(),
      };
      isNewBest = true;
    } else {
      // Better score if more stars, or same stars with fewer mistakes
      if (
        stars > existing.bestStars ||
        (stars === existing.bestStars && mistakes < existing.bestMistakes)
      ) {
        existing.bestStars = Math.max(existing.bestStars, stars);
        existing.bestMistakes = Math.min(existing.bestMistakes, mistakes);
        existing.completed = true;
        existing.completedAt = Date.now();
        isNewBest = true;
      }
    }

    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(all));
  } catch (e) {
    console.warn('Could not save progress to localStorage:', e);
  }

  return { stars, isNewBest };
}

export function getLevelProgress(levelId: number): LevelProgress | undefined {
  const all = loadAllProgress();
  return all[levelId];
}

export function loadSavedTheme(): 'light' | 'dark' | 'auto' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'auto';
}

export function saveTheme(theme: 'light' | 'dark' | 'auto'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch {
    // ignore
  }
}
