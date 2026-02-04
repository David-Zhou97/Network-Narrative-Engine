/**
 * GraphManager - Manages the narrative graph structure
 *
 * Supports both legacy node types and new architecture node types:
 * - Legacy: entry, story, branch, converge, ending
 * - New: anchor, transition, merge
 */

import type {
  NarrativeNode,
  Edge,
  EntryNode,
  EndingNode,
  BranchNode,
  AnchorNode,
  TransitionNode,
  MergeNode,
  NarrativeDefinition,
} from '../types/index.js';

export class GraphManager {
  private nodes: Map<string, NarrativeNode>;
  private edges: Map<string, Edge>;
  private outgoingEdges: Map<string, Edge[]>;
  private incomingEdges: Map<string, Edge[]>;

  constructor(definition: NarrativeDefinition) {
    this.nodes = new Map();
    this.edges = new Map();
    this.outgoingEdges = new Map();
    this.incomingEdges = new Map();

    this.buildGraph(definition);
  }

  /**
   * Build the graph from definition
   */
  private buildGraph(definition: NarrativeDefinition): void {
    // Index nodes
    for (const node of definition.nodes) {
      this.nodes.set(node.id, node);
      this.outgoingEdges.set(node.id, []);
      this.incomingEdges.set(node.id, []);
    }

    // Index edges
    for (const edge of definition.edges) {
      this.edges.set(edge.id, edge);

      const outgoing = this.outgoingEdges.get(edge.from);
      if (outgoing) {
        outgoing.push(edge);
        // Sort by priority (higher first)
        outgoing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      }

      const incoming = this.incomingEdges.get(edge.to);
      if (incoming) {
        incoming.push(edge);
      }
    }
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): NarrativeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get an edge by ID
   */
  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  /**
   * Get all entry nodes (starting scenarios)
   */
  getEntryNodes(): EntryNode[] {
    return Array.from(this.nodes.values()).filter(
      (node): node is EntryNode => node.type === 'entry'
    );
  }

  /**
   * Get all ending nodes
   */
  getEndingNodes(): EndingNode[] {
    return Array.from(this.nodes.values()).filter(
      (node): node is EndingNode => node.type === 'ending'
    );
  }

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): Edge[] {
    return this.outgoingEdges.get(nodeId) ?? [];
  }

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string): Edge[] {
    return this.incomingEdges.get(nodeId) ?? [];
  }

  /**
   * Check if a node is an ending
   */
  isEndingNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    return node?.type === 'ending';
  }

  /**
   * Check if a node is a branch node
   */
  isBranchNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    return node?.type === 'branch';
  }

  /**
   * Get branch node for conditional resolution
   */
  getBranchNode(nodeId: string): BranchNode | undefined {
    const node = this.nodes.get(nodeId);
    return node?.type === 'branch' ? (node as BranchNode) : undefined;
  }

  /**
   * Validate graph integrity
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphan nodes (no incoming edges except entry nodes)
    for (const [nodeId, node] of this.nodes) {
      if (node.type !== 'entry') {
        const incoming = this.incomingEdges.get(nodeId) ?? [];
        if (incoming.length === 0) {
          warnings.push(`Node "${nodeId}" has no incoming edges`);
        }
      }
    }

    // Check for dead ends (no outgoing edges except ending nodes)
    for (const [nodeId, node] of this.nodes) {
      if (node.type !== 'ending' && node.type !== 'branch') {
        const outgoing = this.outgoingEdges.get(nodeId) ?? [];
        if (outgoing.length === 0) {
          errors.push(`Node "${nodeId}" has no outgoing edges and is not an ending`);
        }
      }
    }

    // Check edge references
    for (const [edgeId, edge] of this.edges) {
      if (!this.nodes.has(edge.from)) {
        errors.push(`Edge "${edgeId}" references non-existent node "${edge.from}"`);
      }
      if (!this.nodes.has(edge.to)) {
        errors.push(`Edge "${edgeId}" references non-existent node "${edge.to}"`);
      }
    }

    // Check for at least one entry and one ending
    if (this.getEntryNodes().length === 0) {
      errors.push('No entry nodes defined');
    }
    if (this.getEndingNodes().length === 0) {
      errors.push('No ending nodes defined');
    }

    // Check that story nodes have exactly 3 outgoing edges (recommended)
    for (const [nodeId, node] of this.nodes) {
      if (node.type === 'story') {
        const outgoing = this.outgoingEdges.get(nodeId) ?? [];
        if (outgoing.length !== 3) {
          warnings.push(
            `Story node "${nodeId}" has ${outgoing.length} choices (recommended: 3)`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    const nodesByType: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      entryNodes: nodesByType['entry'] ?? 0,
      endingNodes: nodesByType['ending'] ?? 0,
      storyNodes: nodesByType['story'] ?? 0,
      branchNodes: nodesByType['branch'] ?? 0,
      convergeNodes: nodesByType['converge'] ?? 0,
      // New architecture node counts
      anchorNodes: nodesByType['anchor'] ?? 0,
      transitionNodes: nodesByType['transition'] ?? 0,
      mergeNodes: nodesByType['merge'] ?? 0,
    };
  }

  // ============================================================================
  // New Architecture Node Methods
  // ============================================================================

  /**
   * Get all anchor nodes (key story moments)
   */
  getAnchorNodes(): AnchorNode[] {
    return Array.from(this.nodes.values()).filter(
      (node): node is AnchorNode => node.type === 'anchor'
    );
  }

  /**
   * Get required anchor nodes (must be visited)
   */
  getRequiredAnchorNodes(): AnchorNode[] {
    return this.getAnchorNodes().filter((node) => node.required);
  }

  /**
   * Get anchor nodes sorted by order hint
   */
  getAnchorNodesByOrder(): AnchorNode[] {
    return this.getAnchorNodes().sort(
      (a, b) => (a.orderHint ?? 0) - (b.orderHint ?? 0)
    );
  }

  /**
   * Get all transition nodes
   */
  getTransitionNodes(): TransitionNode[] {
    return Array.from(this.nodes.values()).filter(
      (node): node is TransitionNode => node.type === 'transition'
    );
  }

  /**
   * Get all merge nodes (path convergence points)
   */
  getMergeNodes(): MergeNode[] {
    return Array.from(this.nodes.values()).filter(
      (node): node is MergeNode => node.type === 'merge'
    );
  }

  /**
   * Check if a node is an anchor
   */
  isAnchorNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    return node?.type === 'anchor';
  }

  /**
   * Check if a node is a transition
   */
  isTransitionNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    return node?.type === 'transition';
  }

  /**
   * Check if a node is a merge point
   */
  isMergeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    return node?.type === 'merge';
  }

  /**
   * Get an anchor node by ID
   */
  getAnchorNode(nodeId: string): AnchorNode | undefined {
    const node = this.nodes.get(nodeId);
    return node?.type === 'anchor' ? (node as AnchorNode) : undefined;
  }

  /**
   * Get a transition node by ID
   */
  getTransitionNode(nodeId: string): TransitionNode | undefined {
    const node = this.nodes.get(nodeId);
    return node?.type === 'transition' ? (node as TransitionNode) : undefined;
  }

  /**
   * Get a merge node by ID
   */
  getMergeNode(nodeId: string): MergeNode | undefined {
    const node = this.nodes.get(nodeId);
    return node?.type === 'merge' ? (node as MergeNode) : undefined;
  }

  /**
   * Find the next anchor node from a given position
   * Returns the nearest required anchor that hasn't been visited
   */
  findNextAnchor(visitedNodes: string[]): AnchorNode | undefined {
    const anchors = this.getAnchorNodesByOrder();
    const visitedSet = new Set(visitedNodes);

    // Find the first unvisited required anchor
    for (const anchor of anchors) {
      if (!visitedSet.has(anchor.id) && anchor.required) {
        return anchor;
      }
    }

    // If no required anchors, return any unvisited anchor
    return anchors.find((a) => !visitedSet.has(a.id));
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType<T extends NarrativeNode>(type: string): T[] {
    return Array.from(this.nodes.values()).filter(
      (node) => node.type === type
    ) as T[];
  }

  /**
   * Check if the graph uses new architecture (has anchor/transition/merge nodes)
   */
  usesNewArchitecture(): boolean {
    return this.getAnchorNodes().length > 0 ||
           this.getTransitionNodes().length > 0 ||
           this.getMergeNodes().length > 0;
  }

  /**
   * Find all paths from entry to endings (for debugging/analysis)
   */
  findAllPaths(maxDepth: number = 50): PathInfo[] {
    const paths: PathInfo[] = [];
    const entries = this.getEntryNodes();

    for (const entry of entries) {
      this.explorePaths(entry.id, [], [], paths, maxDepth);
    }

    return paths;
  }

  private explorePaths(
    currentId: string,
    visitedNodes: string[],
    pathEdges: string[],
    paths: PathInfo[],
    maxDepth: number
  ): void {
    if (visitedNodes.length >= maxDepth) {
      return; // Prevent infinite loops
    }

    const node = this.nodes.get(currentId);
    if (!node) return;

    const newVisited = [...visitedNodes, currentId];

    if (node.type === 'ending') {
      paths.push({
        nodes: newVisited,
        edges: pathEdges,
        ending: node as EndingNode,
      });
      return;
    }

    // Prevent cycles
    if (visitedNodes.includes(currentId)) {
      return;
    }

    const outgoing = this.outgoingEdges.get(currentId) ?? [];
    for (const edge of outgoing) {
      this.explorePaths(
        edge.to,
        newVisited,
        [...pathEdges, edge.id],
        paths,
        maxDepth
      );
    }
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  entryNodes: number;
  endingNodes: number;
  storyNodes: number;
  branchNodes: number;
  convergeNodes: number;
  // New architecture node counts
  anchorNodes: number;
  transitionNodes: number;
  mergeNodes: number;
}

export interface PathInfo {
  nodes: string[];
  edges: string[];
  ending: EndingNode;
}
