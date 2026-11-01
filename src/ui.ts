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
        isDark ? 'Switch to light theme' : 'Switch to dark theme'
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
  // RENDER HOME SCREEN
  // ==========================================================================
  public renderHome(): void {
    const progress = loadAllProgress();
    const isDark =
      this.currentTheme === 'dark' ||
      (this.currentTheme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Find next uncompleted level (or level 1)
    let nextLevelId = 1;
    for (let id = 1; id <= 25; id++) {
      if (!progress[id] || !progress[id].completed) {
        nextLevelId = id;
        break;
      }
    }
    const nextLevel = getLevelById(nextLevelId) ?? getLevelById(1)!;

    this.root.innerHTML = `
      <header class="app-header" role="banner">
        <div class="brand-wrap">
          <svg class="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="12 2 2 22 22 22 12 2"></polygon>
            <circle cx="12" cy="14" r="2" fill="currentColor"></circle>
          </svg>
          <span class="brand-title">Chordwalk</span>
        </div>
        <div class="header-actions">
          <button class="icon-btn sound-toggle-btn" aria-label="${audio.isMuted ? 'Turn sound on' : 'Turn sound off'}">
            ${audio.isMuted ? this.volumeMuteIconSvg() : this.volumeUpIconSvg()}
          </button>
          <button class="icon-btn theme-toggle-btn" aria-label="${isDark ? 'Switch to light theme' : 'Switch to dark theme'}">
            ${isDark ? this.sunIconSvg() : this.moonIconSvg()}
          </button>
        </div>
      </header>

      <main class="home-view" role="main">
        <section class="hero-section" aria-labelledby="hero-title">
          <h1 id="hero-title" class="hero-title">Harmonic Lattice Puzzles</h1>
          <p class="hero-subtitle">
            Walk the Tonnetz grid. Explore intervals, build triads, train your ear, and trace chord progressions through touch and sound.
          </p>
          <button class="play-continue-btn" id="btn-play-continue">
            <span>${progress[1] && progress[1].completed ? 'Continue Level ' + nextLevel.id : 'Start Playing'}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </section>

        <!-- Lattice Legend / Map Key -->
        <section class="lattice-key-card" aria-labelledby="key-title">
          <h2 id="key-title" class="key-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Tonnetz Lattice Guide
          </h2>
          <div class="key-grid">
            <div class="key-item">
              <span class="key-badge direction">→</span>
              <span>Right = Perfect Fifth (+7)</span>
            </div>
            <div class="key-item">
              <span class="key-badge direction">↗</span>
              <span>Up-Right = Major Third (+4)</span>
            </div>
            <div class="key-item">
              <span class="key-badge direction">↘</span>
              <span>Down-Right = Minor Third (+3)</span>
            </div>
            <div class="key-item">
              <span class="key-badge major">▲</span>
              <span>Upward Triangle = Major Triad</span>
            </div>
            <div class="key-item">
              <span class="key-badge minor">▼</span>
              <span>Downward Triangle = Minor Triad</span>
            </div>
            <div class="key-item">
              <span class="key-badge dim">●●●</span>
              <span>Down-Right Line = Diminished</span>
            </div>
            <div class="key-item">
              <span class="key-badge aug">●●●</span>
              <span>Up-Right Line = Augmented</span>
            </div>
          </div>
        </section>

        <!-- Worlds and Level Grid -->
        <section class="worlds-container" aria-label="Game Worlds and Levels">
          ${WORLDS.map((world) => this.renderWorldGroup(world, progress)).join('')}
        </section>
      </main>
    `;

    this.bindHomeEvents(nextLevel);
  }

  private renderWorldGroup(
    world: (typeof WORLDS)[number],
    progress: Record<number, LevelProgress>
  ): string {
    return `
      <section class="world-group" aria-labelledby="world-title-${world.id}">
        <div class="world-header">
          <h2 id="world-title-${world.id}" class="world-title">${world.title}</h2>
          <p class="world-subtitle">${world.subtitle}</p>
        </div>
        <div class="levels-grid" role="list">
          ${world.levels
            .map((lvl) => {
              const res = progress[lvl.id];
              const stars = res ? res.bestStars : 0;
              return `
              <button class="level-card-btn" data-level-id="${lvl.id}" role="listitem" aria-label="Level ${lvl.id}: ${lvl.title}. ${stars} of 3 stars earned.">
                <div class="level-card-top">
                  <span class="level-num-tag">#${lvl.id}</span>
                  <span class="level-kind-chip">${lvl.kindTag}</span>
                </div>
                <div class="level-card-title">${lvl.title}</div>
                <div class="level-card-stars" aria-hidden="true">
                  ${this.renderStars(stars)}
                </div>
              </button>
            `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  private renderStars(count: number): string {
    let out = '';
    for (let i = 1; i <= 3; i++) {
      out += `
        <svg class="star-icon ${i <= count ? 'filled' : ''}" viewBox="0 0 24 24" aria-hidden="true">
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

    // Continue / Play button
    this.root.querySelector('#btn-play-continue')?.addEventListener('click', () => {
      audio.ensureContext();
      this.showBriefing(nextLevel);
    });

    // Individual Level Cards
    this.root.querySelectorAll('.level-card-btn').forEach((btn) => {
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
  // BRIEFING MODAL
  // ==========================================================================
  public showBriefing(level: LevelDef): void {
    this.currentActiveLevel = level;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'briefing-title');

    modal.innerHTML = `
      <div class="modal-card">
        <span class="modal-eyebrow">Level ${level.id} · ${level.worldTitle}</span>
        <h2 id="briefing-title" class="modal-title">${level.title}</h2>
        <p class="modal-body-text">${level.briefing}</p>
        <div class="modal-actions">
          <button class="control-btn" id="btn-briefing-map">Map</button>
          <button class="control-btn primary" id="btn-briefing-start">Start</button>
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
  // GAME VIEW
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
          <button class="back-map-btn" id="btn-game-map" aria-label="Return to level map">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Map</span>
          </button>
          <span class="game-level-indicator">Level ${level.id} · ${level.worldTitle}</span>
        </div>
        <div class="top-bar-right">
          <button class="icon-btn sound-toggle-btn" aria-label="${audio.isMuted ? 'Turn sound on' : 'Turn sound off'}">
            ${audio.isMuted ? this.volumeMuteIconSvg() : this.volumeUpIconSvg()}
          </button>
          <button class="icon-btn theme-toggle-btn" aria-label="${isDark ? 'Switch to light theme' : 'Switch to dark theme'}">
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
            <div class="prompt-card" aria-live="polite">
              <div class="prompt-meta">
                <span class="prompt-eyebrow" id="prompt-eyebrow">Round 1</span>
                <span class="prompt-counter" id="prompt-round-counter">1 / 3</span>
              </div>
              <h1 class="prompt-title" id="prompt-title">${level.title}</h1>
              <p class="prompt-instruction" id="prompt-instruction">Tap nodes to explore.</p>

              <!-- Progression chips (if progressions) -->
              <div class="progression-chips-row" id="progression-chips" style="display: none;"></div>

              <!-- Answer buttons (if earq or earint) -->
              <div class="answer-buttons-grid" id="answer-buttons-grid" style="display: none;"></div>

              <!-- Feedback live line -->
              <div class="feedback-line status-info" id="feedback-line" role="status" aria-live="polite"></div>

              <!-- Action Controls -->
              <div class="game-controls-row">
                <button class="control-btn" id="btn-hear-target" title="Replay the sound">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  <span>Hear it</span>
                </button>
                <button class="control-btn" id="btn-hint" title="Pulse root note (no penalty)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 18h6"></path>
                    <path d="M10 22h4"></path>
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
                  </svg>
                  <span>Hint</span>
                </button>
                <button class="control-btn" id="btn-clear" title="Clear current selection">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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

    // Action buttons
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
    const counter = this.root.querySelector('#prompt-round-counter');
    const title = this.root.querySelector('#prompt-title');
    const instruction = this.root.querySelector('#prompt-instruction');
    const btnHint = this.root.querySelector('#btn-hint') as HTMLElement;
    const btnClear = this.root.querySelector('#btn-clear') as HTMLElement;

    if (eyebrow) eyebrow.textContent = prompt.eyebrow;
    if (counter)
      counter.textContent = `${prompt.roundIndex} / ${prompt.totalRounds}${prompt.mistakes > 0 ? ` · ${prompt.mistakes} mistake${prompt.mistakes > 1 ? 's' : ''}` : ''}`;
    if (title) title.textContent = prompt.title;
    if (instruction) instruction.textContent = prompt.instruction;

    if (btnHint) btnHint.style.display = prompt.canHint ? 'inline-flex' : 'none';
    if (btnClear)
      btnClear.style.display = prompt.canClear ? 'inline-flex' : 'none';
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
    const container = this.root.querySelector(
      '#answer-buttons-grid'
    ) as HTMLElement;
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
        <button class="answer-choice-btn" data-answer-value="${btn.value}">
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
  // RESULTS MODAL
  // ==========================================================================
  public showResults(result: LevelResult): void {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'results-title');

    modal.innerHTML = `
      <div class="modal-card">
        <span class="modal-eyebrow">Level ${result.levelId} Complete</span>
        <h2 id="results-title" class="modal-title">${result.title}</h2>

        <div class="results-stars-display" aria-label="${result.stars} out of 3 stars">
          ${this.renderStars(result.stars)}
        </div>

        <div class="results-stats-row">
          <span>${result.mistakes === 0 ? 'Flawless!' : `${result.mistakes} mistake${result.mistakes > 1 ? 's' : ''}`}</span>
          ${result.isNewBest ? '<span style="color: var(--color-major-active); font-weight: 700;">★ New Best!</span>' : ''}
        </div>

        <div class="modal-actions">
          <button class="control-btn" id="btn-results-map">Map</button>
          <button class="control-btn" id="btn-results-replay">Replay</button>
          ${result.hasNextLevel ? '<button class="control-btn primary" id="btn-results-next">Next Level</button>' : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    `;
  }

  private volumeMuteIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>
    `;
  }

  private sunIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
  }
}
