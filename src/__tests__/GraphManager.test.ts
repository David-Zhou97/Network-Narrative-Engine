/**
 * GraphManager Tests
 */

import { describe, it, expect } from 'vitest';
import { GraphManager } from '../engine/GraphManager';
import type { NarrativeDefinition } from '../types';

const createTestDefinition = (overrides?: Partial<NarrativeDefinition>): NarrativeDefinition => ({
  metadata: {
    id: 'test-story',
    title: 'Test Story',
    description: 'A test narrative',
    version: '1.0.0',
    author: 'Test Author',
  },
  worldState: {
    player: {},
    flags: {},
    resources: {},
  },
  characters: [],
  nodes: [
    {
      id: 'entry-1',
      type: 'entry' as const,
      title: 'Beginning',
      description: 'The story begins...',
    },
    {
      id: 'story-1',
      type: 'story' as const,
      title: 'Middle',
      description: 'The story continues...',
    },
    {
      id: 'story-2',
      type: 'story' as const,
      title: 'Another Path',
      description: 'An alternate path...',
    },
    {
      id: 'ending-good',
      type: 'ending' as const,
      title: 'Good Ending',
      description: 'You won!',
      endingType: 'good',
      epilogue: 'And they lived happily ever after.',
    },
    {
      id: 'ending-bad',
      type: 'ending' as const,
      title: 'Bad Ending',
      description: 'You lost.',
      endingType: 'bad',
      epilogue: 'The end.',
    },
  ],
  edges: [
    {
      id: 'edge-1',
      from: 'entry-1',
      to: 'story-1',
      choiceType: 'continue',
      choiceHint: 'Continue',
    },
    {
      id: 'edge-2',
      from: 'entry-1',
      to: 'story-2',
      choiceType: 'explore',
      choiceHint: 'Explore',
    },
    {
      id: 'edge-3',
      from: 'story-1',
      to: 'ending-good',
      choiceType: 'win',
      choiceHint: 'Win',
    },
    {
      id: 'edge-4',
      from: 'story-1',
      to: 'ending-bad',
      choiceType: 'lose',
      choiceHint: 'Lose',
    },
    {
      id: 'edge-5',
      from: 'story-2',
      to: 'ending-good',
      choiceType: 'win',
      choiceHint: 'Win',
    },
  ],
  ...overrides,
});

describe('GraphManager', () => {
  describe('graph construction', () => {
    it('indexes all nodes', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      expect(manager.getNode('entry-1')).toBeDefined();
      expect(manager.getNode('story-1')).toBeDefined();
      expect(manager.getNode('ending-good')).toBeDefined();
    });

    it('indexes all edges', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      expect(manager.getEdge('edge-1')).toBeDefined();
      expect(manager.getEdge('edge-3')).toBeDefined();
    });

    it('returns undefined for non-existent nodes', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      expect(manager.getNode('non-existent')).toBeUndefined();
    });
  });

  describe('node queries', () => {
    it('finds all entry nodes', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const entries = manager.getEntryNodes();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('entry-1');
    });

    it('finds all ending nodes', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const endings = manager.getEndingNodes();
      expect(endings).toHaveLength(2);
      expect(endings.map(e => e.id)).toContain('ending-good');
      expect(endings.map(e => e.id)).toContain('ending-bad');
    });

    it('correctly identifies ending nodes', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      expect(manager.isEndingNode('ending-good')).toBe(true);
      expect(manager.isEndingNode('story-1')).toBe(false);
    });
  });

  describe('edge queries', () => {
    it('finds outgoing edges from a node', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const outgoing = manager.getOutgoingEdges('entry-1');
      expect(outgoing).toHaveLength(2);
      expect(outgoing.map(e => e.to)).toContain('story-1');
      expect(outgoing.map(e => e.to)).toContain('story-2');
    });

    it('finds incoming edges to a node', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const incoming = manager.getIncomingEdges('ending-good');
      expect(incoming).toHaveLength(2);
    });

    it('returns empty array for nodes with no edges', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      // Ending nodes have no outgoing edges
      const outgoing = manager.getOutgoingEdges('ending-good');
      expect(outgoing).toHaveLength(0);
    });

    it('sorts edges by priority', () => {
      const definition = createTestDefinition({
        edges: [
          {
            id: 'low-priority',
            from: 'entry-1',
            to: 'story-1',
            choiceType: 'continue',
            choiceHint: 'Low',
            priority: 1,
          },
          {
            id: 'high-priority',
            from: 'entry-1',
            to: 'story-2',
            choiceType: 'explore',
            choiceHint: 'High',
            priority: 10,
          },
        ],
      });
      const manager = new GraphManager(definition);

      const outgoing = manager.getOutgoingEdges('entry-1');
      expect(outgoing[0].id).toBe('high-priority');
      expect(outgoing[1].id).toBe('low-priority');
    });
  });

  describe('validation', () => {
    it('validates a correct graph', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const result = manager.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports error for missing entry nodes', () => {
      const definition = createTestDefinition({
        nodes: [
          {
            id: 'story-1',
            type: 'story',
            title: 'Story',
            description: 'A story without entry',
          },
          {
            id: 'ending-1',
            type: 'ending',
            title: 'Ending',
            description: 'An ending',
            endingType: 'neutral',
            epilogue: 'The end.',
          },
        ],
        edges: [
          {
            id: 'edge-1',
            from: 'story-1',
            to: 'ending-1',
            choiceType: 'end',
            choiceHint: 'End',
          },
        ],
      });
      const manager = new GraphManager(definition);

      const result = manager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('entry'))).toBe(true);
    });

    it('reports error for missing ending nodes', () => {
      const definition = createTestDefinition({
        nodes: [
          {
            id: 'entry-1',
            type: 'entry',
            title: 'Entry',
            description: 'An entry',
          },
          {
            id: 'story-1',
            type: 'story',
            title: 'Story',
            description: 'A story',
          },
        ],
        edges: [
          {
            id: 'edge-1',
            from: 'entry-1',
            to: 'story-1',
            choiceType: 'continue',
            choiceHint: 'Continue',
          },
        ],
      });
      const manager = new GraphManager(definition);

      const result = manager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ending'))).toBe(true);
    });

    it('reports error for dead-end story nodes', () => {
      const definition = createTestDefinition({
        nodes: [
          {
            id: 'entry-1',
            type: 'entry',
            title: 'Entry',
            description: 'An entry',
          },
          {
            id: 'story-1',
            type: 'story',
            title: 'Dead End',
            description: 'A dead end',
          },
          {
            id: 'ending-1',
            type: 'ending',
            title: 'Ending',
            description: 'An ending',
            endingType: 'neutral',
            epilogue: 'The end.',
          },
        ],
        edges: [
          {
            id: 'edge-1',
            from: 'entry-1',
            to: 'story-1',
            choiceType: 'continue',
            choiceHint: 'Continue',
          },
          // Missing edge from story-1 to ending
        ],
      });
      const manager = new GraphManager(definition);

      const result = manager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('story-1'))).toBe(true);
    });
  });

  describe('statistics', () => {
    it('returns correct graph statistics', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const stats = manager.getStats();
      expect(stats.totalNodes).toBe(5);
      expect(stats.totalEdges).toBe(5);
      expect(stats.entryNodes).toBe(1);
      expect(stats.endingNodes).toBe(2);
      expect(stats.storyNodes).toBe(2);
    });
  });

  describe('path finding', () => {
    it('finds all paths to endings', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const paths = manager.findAllPaths();

      // Should find 3 paths:
      // entry-1 -> story-1 -> ending-good
      // entry-1 -> story-1 -> ending-bad
      // entry-1 -> story-2 -> ending-good
      expect(paths).toHaveLength(3);

      const goodEndingPaths = paths.filter(p => p.ending.id === 'ending-good');
      expect(goodEndingPaths).toHaveLength(2);
    });

    it('respects max depth limit', () => {
      const definition = createTestDefinition();
      const manager = new GraphManager(definition);

      const paths = manager.findAllPaths(2);
      // With max depth 2, we can only reach nodes 2 hops away
      // From entry, we can reach story nodes but not endings
      expect(paths).toHaveLength(0);
    });
  });
});
