import {
  ChordQuality,
  generateEdges,
  generateGrid,
  generateTriangles,
  GridEdge,
  GridNode,
  GridTriangle,
} from './theory';

export interface BoardOptions {
  onNodeTap?: (node: GridNode, orderIndex: number) => void;
  interactive?: boolean;
}

export interface SelectedNodeState {
  node: GridNode;
  order: number; // 1, 2, 3...
}

export interface HighlightShape {
  quality: ChordQuality;
  nodes: GridNode[];
  isSuccess?: boolean;
}

export class TonnetzBoard {
  public readonly nodes: GridNode[];
  public readonly triangles: GridTriangle[];
  public readonly edges: GridEdge[];

  private container: HTMLElement;
  private svg!: SVGSVGElement;
  private defs!: SVGDefsElement;
  private trianglesGroup!: SVGGElement;
  private edgesGroup!: SVGGElement;
  private highlightGroup!: SVGGElement;
  private nodesGroup!: SVGGElement;

  private selectedNodes: SelectedNodeState[] = [];
  private ringedRootNodeId: string | null = null;
  private currentHighlight: HighlightShape | null = null;
  private isInteractive = true;
  private onNodeTapCallback?: (node: GridNode, orderIndex: number) => void;

  private nodeElements = new Map<
    string,
    {
      group: SVGGElement;
      circle: SVGCircleElement;
      badge: SVGGElement;
      badgeText: SVGTextElement;
    }
  >();

  constructor(container: HTMLElement, options: BoardOptions = {}) {
    this.container = container;
    this.isInteractive = options.interactive ?? true;
    this.onNodeTapCallback = options.onNodeTap;

    this.nodes = generateGrid();
    this.triangles = generateTriangles(this.nodes);
    this.edges = generateEdges(this.nodes);

    this.render();
  }

  public setInteractive(interactive: boolean): void {
    this.isInteractive = interactive;
    this.svg.setAttribute('aria-disabled', String(!interactive));
    this.nodesGroup.style.pointerEvents = interactive ? 'auto' : 'none';
    this.nodeElements.forEach(({ group }) => {
      group.setAttribute('tabindex', interactive ? '0' : '-1');
    });
  }

  public setOnNodeTap(cb: (node: GridNode, orderIndex: number) => void): void {
    this.onNodeTapCallback = cb;
  }

  public getSelected(): SelectedNodeState[] {
    return [...this.selectedNodes];
  }

  public getSelectedNodes(): GridNode[] {
    return this.selectedNodes.map((s) => s.node);
  }

  /**
   * Toggles selection of a node. Max 3 nodes.
   * If already selected, deselects it and re-numbers remaining.
   * Returns true if selected, false if deselected or rejected.
   */
  public toggleNode(node: GridNode): boolean {
    if (!this.isInteractive) return false;

    const existingIndex = this.selectedNodes.findIndex(
      (s) => s.node.id === node.id
    );

    if (existingIndex !== -1) {
      // Deselect
      this.selectedNodes.splice(existingIndex, 1);
      // Re-number remaining
      this.selectedNodes.forEach((s, idx) => {
        s.order = idx + 1;
      });
      this.updateNodeVisuals();
      return false;
    }

    // Reject duplicate pitch classes
    if (this.selectedNodes.some((s) => s.node.pc === node.pc)) {
      this.flashNodeError(node.id);
      return false;
    }

    // Max 3 notes
    if (this.selectedNodes.length >= 3) {
      return false;
    }

    const order = this.selectedNodes.length + 1;
    this.selectedNodes.push({ node, order });
    this.updateNodeVisuals();

    if (this.onNodeTapCallback) {
      this.onNodeTapCallback(node, order);
    }
    return true;
  }

  public clearSelection(): void {
    this.selectedNodes = [];
    this.currentHighlight = null;
    this.renderHighlight();
    this.updateNodeVisuals();
  }

  public setRingedRoot(nodeId: string | null): void {
    this.ringedRootNodeId = nodeId;
    this.updateNodeVisuals();
  }

  public pulseHint(nodeId: string): void {
    const el = this.nodeElements.get(nodeId);
    if (el) {
      el.group.classList.remove('pulse-hint');
      // trigger reflow
      void el.group.getBoundingClientRect();
      el.group.classList.add('pulse-hint');
      setTimeout(() => {
        el.group.classList.remove('pulse-hint');
      }, 1600);
    }
  }

  public highlightSuccess(
    nodes: GridNode[],
    quality: ChordQuality
  ): void {
    this.currentHighlight = {
      quality,
      nodes,
      isSuccess: true,
    };
    this.renderHighlight();
  }

  public clearHighlight(): void {
    this.currentHighlight = null;
    this.renderHighlight();
  }

  public flashNodeError(nodeId: string): void {
    const el = this.nodeElements.get(nodeId);
    if (el) {
      el.group.classList.remove('node-error-shake');
      void el.group.getBoundingClientRect();
      el.group.classList.add('node-error-shake');
      setTimeout(() => {
        el.group.classList.remove('node-error-shake');
      }, 600);
    }
  }

  public selectNodesDirectly(nodes: GridNode[]): void {
    this.selectedNodes = nodes.map((node, idx) => ({
      node,
      order: idx + 1,
    }));
    this.updateNodeVisuals();
  }

  public getNodeClientCoords(nodeId: string): { x: number; y: number } | null {
    const el = this.nodeElements.get(nodeId);
    if (!el) return null;
    const rect = el.circle.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  private render(): void {
    this.container.innerHTML = '';

    // Calculate bounding box for SVG viewBox
    const xs = this.nodes.map((n) => n.screenX);
    const ys = this.nodes.map((n) => n.screenY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const pad = 44;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = maxX - minX + pad * 2;
    const vbH = maxY - minY + pad * 2;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    this.svg.setAttribute('class', 'tonnetz-board-svg');
    this.svg.setAttribute('role', 'region');
    this.svg.setAttribute('aria-label', 'Tonnetz music theory lattice board');

    // Defs for 3D gradients and filters
    this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this.renderDefs();
    this.svg.appendChild(this.defs);

    // Groups in stacking order
    this.trianglesGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.trianglesGroup.setAttribute('class', 'lattice-triangles');

    this.edgesGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.edgesGroup.setAttribute('class', 'lattice-edges');

    this.highlightGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.highlightGroup.setAttribute('class', 'lattice-highlights');

    this.nodesGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.nodesGroup.setAttribute('class', 'lattice-nodes');

    this.svg.appendChild(this.trianglesGroup);
    this.svg.appendChild(this.edgesGroup);
    this.svg.appendChild(this.highlightGroup);
    this.svg.appendChild(this.nodesGroup);

    this.renderTriangles();
    this.renderEdges();
    this.renderNodes();

    this.container.appendChild(this.svg);
  }

  private renderDefs(): void {
    this.defs.innerHTML = `
      <!-- Natural Pearl Gem Gradient -->
      <linearGradient id="grad-natural-gem" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="45%" stop-color="#fdfbf7" />
        <stop offset="100%" stop-color="#eadecb" />
      </linearGradient>

      <!-- Accidental Obsidian Gem Gradient -->
      <linearGradient id="grad-accidental-gem" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#48423c" />
        <stop offset="50%" stop-color="#2a2624" />
        <stop offset="100%" stop-color="#141211" />
      </linearGradient>

      <!-- Selected Gem Gradient (Honey Gold) -->
      <linearGradient id="grad-selected-gem" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="35%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>

      <!-- Drop shadow for 3D tactile nodes -->
      <filter id="candy-drop-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.18" />
      </filter>

      <!-- Glow for completed shapes -->
      <filter id="shape-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `;
  }

  private renderTriangles(): void {
    for (const tri of this.triangles) {
      const [a, b, c] = tri.nodes;
      const polygon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon'
      );
      polygon.setAttribute(
        'points',
        `${a.screenX},${a.screenY} ${b.screenX},${b.screenY} ${c.screenX},${c.screenY}`
      );
      polygon.setAttribute(
        'class',
        `tri-base tri-${tri.orientation} tri-quality-${tri.quality}`
      );
      polygon.setAttribute('data-id', tri.id);
      this.trianglesGroup.appendChild(polygon);
    }
  }

  private renderEdges(): void {
    for (const edge of this.edges) {
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );
      line.setAttribute('x1', String(edge.from.screenX));
      line.setAttribute('y1', String(edge.from.screenY));
      line.setAttribute('x2', String(edge.to.screenX));
      line.setAttribute('y2', String(edge.to.screenY));
      line.setAttribute('class', `edge-line edge-${edge.axis}`);
      this.edgesGroup.appendChild(line);
    }
  }

  private renderNodes(): void {
    this.nodeElements.clear();

    for (const node of this.nodes) {
      const group = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g'
      );
      group.setAttribute('class', `node-group ${node.isBlack ? 'is-accidental' : 'is-natural'}`);
      group.setAttribute('data-id', node.id);
      group.setAttribute('data-pc', String(node.pc));
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', this.isInteractive ? '0' : '-1');
      group.setAttribute(
        'aria-label',
        `Node ${node.boardLabel}, row ${node.row + 1}, column ${node.col + 1}`
      );

      // Hit area (at least 48px diameter for mobile touch accessibility)
      const hitCircle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      hitCircle.setAttribute('cx', String(node.screenX));
      hitCircle.setAttribute('cy', String(node.screenY));
      hitCircle.setAttribute('r', '27');
      hitCircle.setAttribute('class', 'node-hit-area');
      hitCircle.style.fill = 'transparent';
      hitCircle.style.cursor = 'pointer';

      // Ringed root outline (for interval levels)
      const ringCircle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      ringCircle.setAttribute('cx', String(node.screenX));
      ringCircle.setAttribute('cy', String(node.screenY));
      ringCircle.setAttribute('r', '27');
      ringCircle.setAttribute('class', 'node-root-ring');

      // 3D bottom bevel/lip for tactile physical thickness
      const lipCircle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      lipCircle.setAttribute('cx', String(node.screenX));
      lipCircle.setAttribute('cy', String(node.screenY + 2.8));
      lipCircle.setAttribute('r', '22');
      lipCircle.setAttribute('class', 'node-lip');

      // Visual circle (21.5px radius = 43px diameter)
      const visualCircle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      visualCircle.setAttribute('cx', String(node.screenX));
      visualCircle.setAttribute('cy', String(node.screenY));
      visualCircle.setAttribute('r', '21.5');
      visualCircle.setAttribute('class', 'node-circle');

      // Glossy top specular reflection
      const specular = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'ellipse'
      );
      specular.setAttribute('cx', String(node.screenX));
      specular.setAttribute('cy', String(node.screenY - 8.5));
      specular.setAttribute('rx', '11');
      specular.setAttribute('ry', '4.5');
      specular.setAttribute('class', 'node-specular');

      group.appendChild(hitCircle);
      group.appendChild(ringCircle);
      group.appendChild(lipCircle);
      group.appendChild(visualCircle);
      group.appendChild(specular);

      // Labels: black keys show dual spellings e.g. C# above, Db below
      if (node.isBlack) {
        const textTop = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        textTop.setAttribute('x', String(node.screenX));
        textTop.setAttribute('y', String(node.screenY - 4.5));
        textTop.setAttribute('class', 'node-label node-label-sharp');
        textTop.textContent = node.sharpName;

        const textBot = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        textBot.setAttribute('x', String(node.screenX));
        textBot.setAttribute('y', String(node.screenY + 8));
        textBot.setAttribute('class', 'node-label node-label-flat');
        textBot.textContent = node.flatName;

        group.appendChild(textTop);
        group.appendChild(textBot);
      } else {
        const text = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        text.setAttribute('x', String(node.screenX));
        text.setAttribute('y', String(node.screenY + 4.5));
        text.setAttribute('class', 'node-label node-label-natural');
        text.textContent = node.flatName;
        group.appendChild(text);
      }

      // Order badge (1, 2, 3)
      const badgeGroup = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g'
      );
      badgeGroup.setAttribute('class', 'node-badge-group');
      badgeGroup.style.display = 'none';

      const badgeCircle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      badgeCircle.setAttribute('cx', String(node.screenX + 16));
      badgeCircle.setAttribute('cy', String(node.screenY - 16));
      badgeCircle.setAttribute('r', '9');
      badgeCircle.setAttribute('class', 'node-badge-circle');

      const badgeText = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      badgeText.setAttribute('x', String(node.screenX + 16));
      badgeText.setAttribute('y', String(node.screenY - 13));
      badgeText.setAttribute('class', 'node-badge-text');
      badgeText.textContent = '';

      badgeGroup.appendChild(badgeCircle);
      badgeGroup.appendChild(badgeText);
      group.appendChild(badgeGroup);

      // Event handlers: touch & click
      const handleTap = (e: Event) => {
        e.preventDefault();
        if (this.isInteractive) {
          this.toggleNode(node);
        }
      };

      group.addEventListener('click', handleTap);
      group.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap(e);
        }
      });

      this.nodesGroup.appendChild(group);
      this.nodeElements.set(node.id, {
        group,
        circle: visualCircle,
        badge: badgeGroup,
        badgeText,
      });
    }
  }

  private updateNodeVisuals(): void {
    const selectedMap = new Map<string, number>();
    for (const sel of this.selectedNodes) {
      selectedMap.set(sel.node.id, sel.order);
    }

    this.nodeElements.forEach(({ group, badge, badgeText }, id) => {
      const order = selectedMap.get(id);
      const isSelected = order !== undefined;
      const isRinged = this.ringedRootNodeId === id;

      group.classList.toggle('is-selected', isSelected);
      group.classList.toggle('is-ringed-root', isRinged);
      group.setAttribute('aria-pressed', String(isSelected));

      if (isSelected) {
        badge.style.display = 'block';
        badgeText.textContent = String(order);
      } else {
        badge.style.display = 'none';
        badgeText.textContent = '';
      }
    });
  }

  private renderHighlight(): void {
    this.highlightGroup.innerHTML = '';
    if (!this.currentHighlight) return;

    const { nodes, quality } = this.currentHighlight;
    if (nodes.length < 3) return;

    // Check if triangle or line
    if (quality === 'major' || quality === 'minor') {
      const polygon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'polygon'
      );
      const points = nodes
        .map((n) => `${n.screenX},${n.screenY}`)
        .join(' ');
      polygon.setAttribute('points', points);
      polygon.setAttribute(
        'class',
        `shape-success-fill shape-quality-${quality}`
      );
      this.highlightGroup.appendChild(polygon);
    } else {
      // Diminished or augmented: straight line shape
      // Sort nodes along their axis
      const sorted = [...nodes].sort((a, b) => a.screenX - b.screenX);
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      const d = `M ${sorted[0].screenX} ${sorted[0].screenY} L ${sorted[1].screenX} ${sorted[1].screenY} L ${sorted[2].screenX} ${sorted[2].screenY}`;
      path.setAttribute('d', d);
      path.setAttribute(
        'class',
        `shape-success-line shape-quality-${quality}`
      );
      this.highlightGroup.appendChild(path);
    }
  }
}
