import { audio } from './audio';
import { TonnetzBoard } from './board';
import {
  LevelDef,
  LevelRound,
  IntervalRound,
  BuildRound,
  EarQualityRound,
  EarIntervalRound,
  EarBuildRound,
} from './levels';
import { saveLevelResult } from './storage';
import {
  ChordQuality,
  chordPitchClasses,
  connected,
  findShape,
  identify,
  intervalInfo,
  inversionBassPc,
  inversionLabel,
  mod12,
  noteName,
  samePitchClassSet,
  voice,
  GridNode,
} from './theory';
import {
  spawnNodeSparkles,
  spawnPraiseCallout,
  spawnVictoryConfetti,
  tryVibrate,
} from './vfx';

export interface GameUIHandlers {
  onPromptUpdate: (prompt: PromptData) => void;
  onFeedback: (text: string, status: 'info' | 'success' | 'error') => void;
  onProgressionChipsUpdate: (chips: ProgressionChip[]) => void;
  onAnswerButtonsUpdate: (buttons: AnswerButton[] | null) => void;
  onLevelComplete: (result: LevelResult) => void;
}

export interface PromptData {
  eyebrow: string;
  title: string;
  instruction: string;
  roundIndex: number;
  totalRounds: number;
  mistakes: number;
  canHear: boolean;
  canHint: boolean;
  canClear: boolean;
}

export interface ProgressionChip {
  roman?: string;
  name?: string;
  isCurrent: boolean;
  isCompleted: boolean;
}

export interface AnswerButton {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
}

export interface LevelResult {
  levelId: number;
  title: string;
  stars: number;
  mistakes: number;
  isNewBest: boolean;
  hasNextLevel: boolean;
}

export class GameController {
  private level!: LevelDef;
  private rounds: LevelRound[] = [];
  private currentRoundIndex = 0;
  private mistakes = 0;
  private isProcessing = false;
  private completedProgressionChords: Array<{ name: string; midi: number[] }> = [];

  private board: TonnetzBoard;
  private ui: GameUIHandlers;

  constructor(board: TonnetzBoard, ui: GameUIHandlers) {
    this.board = board;
    this.ui = ui;

    // Attach board tap listener
    this.board.setOnNodeTap((node) => {
      this.handleNodeTap(node);
    });
  }

  public startLevel(level: LevelDef): void {
    this.level = level;
    this.rounds = level.generateRounds(this.board.nodes);
    this.currentRoundIndex = 0;
    this.mistakes = 0;
    this.isProcessing = false;
    this.completedProgressionChords = [];

    this.board.clearSelection();
    this.board.clearHighlight();

    this.loadRound(0, true);
  }

  public get currentRound(): LevelRound | undefined {
    return this.rounds[this.currentRoundIndex];
  }

  public hearTarget(): void {
    const round = this.currentRound;
    if (!round) return;

    if (round.kind === 'interval') {
      const rootMidi = 60 + round.rootPc;
      const targetMidi = rootMidi + round.semitones;
      audio.playIntervalMelodicAndHarmonic(rootMidi, targetMidi);
    } else if (round.kind === 'build') {
      const bassPc =
        round.requireBass && round.inversion !== undefined
          ? inversionBassPc(round.rootPc, round.quality, round.inversion)
          : round.rootPc;
      const pcs = chordPitchClasses(round.rootPc, round.quality);
      const midiNotes = voice(pcs, bassPc);
      audio.playVoicedChord(midiNotes, 50, 1.2);
    } else if (round.kind === 'earq') {
      const pcs = chordPitchClasses(round.rootPc, round.quality);
      const midiNotes = voice(pcs, round.rootPc);
      audio.playVoicedChord(midiNotes, 50, 1.3);
    } else if (round.kind === 'earint') {
      const rootMidi = 60 + round.rootPc;
      const targetMidi = rootMidi + round.semitones;
      audio.playIntervalMelodicAndHarmonic(rootMidi, targetMidi);
    } else if (round.kind === 'earbuild') {
      const pcs = chordPitchClasses(round.rootPc, round.quality);
      const midiNotes = voice(pcs, round.rootPc);
      audio.playVoicedChord(midiNotes, 50, 1.3);
    }
  }

  public requestHint(): void {
    const round = this.currentRound;
    if (!round) return;

    let targetRootPc = round.rootPc;
    // Find node on board matching this root
    const matching = this.board.nodes.filter((n) => n.pc === targetRootPc);
    if (matching.length > 0) {
      // Pick one closest to center
      const sorted = [...matching].sort((a, b) => {
        const distA = Math.abs(a.col - 2.5) + Math.abs(a.row - 2);
        const distB = Math.abs(b.col - 2.5) + Math.abs(b.row - 2);
        return distA - distB;
      });
      this.board.pulseHint(sorted[0].id);
      this.ui.onFeedback(`Hint: Root ${noteName(targetRootPc)} is highlighted.`, 'info');
    }
  }

  public clearBoard(): void {
    if (this.isProcessing) return;
    this.board.clearSelection();
    this.ui.onFeedback('Selection cleared.', 'info');
  }

  public handleAnswerButtonClick(value: string): void {
    if (this.isProcessing) return;
    const round = this.currentRound;
    if (!round) return;

    if (round.kind === 'earq') {
      this.evaluateEarQuality(value as ChordQuality);
    } else if (round.kind === 'earint') {
      this.evaluateEarInterval(parseInt(value, 10));
    }
  }

  private loadRound(index: number, isInitial = false): void {
    if (index >= this.rounds.length) {
      this.finishLevel();
      return;
    }

    this.currentRoundIndex = index;
    this.isProcessing = false;
    this.board.clearSelection();
    this.board.clearHighlight();

    const round = this.rounds[index];

    // Configure board interactivity
    if (round.kind === 'earq' || round.kind === 'earint') {
      this.board.setInteractive(false);
      this.board.setRingedRoot(null);
    } else if (round.kind === 'interval') {
      this.board.setInteractive(true);
      this.board.setRingedRoot(round.rootNodeId ?? null);
    } else {
      this.board.setInteractive(true);
      this.board.setRingedRoot(null);
    }

    // Progression chips
    if (this.level.kind === 'progressions') {
      const chips: ProgressionChip[] = this.rounds.map((r, i) => {
        const br = r as BuildRound;
        const comp = this.completedProgressionChords[i];
        return {
          roman: br.roman,
          name: comp ? comp.name : undefined,
          isCurrent: i === index,
          isCompleted: i < index,
        };
      });
      this.ui.onProgressionChipsUpdate(chips);
    } else {
      this.ui.onProgressionChipsUpdate([]);
    }

    // Answer buttons for ear questions
    if (round.kind === 'earq') {
      const buttons: AnswerButton[] = round.options.map((q) => ({
        id: `btn_q_${q}`,
        label: q.charAt(0).toUpperCase() + q.slice(1),
        value: q,
      }));
      this.ui.onAnswerButtonsUpdate(buttons);
    } else if (round.kind === 'earint') {
      const buttons: AnswerButton[] = round.options.map((semi) => {
        const info = intervalInfo(semi);
        return {
          id: `btn_int_${semi}`,
          label: `${info.short} (${info.label})`,
          value: String(semi),
        };
      });
      this.ui.onAnswerButtonsUpdate(buttons);
    } else {
      this.ui.onAnswerButtonsUpdate(null);
    }

    // Prompt data
    this.ui.onPromptUpdate({
      eyebrow: round.eyebrow,
      title: round.title,
      instruction: round.instruction,
      roundIndex: index + 1,
      totalRounds: this.rounds.length,
      mistakes: this.mistakes,
      canHear: true,
      canHint: round.kind !== 'earq' && round.kind !== 'earint',
      canClear: round.kind === 'build' || round.kind === 'earbuild',
    });

    this.ui.onFeedback('', 'info');

    // For ear rounds: play target audio after brief delay if not initial (or user interaction)
    if (!isInitial) {
      if (round.kind === 'earq' || round.kind === 'earint' || round.kind === 'earbuild') {
        setTimeout(() => {
          this.hearTarget();
        }, 300);
      }
    }
  }

  private handleNodeTap(node: GridNode): void {
    // Play single node tap sound: MIDI 60 + pitch class
    audio.playTap(node.pc);
    const coords = this.board.getNodeClientCoords(node.id);
    if (coords) {
      spawnNodeSparkles(coords.x, coords.y, node.isBlack ? '#f59e0b' : '#38bdf8');
    }
    tryVibrate(8);

    const round = this.currentRound;
    if (!round) return;

    if (round.kind === 'interval') {
      this.evaluateIntervalTap(node);
    } else if (round.kind === 'build' || round.kind === 'earbuild') {
      const selected = this.board.getSelected();
      if (selected.length === 3) {
        this.evaluateBuildChord(round, selected.map((s) => s.node));
      }
    }
  }

  private evaluateIntervalTap(tappedNode: GridNode): void {
    const round = this.currentRound as IntervalRound;
    const actualSemitones = mod12(tappedNode.pc - round.rootPc);
    const targetSemitones = mod12(round.semitones);

    if (actualSemitones === targetSemitones) {
      // Success!
      this.isProcessing = true;
      spawnPraiseCallout('SWEET!', 'major');
      audio.playIntervalMelodicAndHarmonic(
        60 + round.rootPc,
        60 + round.rootPc + round.semitones
      );
      this.ui.onFeedback(
        `Correct! ${tappedNode.flatName} is a ${intervalInfo(round.semitones).name} above ${noteName(round.rootPc)}.`,
        'success'
      );

      setTimeout(() => {
        this.loadRound(this.currentRoundIndex + 1);
      }, 1300);
    } else {
      // Wrong interval
      this.mistakes++;
      const actualInfo = intervalInfo(actualSemitones);
      const targetInfo = intervalInfo(targetSemitones);
      this.ui.onFeedback(
        `${tappedNode.flatName} is a ${actualInfo.name} above ${noteName(round.rootPc)}. You need a ${targetInfo.name}.`,
        'error'
      );
      audio.playMistakeCue();
      this.board.flashNodeError(tappedNode.id);
      this.board.clearSelection();
      this.updatePromptMistakes();
    }
  }

  private evaluateBuildChord(
    round: BuildRound | EarBuildRound,
    selectedNodes: GridNode[]
  ): void {
    this.isProcessing = true;
    const selectedPcs = selectedNodes.map((n) => n.pc);
    const targetPcs = chordPitchClasses(round.rootPc, round.quality);

    // 1. Check if pitch classes match
    if (!samePitchClassSet(selectedPcs, targetPcs)) {
      // Identify what they built
      const built = identify(selectedPcs);
      this.mistakes++;
      const targetName = `${noteName(round.rootPc)} ${round.quality}`;
      let msg = '';
      if (built) {
        msg = `That is ${built.name}. You need ${targetName}.`;
      } else {
        const names = selectedNodes.map((n) => n.flatName).join('–');
        msg = `That is ${names}. You need ${targetName}.`;
      }
      this.ui.onFeedback(msg, 'error');

      // Play what they built
      const voicedBuilt = voice(selectedPcs);
      audio.playVoicedChord(voicedBuilt, 50, 0.9);
      audio.playMistakeCue();

      selectedNodes.forEach((n) => this.board.flashNodeError(n.id));

      setTimeout(() => {
        this.board.clearSelection();
        this.isProcessing = false;
        this.updatePromptMistakes();
      }, 1200);
      return;
    }

    // 2. Right pitch classes, but check if connected
    if (!connected(selectedNodes)) {
      this.ui.onFeedback(
        'Right notes, but not connected! A triad is one touching cluster on the lattice.',
        'info'
      );
      // No mistake counted per spec!
      setTimeout(() => {
        this.board.clearSelection();
        this.isProcessing = false;
      }, 1400);
      return;
    }

    // 3. Inversion check (if applicable)
    if ('requireBass' in round && round.requireBass && round.inversion !== undefined) {
      const requiredBassPc = inversionBassPc(round.rootPc, round.quality, round.inversion);
      const firstTappedPc = selectedNodes[0].pc;
      if (firstTappedPc !== requiredBassPc) {
        this.mistakes++;
        const reqName = noteName(requiredBassPc);
        const actualName = selectedNodes[0].flatName;
        this.ui.onFeedback(
          `${inversionLabel(round.inversion)}: first note tapped must be ${reqName}. You tapped ${actualName} first.`,
          'error'
        );
        audio.playMistakeCue();
        selectedNodes.forEach((n) => this.board.flashNodeError(n.id));

        setTimeout(() => {
          this.board.clearSelection();
          this.isProcessing = false;
          this.updatePromptMistakes();
        }, 1300);
        return;
      }
    }

    // 4. Success!
    this.board.highlightSuccess(selectedNodes, round.quality);

    const bassPc =
      'requireBass' in round && round.requireBass && round.inversion !== undefined
        ? inversionBassPc(round.rootPc, round.quality, round.inversion)
        : selectedNodes[0].pc;

    const voicedChord = voice(selectedPcs, bassPc);
    audio.playVoicedChord(voicedChord, 60, 1.4);

    const qualityPraise: Record<ChordQuality, string> = {
      major: 'SWEET!',
      minor: 'HARMONIC!',
      diminished: 'RESONANT!',
      augmented: 'DIVINE!',
    };
    spawnPraiseCallout(qualityPraise[round.quality] || 'CHORD CRUSH!', round.quality);

    const chordName = `${noteName(round.rootPc)} ${round.quality}`;
    this.ui.onFeedback(`Awesome! ${chordName} connected.`, 'success');

    if (this.level.kind === 'progressions') {
      this.completedProgressionChords.push({
        name: chordName,
        midi: voicedChord,
      });
    }

    const isLastRound = this.currentRoundIndex === this.rounds.length - 1;

    if (isLastRound && this.level.kind === 'progressions') {
      // Play whole progression back
      setTimeout(() => {
        this.ui.onFeedback('Playing full progression...', 'info');
        const allMidi = this.completedProgressionChords.map((c) => c.midi);
        audio.playProgression(allMidi);

        const totalPlaybackTime = allMidi.length * 1.15;
        setTimeout(() => {
          this.finishLevel();
        }, totalPlaybackTime * 1000 + 400);
      }, 1100);
    } else {
      setTimeout(() => {
        this.loadRound(this.currentRoundIndex + 1);
      }, 1400);
    }
  }

  private evaluateEarQuality(chosen: ChordQuality): void {
    const round = this.currentRound as EarQualityRound;
    if (chosen === round.quality) {
      // Correct!
      this.isProcessing = true;
      spawnPraiseCallout('CRUSHED IT!', round.quality);
      this.ui.onFeedback(`Correct! That was ${round.quality}.`, 'success');

      // Light up answer on board
      const shape = findShape(round.rootPc, round.quality, this.board.nodes);
      if (shape) {
        this.board.selectNodesDirectly(shape);
        this.board.highlightSuccess(shape, round.quality);
      }

      const pcs = chordPitchClasses(round.rootPc, round.quality);
      audio.playVoicedChord(voice(pcs, round.rootPc), 55, 1.3);

      setTimeout(() => {
        this.loadRound(this.currentRoundIndex + 1);
      }, 1500);
    } else {
      // Mistake
      this.mistakes++;
      audio.playMistakeCue();
      this.ui.onFeedback(`Not ${chosen}. Listen again and pick the quality!`, 'error');
      this.updatePromptMistakes();
    }
  }

  private evaluateEarInterval(chosenSemitones: number): void {
    const round = this.currentRound as EarIntervalRound;
    if (chosenSemitones === round.semitones) {
      // Correct!
      this.isProcessing = true;
      spawnPraiseCallout('PERFECT!', 'major');
      const info = intervalInfo(round.semitones);
      this.ui.onFeedback(`Correct! It was a ${info.label}.`, 'success');

      // Light up the interval on the board
      const rootNode = this.board.nodes.find((n) => n.pc === round.rootPc);
      const targetPc = mod12(round.rootPc + round.semitones);
      const targetNode = this.board.nodes.find((n) => n.pc === targetPc);
      if (rootNode && targetNode) {
        this.board.selectNodesDirectly([rootNode, targetNode]);
      }

      const rootMidi = 60 + round.rootPc;
      audio.playIntervalMelodicAndHarmonic(rootMidi, rootMidi + round.semitones);

      setTimeout(() => {
        this.loadRound(this.currentRoundIndex + 1);
      }, 1500);
    } else {
      // Mistake
      this.mistakes++;
      audio.playMistakeCue();
      const chosenInfo = intervalInfo(chosenSemitones);
      this.ui.onFeedback(
        `Not ${chosenInfo.label}. Listen again and choose!`,
        'error'
      );
      this.updatePromptMistakes();
    }
  }

  private updatePromptMistakes(): void {
    const round = this.currentRound;
    if (!round) return;
    this.ui.onPromptUpdate({
      eyebrow: round.eyebrow,
      title: round.title,
      instruction: round.instruction,
      roundIndex: this.currentRoundIndex + 1,
      totalRounds: this.rounds.length,
      mistakes: this.mistakes,
      canHear: true,
      canHint: round.kind !== 'earq' && round.kind !== 'earint',
      canClear: round.kind === 'build' || round.kind === 'earbuild',
    });
  }

  private finishLevel(): void {
    audio.playSuccessCue();
    spawnVictoryConfetti();
    const { stars, isNewBest } = saveLevelResult(this.level.id, this.mistakes);

    this.ui.onLevelComplete({
      levelId: this.level.id,
      title: this.level.title,
      stars,
      mistakes: this.mistakes,
      isNewBest,
      hasNextLevel: this.level.id < 25,
    });
  }
}
