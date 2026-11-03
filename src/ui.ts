import { audio } from './audio';
import { TonnetzBoard } from './board';
import {
  GameController,
  PromptData,
  ProgressionChip,
  AnswerButton,
  LevelResult,
} from './game';
import { getLevelById, LevelDef, WORLDS } from './levels';
import {
  loadAllProgress,
  loadSavedTheme,
  saveTheme,
  LevelProgress,
} from './storage';
import { spawnNodeSparkles, spawnVictoryConfetti, tryVibrate } from './vfx';

const WORLD_THEMES: Record<
  number,
  { name: string; icon: string; subtitle: string; badgeClass: string }
> = {
  1: {
    name: 'Steps Meadow',
    icon: '🌿',
    subtitle: 'Directions & intervals on the lattice',
    badgeClass: 'biome-meadow',
  },
  2: {
    name: 'Triad Canyon',
    icon: '⛰️',
    subtitle: 'Major & minor harmony triangles',
    badgeClass: 'biome-canyon',
  },
  3: {
    name: 'Inversion Lagoon',
    icon: '🌊',
    subtitle: 'Bass note voicings & orders',
    badgeClass: 'biome-lagoon',
  },
  4: {
    name: 'Tension Volcano',
    icon: '🌋',
    subtitle: 'Diminished & augmented diagonals',
    badgeClass: 'biome-volcano',
  },
  5: {
    name: 'Ear Observatory',
    icon: '🔭',
    subtitle: 'Listen, identify & build by ear',
    badgeClass: 'biome-observatory',
  },
  6: {
    name: 'Progression Palace',
    icon: '🏰',
    subtitle: 'Harmonic journeys across keys',
    badgeClass: 'biome-palace',
  },
};

export class UIManager {
  private root: HTMLElement;
  private currentTheme: 'light' | 'dark' | 'auto';
  private gameController: GameController | null = null;
  private board: TonnetzBoard | null = null;
  private currentActiveLevel: LevelDef | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.currentTheme = loadSavedTheme();
    this.applyTheme(this.currentTheme);
  }

  public init(): void {
    this.renderHome();
  }

  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.currentTheme = theme;
    saveTheme(theme);

    const doc = document.documentElement;
    if (theme === 'auto') {
      doc.removeAttribute('data-theme');
    } else {
      doc.setAttribute('data-theme', theme);
    }
  }

  private toggleTheme(): void {
    const isDark =
      this.currentTheme === 'dark' ||
      (this.currentTheme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.applyTheme(isDark ? 'light' : 'dark');
    this.updateThemeButtons();
  }

  private updateThemeButtons(): void {
    const btns = this.root.querySelectorAll('.theme-toggle-btn');
    const isDark =
      this.currentTheme === 'dark' ||
      (this.currentTheme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    btns.forEach((btn) => {
      btn.innerHTML = isDark ? this.sunIconSvg() : this.moonIconSvg();
      btn.setAttribute(
        'aria-label',
        isDark ? 'Switch to daylight theme' : 'Switch to starlight theme'
      );
    });
  }

  private updateSoundButtons(): void {
    const btns = this.root.querySelectorAll('.sound-toggle-btn');
    const isMuted = audio.isMuted;
    btns.forEach((btn) => {
      btn.innerHTML = isMuted ? this.volumeMuteIconSvg() : this.volumeUpIconSvg();
      btn.setAttribute(
        'aria-label',
        isMuted ? 'Turn sound on' : 'Turn sound off'
      );
    });
  }

  // ==========================================================================
  // RENDER HOME SCREEN — SAGA TRAIL MAP
  // ==========================================================================
  public renderHome(): void {
    const progress = loadAllProgress();
    const isDark =
      this.currentTheme === 'dark' ||
      (this.currentTheme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Find next uncompleted level
    let nextLevelId = 1;
    let totalStarsEarned = 0;
    for (let id = 1; id <= 25; id++) {
      if (progress[id]?.bestStars) {
        totalStarsEarned += progress[id].bestStars;
      }
      if (!progress[id]?.completed && nextLevelId === 1 && id !== 1) {
        nextLevelId = id;
      }
    }
    // If not set yet, pick first uncompleted
    for (let id = 1; id <= 25; id++) {
      if (!progress[id]?.completed) {
        nextLevelId = id;
        break;
      }
    }
    const nextLevel = getLevelById(nextLevelId) ?? getLevelById(1)!;

    this.root.innerHTML = `
      <header class="app-header" role="banner">
        <div class="brand-wrap">
          <div class="brand-gem-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 2 22 22 22 12 2"></polygon>
            </svg>
          </div>
          <div class="brand-text-block">
            <span class="brand-title">CHORDWALK</span>
            <span class="brand-tagline">Harmonic Candy Saga</span>
          </div>
        </div>

        <div class="header-star-counter" aria-label="${totalStarsEarned} out of 75 stars earned">
          <svg class="star-icon filled" viewBox="0 0 24 24" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="star-counter-digits">${totalStarsEarned} / 75</span>
        </div>

        <div class="header-actions">
          <button class="btn-3d icon-btn guide-toggle-btn" id="btn-header-guide" aria-label="Open Tonnetz Lattice Guide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
          <button class="btn-3d icon-btn sound-toggle-btn" aria-label="${audio.isMuted ? 'Turn sound on' : 'Turn sound off'}">
            ${audio.isMuted ? this.volumeMuteIconSvg() : this.volumeUpIconSvg()}
          </button>
          <button class="btn-3d icon-btn theme-toggle-btn" aria-label="${isDark ? 'Switch to daylight theme' : 'Switch to starlight theme'}">
            ${isDark ? this.sunIconSvg() : this.moonIconSvg()}
          </button>
        </div>
      </header>

      <main class="home-saga-view" role="main">
        <!-- Hero Banner Card -->
        <section class="saga-hero-card" aria-labelledby="hero-title">
          <div class="hero-badge-pill">25 HARMONIC CHALLENGES</div>
          <h1 id="hero-title" class="saga-hero-title">Harmonic Lattice Saga</h1>
          <p class="saga-hero-desc">
            Journey across 6 harmonic kingdoms. Connect triangles, tap inversions, and crush ear-training puzzles on the Tonnetz grid!
          </p>
        </section>

        <!-- Winding Saga Trail -->
        <section class="saga-trail-container" aria-label="World Map Levels">
          ${WORLDS.map((world) => this.renderSagaWorld(world, progress, nextLevelId)).join('')}
        </section>
      </main>

      <!-- Sticky Bottom Play Bar -->
      <nav class="saga-sticky-footer" role="navigation" aria-label="Quick Actions">
        <button class="btn-3d btn-guide-footer" id="btn-footer-guide">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Lattice Guide</span>
        </button>

        <button class="btn-3d btn-primary-play" id="btn-play-continue">
          <span class="btn-play-label">
            ${progress[nextLevelId]?.completed ? 'PLAY LEVEL ' + nextLevelId : 'PLAY LEVEL ' + nextLevelId}
          </span>
          <svg class="play-arrow-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      </nav>
    `;

    this.bindHomeEvents(nextLevel);
  }

  private renderSagaWorld(
    world: (typeof WORLDS)[number],
    progress: Record<number, LevelProgress>,
    nextLevelId: number
  ): string {
    const biome = WORLD_THEMES[world.id] || {
      name: world.title,
      icon: '🎵',
      subtitle: world.subtitle,
      badgeClass: 'biome-meadow',
    };

    return `
      <div class="saga-world-section ${biome.badgeClass}">
        <div class="saga-world-banner">
          <div class="world-banner-icon">${biome.icon}</div>
          <div class="world-banner-info">
            <h2 class="world-banner-title">World ${world.id}: ${biome.name}</h2>
            <span class="world-banner-sub">${biome.subtitle}</span>
          </div>
        </div>

        <div class="saga-nodes-track">
          ${world.levels
            .map((lvl, index) => {
              const res = progress[lvl.id];
              const stars = res ? res.bestStars : 0;
              const isNext = lvl.id === nextLevelId;
              const isComplete = Boolean(res?.completed);

              // Winding path offset classes: alternate left / center / right
              const positionClasses = ['pos-center', 'pos-right', 'pos-center', 'pos-left'];
              const posClass = positionClasses[index % positionClasses.length];

              return `
                <div class="saga-node-wrapper ${posClass}">
                  ${isNext ? '<div class="saga-next-crown" aria-hidden="true">👑<span>NEXT</span></div>' : ''}
                  
                  <button class="saga-level-gem btn-3d ${isComplete ? 'is-cleared' : ''} ${isNext ? 'is-next' : ''}" 
                          data-level-id="${lvl.id}"
                          aria-label="Level ${lvl.id}: ${lvl.title}. ${stars} of 3 stars earned.">
                    <span class="saga-gem-number">${lvl.id}</span>
                    <span class="saga-gem-kind">${lvl.kindTag}</span>
                    
                    <div class="saga-gem-ribbon">
                      ${this.renderMiniStars(stars)}
                    </div>
                  </button>

                  <div class="saga-node-caption">
                    <span class="saga-caption-title">${lvl.title}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private renderMiniStars(count: number): string {
    let out = '';
    for (let i = 1; i <= 3; i++) {
      out += `
        <svg class="mini-star-icon ${i <= count ? 'filled' : ''}" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;
    }
    return out;
  }

  private bindHomeEvents(nextLevel: LevelDef): void {
    // Sound toggle
    this.root.querySelector('.sound-toggle-btn')?.addEventListener('click', () => {
      audio.ensureContext();
      audio.toggleMute();
      this.updateSoundButtons();
    });

    // Theme toggle
    this.root.querySelector('.theme-toggle-btn')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Guide drawer
    this.root.querySelector('#btn-header-guide')?.addEventListener('click', () => {
      this.showGuideModal();
    });
    this.root.querySelector('#btn-footer-guide')?.addEventListener('click', () => {
      this.showGuideModal();
    });

    // Play/Continue button
    this.root.querySelector('#btn-play-continue')?.addEventListener('click', () => {
      audio.ensureContext();
      this.showBriefing(nextLevel);
    });

    // Individual Level Gem Buttons
    this.root.querySelectorAll('.saga-level-gem').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.ensureContext();
        const id = parseInt(btn.getAttribute('data-level-id') || '1', 10);
        const lvl = getLevelById(id);
        if (lvl) {
          this.showBriefing(lvl);
        }
      });
    });
  }

  // ==========================================================================
  // INTERACTIVE GUIDE MODAL SHEET
  // ==========================================================================
  public showGuideModal(): void {
    audio.ensureContext();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'guide-modal-title');

    modal.innerHTML = `
      <div class="modal-card guide-modal-sheet">
        <div class="modal-header-row">
          <div class="guide-modal-tag">TONNETZ LATTICE MASTER CLASS</div>
          <button class="btn-3d icon-btn modal-close-btn" id="btn-close-guide" aria-label="Close Guide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <h2 id="guide-modal-title" class="modal-title">Harmonic Geometry Key</h2>
        <p class="modal-body-text">
          Every note on the board connects geometrically to its harmonic relatives:
        </p>

        <div class="guide-grid">
          <div class="guide-card">
            <span class="guide-badge dir-right">→ Right</span>
            <div class="guide-card-content">
              <strong>Perfect Fifth (+7)</strong>
              <p>Move 1 node straight right. C → G, G → D, D → A.</p>
            </div>
          </div>

          <div class="guide-card">
            <span class="guide-badge dir-upright">↗ Up-Right</span>
            <div class="guide-card-content">
              <strong>Major Third (+4)</strong>
              <p>Step up & right. C → E, E → G#, Ab → C.</p>
            </div>
          </div>

          <div class="guide-card">
            <span class="guide-badge dir-downright">↘ Down-Right</span>
            <div class="guide-card-content">
              <strong>Minor Third (+3)</strong>
              <p>Step down & right. A → C, C → Eb, Eb → F#.</p>
            </div>
          </div>

          <div class="guide-card">
            <span class="guide-badge shape-major">▲ Major Triad</span>
            <div class="guide-card-content">
              <strong>Warm Amber Triangle</strong>
              <p>Upward triangle: Root (bottom-left), 5th (bottom-right), 3rd (apex).</p>
            </div>
          </div>

          <div class="guide-card">
            <span class="guide-badge shape-minor">▼ Minor Triad</span>
            <div class="guide-card-content">
              <strong>Cool Blue Triangle</strong>
              <p>Downward triangle: Root (top-left), 5th (top-right), 3rd (bottom).</p>
            </div>
          </div>

          <div class="guide-card">
            <span class="guide-badge shape-dim">●●● Diminished</span>
            <div class="guide-card-content">
              <strong>Rose Diagonal Line</strong>
              <p>Three notes in a row down-right (+3 and +3 stacked).</p>
            </div>
          </div>

          <div class="guide-card">
            <span class="guide-badge shape-aug">●●● Augmented</span>
            <div class="guide-card-content">
              <strong>Violet Diagonal Line</strong>
              <p>Three notes in a row up-right (+4 and +4 stacked).</p>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-3d btn-primary-play" id="btn-guide-gotit">Got It!</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#btn-close-guide')?.addEventListener('click', close);
    modal.querySelector('#btn-guide-gotit')?.addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  // ==========================================================================
  // BRIEFING MISSION MODAL
  // ==========================================================================
  public showBriefing(level: LevelDef): void {
    this.currentActiveLevel = level;
    const biome = WORLD_THEMES[level.worldId] || { icon: '🎵', name: level.worldTitle };

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'briefing-title');

    modal.innerHTML = `
      <div class="modal-card briefing-mission-card">
        <div class="mission-world-pill">
          <span>${biome.icon} World ${level.worldId} · ${biome.name}</span>
        </div>
        
        <span class="modal-eyebrow">Level ${level.id} · ${level.kindTag} Mission</span>
        <h2 id="briefing-title" class="modal-title">${level.title}</h2>
        <p class="modal-body-text">${level.briefing}</p>

        <div class="mission-rewards-preview">
          <div class="reward-pill">
            <svg class="star-icon filled" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>Goal: 3 Stars (0 mistakes)</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-3d control-btn" id="btn-briefing-map">Map</button>
          <button class="btn-3d btn-primary-play" id="btn-briefing-start">START!</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const startBtn = modal.querySelector('#btn-briefing-start') as HTMLButtonElement;
    startBtn.focus();

    modal.querySelector('#btn-briefing-start')?.addEventListener('click', () => {
      audio.ensureContext();
      modal.remove();
      this.renderGame(level);
    });

    modal.querySelector('#btn-briefing-map')?.addEventListener('click', () => {
      modal.remove();
      this.renderHome();
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      }
    });
  }

  // ==========================================================================
  // GAME VIEW — CANDY CRUSH ARCADE HUD
  // ==========================================================================
  public renderGame(level: LevelDef): void {
    this.currentActiveLevel = level;
    const isDark =
      this.currentTheme === 'dark' ||
      (this.currentTheme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    this.root.innerHTML = `
      <header class="game-top-bar" role="banner">
        <div class="top-bar-left">
          <button class="btn-3d back-map-btn" id="btn-game-map" aria-label="Return to saga map">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Map</span>
          </button>
        </div>

        <!-- 3-Star Mistake Shield & Progress Meter -->
        <div class="top-bar-center arcade-meter-wrap">
          <div class="arcade-progress-track">
            <div class="arcade-progress-fill" id="arcade-progress-fill" style="width: 0%;"></div>
          </div>
          <div class="arcade-star-shields" id="arcade-star-shields" aria-label="3 stars remaining">
            <span class="shield-star active" id="shield-star-1">★</span>
            <span class="shield-star active" id="shield-star-2">★</span>
            <span class="shield-star active" id="shield-star-3">★</span>
          </div>
          <span class="arcade-round-digits" id="arcade-round-digits">1 / 3</span>
        </div>

        <div class="top-bar-right">
          <button class="btn-3d icon-btn guide-toggle-btn" id="btn-game-guide" aria-label="Open Tonnetz Lattice Guide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
          <button class="btn-3d icon-btn sound-toggle-btn" aria-label="${audio.isMuted ? 'Turn sound on' : 'Turn sound off'}">
            ${audio.isMuted ? this.volumeMuteIconSvg() : this.volumeUpIconSvg()}
          </button>
          <button class="btn-3d icon-btn theme-toggle-btn" aria-label="${isDark ? 'Switch to daylight theme' : 'Switch to starlight theme'}">
            ${isDark ? this.sunIconSvg() : this.moonIconSvg()}
          </button>
        </div>
      </header>

      <main class="game-view" role="main">
        <div class="game-layout-split">
          <!-- Board Container -->
          <div class="game-board-pane">
            <div id="board-mount" class="tonnetz-board-container"></div>
          </div>

          <!-- Prompt & Control Panel -->
          <div class="game-panel-pane">
            <div class="prompt-card candy-target-card" aria-live="polite">
              <div class="prompt-meta">
                <span class="prompt-eyebrow" id="prompt-eyebrow">Level ${level.id} · ${level.kindTag}</span>
                <span class="level-indicator-pill">${level.title}</span>
              </div>

              <h1 class="prompt-title" id="prompt-title">${level.title}</h1>
              <p class="prompt-instruction" id="prompt-instruction">Tap nodes to explore.</p>

              <!-- Progression chips (if progressions) -->
              <div class="progression-chips-row" id="progression-chips" style="display: none;"></div>

              <!-- Answer buttons (if earq or earint) -->
              <div class="answer-buttons-grid" id="answer-buttons-grid" style="display: none;"></div>

              <!-- Feedback live line -->
              <div class="feedback-line status-info" id="feedback-line" role="status" aria-live="polite"></div>

              <!-- Booster-Style Action Controls -->
              <div class="game-controls-row booster-actions-bar">
                <button class="btn-3d booster-btn booster-listen" id="btn-hear-target" title="Replay the sound">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  <span>Hear It</span>
                </button>

                <button class="btn-3d booster-btn booster-hint" id="btn-hint" title="Pulse root note (no penalty)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 18h6"></path>
                    <path d="M10 22h4"></path>
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
                  </svg>
                  <span>Hint</span>
                </button>

                <button class="btn-3d booster-btn booster-clear" id="btn-clear" title="Clear current selection">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;

    // Instantiate Board
    const boardMount = this.root.querySelector('#board-mount') as HTMLElement;
    this.board = new TonnetzBoard(boardMount);

    // Instantiate Game Controller with UI callbacks
    this.gameController = new GameController(this.board, {
      onPromptUpdate: (prompt) => this.handlePromptUpdate(prompt),
      onFeedback: (text, status) => this.handleFeedback(text, status),
      onProgressionChipsUpdate: (chips) => this.handleProgressionChips(chips),
      onAnswerButtonsUpdate: (buttons) => this.handleAnswerButtons(buttons),
      onLevelComplete: (result) => this.showResults(result),
    });

    this.bindGameEvents();
    this.gameController.startLevel(level);
  }

  private bindGameEvents(): void {
    // Back to map
    this.root.querySelector('#btn-game-map')?.addEventListener('click', () => {
      this.renderHome();
    });

    // Sound toggle
    this.root.querySelectorAll('.sound-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.ensureContext();
        audio.toggleMute();
        this.updateSoundButtons();
      });
    });

    // Theme toggle
    this.root.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.toggleTheme();
      });
    });

    // Guide drawer
    this.root.querySelector('#btn-game-guide')?.addEventListener('click', () => {
      this.showGuideModal();
    });

    // Action booster buttons
    this.root.querySelector('#btn-hear-target')?.addEventListener('click', () => {
      audio.ensureContext();
      this.gameController?.hearTarget();
    });

    this.root.querySelector('#btn-hint')?.addEventListener('click', () => {
      this.gameController?.requestHint();
    });

    this.root.querySelector('#btn-clear')?.addEventListener('click', () => {
      this.gameController?.clearBoard();
    });
  }

  private handlePromptUpdate(prompt: PromptData): void {
    const eyebrow = this.root.querySelector('#prompt-eyebrow');
    const title = this.root.querySelector('#prompt-title');
    const instruction = this.root.querySelector('#prompt-instruction');
    const btnHint = this.root.querySelector('#btn-hint') as HTMLElement;
    const btnClear = this.root.querySelector('#btn-clear') as HTMLElement;

    // Arcade progress bar & star shields
    const progressFill = this.root.querySelector('#arcade-progress-fill') as HTMLElement;
    const roundDigits = this.root.querySelector('#arcade-round-digits');
    const starShields = this.root.querySelector('#arcade-star-shields');

    const percent = Math.min(
      100,
      Math.max(0, ((prompt.roundIndex - 1) / prompt.totalRounds) * 100)
    );
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (roundDigits) roundDigits.textContent = `${prompt.roundIndex} / ${prompt.totalRounds}`;

    // Update 3-star shields based on mistakes
    // 0 mistakes = 3 stars, 1-2 mistakes = 2 stars, 3+ mistakes = 1 star
    if (starShields) {
      const s1 = starShields.querySelector('#shield-star-1');
      const s2 = starShields.querySelector('#shield-star-2');
      const s3 = starShields.querySelector('#shield-star-3');

      s1?.classList.toggle('active', true);
      s2?.classList.toggle('active', prompt.mistakes <= 2);
      s3?.classList.toggle('active', prompt.mistakes === 0);
    }

    if (eyebrow) eyebrow.textContent = prompt.eyebrow;
    if (title) title.textContent = prompt.title;
    if (instruction) instruction.textContent = prompt.instruction;

    if (btnHint) btnHint.style.display = prompt.canHint ? 'inline-flex' : 'none';
    if (btnClear) btnClear.style.display = prompt.canClear ? 'inline-flex' : 'none';
  }

  private handleFeedback(text: string, status: 'info' | 'success' | 'error'): void {
    const el = this.root.querySelector('#feedback-line') as HTMLElement;
    if (!el) return;
    el.className = `feedback-line status-${status}`;
    el.textContent = text;
  }

  private handleProgressionChips(chips: ProgressionChip[]): void {
    const container = this.root.querySelector('#progression-chips') as HTMLElement;
    if (!container) return;

    if (chips.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = chips
      .map((chip) => {
        const classes = [
          'prog-chip',
          'btn-3d',
          chip.isCurrent ? 'is-current' : '',
          chip.isCompleted ? 'is-completed' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const label = chip.name ? `${chip.roman}: ${chip.name}` : chip.roman;
        return `<span class="${classes}">${label}</span>`;
      })
      .join('');
  }

  private handleAnswerButtons(buttons: AnswerButton[] | null): void {
    const container = this.root.querySelector('#answer-buttons-grid') as HTMLElement;
    if (!container) return;

    if (!buttons || buttons.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'grid';
    container.innerHTML = buttons
      .map(
        (btn) => `
        <button class="btn-3d answer-choice-btn" data-answer-value="${btn.value}">
          ${btn.label}
        </button>
      `
      )
      .join('');

    container.querySelectorAll('.answer-choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.ensureContext();
        const val = btn.getAttribute('data-answer-value');
        if (val) {
          this.gameController?.handleAnswerButtonClick(val);
        }
      });
    });
  }

  // ==========================================================================
  // RESULTS / VICTORY MODAL WITH STAR SLAM-IN
  // ==========================================================================
  public showResults(result: LevelResult): void {
    const praiseTitle =
      result.stars === 3
        ? 'Harmonic Master!'
        : result.stars === 2
          ? 'Sweet Harmony!'
          : 'Level Cleared!';

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'results-title');

    modal.innerHTML = `
      <div class="modal-card victory-card">
        <div class="victory-banner-top">
          <span class="victory-tag">LEVEL ${result.levelId} COMPLETE</span>
        </div>
        
        <h2 id="results-title" class="victory-title">${praiseTitle}</h2>
        <p class="victory-sub">${result.title}</p>

        <!-- Sequential Star Slam Display -->
        <div class="results-stars-display" aria-label="${result.stars} out of 3 stars">
          <div class="star-slam-slot" id="slot-star-1">
            <svg class="star-icon ${result.stars >= 1 ? 'filled' : 'empty'}" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div class="star-slam-slot" id="slot-star-2">
            <svg class="star-icon ${result.stars >= 2 ? 'filled' : 'empty'}" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div class="star-slam-slot" id="slot-star-3">
            <svg class="star-icon ${result.stars >= 3 ? 'filled' : 'empty'}" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        </div>

        <div class="results-stats-row">
          <div class="stat-pill">
            <span>${result.mistakes === 0 ? '✨ Flawless Run' : `${result.mistakes} mistake${result.mistakes > 1 ? 's' : ''}`}</span>
          </div>
          ${result.isNewBest ? '<div class="stat-pill new-best">🏆 New Best!</div>' : ''}
        </div>

        <div class="modal-actions">
          <button class="btn-3d control-btn" id="btn-results-map">Map</button>
          <button class="btn-3d control-btn" id="btn-results-replay">Replay</button>
          ${result.hasNextLevel ? '<button class="btn-3d btn-primary-play" id="btn-results-next">NEXT LEVEL</button>' : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    tryVibrate([20, 50, 30]);
    spawnVictoryConfetti();

    // Play sequential star sound & animation
    for (let s = 1; s <= result.stars; s++) {
      setTimeout(() => {
        audio.playStarSound(s);
        const slot = modal.querySelector(`#slot-star-1`);
        if (slot) {
          const rect = slot.getBoundingClientRect();
          spawnNodeSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fbbf24');
        }
      }, s * 320);
    }

    const nextBtn = modal.querySelector('#btn-results-next') as HTMLButtonElement | null;
    if (nextBtn) {
      nextBtn.focus();
    } else {
      (modal.querySelector('#btn-results-replay') as HTMLElement)?.focus();
    }

    modal.querySelector('#btn-results-map')?.addEventListener('click', () => {
      modal.remove();
      this.renderHome();
    });

    modal.querySelector('#btn-results-replay')?.addEventListener('click', () => {
      audio.ensureContext();
      modal.remove();
      if (this.currentActiveLevel) {
        this.renderGame(this.currentActiveLevel);
      }
    });

    modal.querySelector('#btn-results-next')?.addEventListener('click', () => {
      audio.ensureContext();
      modal.remove();
      const nextLvl = getLevelById(result.levelId + 1);
      if (nextLvl) {
        this.showBriefing(nextLvl);
      } else {
        this.renderHome();
      }
    });
  }

  // Helper SVG Icons
  private volumeUpIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    `;
  }

  private volumeMuteIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>
    `;
  }

  private sunIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
  }

  private moonIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
  }
}
