/**
 * ChoiceResolver - Resolves available choices and handles transitions
 */

import type { Edge, EdgeCondition, BranchCondition, PlayerChoice } from '../types';
import { StateManager } from './StateManager';
import { GraphManager } from './GraphManager';

export class ChoiceResolver {
  private stateManager: StateManager;
  private graphManager: GraphManager;

  constructor(stateManager: StateManager, graphManager: GraphManager) {
    this.stateManager = stateManager;
    this.graphManager = graphManager;
  }

  /**
   * Get available choices for the current node
   * Returns up to 3 valid edges based on conditions
   */
  getAvailableChoices(nodeId: string): Edge[] {
    const allEdges = this.graphManager.getOutgoingEdges(nodeId);
    const availableEdges: Edge[] = [];

    for (const edge of allEdges) {
      if (this.isEdgeAvailable(edge)) {
        availableEdges.push(edge);
      }
    }

    // Return top 3 by priority
    return availableEdges.slice(0, 3);
  }

  /**
   * Check if an edge is available based on its conditions
   */
  private isEdgeAvailable(edge: Edge): boolean {
    if (!edge.conditions || edge.conditions.length === 0) {
      return true;
    }

    // All conditions must be met (AND logic)
    return edge.conditions.every((condition) =>
      this.stateManager.evaluateCondition(condition)
    );
  }

  /**
   * Resolve a player's choice and return the target node ID
   */
  resolveChoice(choiceIndex: number, choices: PlayerChoice[]): ResolvedChoice | null {
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return null;
    }

    const choice = choices[choiceIndex];
    const edge = this.graphManager.getEdge(choice.edgeId);

    if (!edge) {
      return null;
    }

    // Record the choice in history
    this.stateManager.recordChoice(
      this.stateManager.getCurrentNodeId(),
      choiceIndex,
      choice.text
    );

    // Apply edge effects
    if (edge.effects) {
      this.stateManager.applyModifications(edge.effects);
    }

    // Move to target node
    this.stateManager.setCurrentNode(edge.to);

    // Apply target node's onEnter effects
    const targetNode = this.graphManager.getNode(edge.to);
    if (targetNode?.onEnter) {
      this.stateManager.applyModifications(targetNode.onEnter);
    }

    // Update character presence
    if (targetNode?.characters) {
      this.stateManager.setCharacterPresence(targetNode.characters);
    }

    // Handle branch nodes (automatic transition based on conditions)
    if (this.graphManager.isBranchNode(edge.to)) {
      const branchResult = this.resolveBranch(edge.to);
      if (branchResult) {
        return branchResult;
      }
    }

    return {
      nodeId: edge.to,
      edgeId: edge.id,
      isEnding: this.graphManager.isEndingNode(edge.to),
    };
  }

  /**
   * Resolve a branch node's automatic transition
   */
  private resolveBranch(branchNodeId: string): ResolvedChoice | null {
    const branchNode = this.graphManager.getBranchNode(branchNodeId);
    if (!branchNode) return null;

    let defaultTarget: string | null = null;

    for (const condition of branchNode.conditions) {
      if (condition.isDefault) {
        defaultTarget = condition.targetNodeId;
        continue;
      }

      // Check if all conditions are met
      const allMet = condition.conditions.every((c) =>
        this.stateManager.evaluateCondition(c)
      );

      if (allMet) {
        this.stateManager.setCurrentNode(condition.targetNodeId);

        // Check if this leads to another branch
        if (this.graphManager.isBranchNode(condition.targetNodeId)) {
          return this.resolveBranch(condition.targetNodeId);
        }

        return {
          nodeId: condition.targetNodeId,
          edgeId: `branch-${branchNodeId}-${condition.targetNodeId}`,
          isEnding: this.graphManager.isEndingNode(condition.targetNodeId),
        };
      }
    }

    // Use default if no conditions matched
    if (defaultTarget) {
      this.stateManager.setCurrentNode(defaultTarget);

      if (this.graphManager.isBranchNode(defaultTarget)) {
        return this.resolveBranch(defaultTarget);
      }

      return {
        nodeId: defaultTarget,
        edgeId: `branch-${branchNodeId}-default`,
        isEnding: this.graphManager.isEndingNode(defaultTarget),
      };
    }

    return null;
  }

  /**
   * Map edges to player choice structure (for AI to fill in text)
   */
  createChoiceStructure(edges: Edge[]): ChoiceStructure[] {
    return edges.map((edge, index) => ({
      index,
      edgeId: edge.id,
      choiceType: edge.choiceType,
      hint: edge.choiceHint,
      targetNodeId: edge.to,
    }));
  }

  /**
   * Validate that a choice selection is valid
   */
  validateChoice(choiceIndex: number, choices: PlayerChoice[]): ValidationError | null {
    if (choiceIndex < 0) {
      return { code: 'INVALID_INDEX', message: 'Choice index must be non-negative' };
    }

    if (choiceIndex >= choices.length) {
      return {
        code: 'INDEX_OUT_OF_BOUNDS',
        message: `Choice index ${choiceIndex} is out of bounds (max: ${choices.length - 1})`,
      };
    }

    const choice = choices[choiceIndex];
    const edge = this.graphManager.getEdge(choice.edgeId);

    if (!edge) {
      return { code: 'EDGE_NOT_FOUND', message: `Edge ${choice.edgeId} not found` };
    }

    if (!this.isEdgeAvailable(edge)) {
      return {
        code: 'EDGE_UNAVAILABLE',
        message: 'This choice is no longer available due to state changes',
      };
    }

    return null;
  }
}

export interface ResolvedChoice {
  nodeId: string;
  edgeId: string;
  isEnding: boolean;
}

export interface ChoiceStructure {
  index: number;
  edgeId: string;
  choiceType: string;
  hint: string;
  targetNodeId: string;
}

export interface ValidationError {
  code: string;
  message: string;
}
