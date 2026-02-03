/**
 * StateManager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../engine/StateManager';
import type { WorldStateDefinition, Character } from '../types';

describe('StateManager', () => {
  let stateManager: StateManager;
  const testDefinition: WorldStateDefinition = {
    player: {
      courage: { type: 'number', default: 50, min: 0, max: 100 },
      hasKey: { type: 'boolean', default: false },
    },
    flags: {
      metHero: { type: 'boolean', default: false },
      foundTreasure: { type: 'boolean', default: false },
    },
    resources: {
      gold: { type: 'number', default: 100, min: 0 },
    },
  };

  const testCharacters: Character[] = [
    {
      id: 'hero',
      name: 'Hero',
      description: 'The brave hero',
      personality: 'Courageous',
      traits: ['brave', 'kind'],
      initialRelationship: 0,
    },
    {
      id: 'villain',
      name: 'Villain',
      description: 'The evil villain',
      personality: 'Menacing',
      traits: ['cunning', 'cruel'],
      initialRelationship: -20,
    },
  ];

  beforeEach(() => {
    stateManager = new StateManager(testDefinition, testCharacters, 'start-node');
  });

  describe('initialization', () => {
    it('initializes player attributes with defaults', () => {
      const state = stateManager.getState();
      expect(state.player.courage).toBe(50);
      expect(state.player.hasKey).toBe(false);
    });

    it('initializes flags with defaults', () => {
      const state = stateManager.getState();
      expect(state.flags.metHero).toBe(false);
      expect(state.flags.foundTreasure).toBe(false);
    });

    it('initializes resources with defaults', () => {
      const state = stateManager.getState();
      expect(state.resources.gold).toBe(100);
    });

    it('initializes character relationships', () => {
      const state = stateManager.getState();
      expect(state.characters.hero.relationship).toBe(0);
      expect(state.characters.villain.relationship).toBe(-20);
    });

    it('sets initial node ID', () => {
      expect(stateManager.getCurrentNodeId()).toBe('start-node');
    });

    it('starts with turn count of 0', () => {
      expect(stateManager.getTurnCount()).toBe(0);
    });
  });

  describe('state modifications', () => {
    it('can set a value', () => {
      stateManager.applyModifications([
        { target: 'player.courage', type: 'set', value: 75 },
      ]);
      expect(stateManager.getState().player.courage).toBe(75);
    });

    it('can add to a value', () => {
      stateManager.applyModifications([
        { target: 'player.courage', type: 'add', value: 10 },
      ]);
      expect(stateManager.getState().player.courage).toBe(60);
    });

    it('can subtract from a value', () => {
      stateManager.applyModifications([
        { target: 'resources.gold', type: 'subtract', value: 30 },
      ]);
      expect(stateManager.getState().resources.gold).toBe(70);
    });

    it('can toggle a flag', () => {
      stateManager.applyModifications([
        { target: 'flags.metHero', type: 'toggle', value: true },
      ]);
      expect(stateManager.getState().flags.metHero).toBe(true);

      stateManager.applyModifications([
        { target: 'flags.metHero', type: 'toggle', value: true },
      ]);
      expect(stateManager.getState().flags.metHero).toBe(false);
    });

    it('can modify character relationships', () => {
      stateManager.applyModifications([
        { target: 'character.hero.relationship', type: 'add', value: 25 },
      ]);
      expect(stateManager.getState().characters.hero.relationship).toBe(25);
    });

    it('clamps relationship values to -100 to 100', () => {
      stateManager.applyModifications([
        { target: 'character.hero.relationship', type: 'add', value: 150 },
      ]);
      expect(stateManager.getState().characters.hero.relationship).toBe(100);

      stateManager.applyModifications([
        { target: 'character.hero.relationship', type: 'subtract', value: 250 },
      ]);
      expect(stateManager.getState().characters.hero.relationship).toBe(-100);
    });
  });

  describe('condition evaluation', () => {
    it('evaluates equality conditions', () => {
      expect(
        stateManager.evaluateCondition({
          type: 'state',
          target: 'player.courage',
          operator: '==',
          value: 50,
        })
      ).toBe(true);

      expect(
        stateManager.evaluateCondition({
          type: 'state',
          target: 'player.courage',
          operator: '==',
          value: 60,
        })
      ).toBe(false);
    });

    it('evaluates greater than conditions', () => {
      expect(
        stateManager.evaluateCondition({
          type: 'state',
          target: 'player.courage',
          operator: '>',
          value: 40,
        })
      ).toBe(true);

      expect(
        stateManager.evaluateCondition({
          type: 'state',
          target: 'player.courage',
          operator: '>',
          value: 50,
        })
      ).toBe(false);
    });

    it('evaluates flag conditions', () => {
      expect(
        stateManager.evaluateCondition({
          type: 'flag',
          target: 'metHero',
          operator: '==',
          value: false,
        })
      ).toBe(true);
    });

    it('evaluates relationship conditions', () => {
      expect(
        stateManager.evaluateCondition({
          type: 'relationship',
          target: 'villain',
          operator: '<',
          value: 0,
        })
      ).toBe(true);
    });
  });

  describe('character presence', () => {
    it('sets character presence', () => {
      stateManager.setCharacterPresence(['hero']);

      const present = stateManager.getPresentCharacters();
      expect(present).toHaveLength(1);
      expect(present[0].character.id).toBe('hero');
    });

    it('can have multiple characters present', () => {
      stateManager.setCharacterPresence(['hero', 'villain']);

      const present = stateManager.getPresentCharacters();
      expect(present).toHaveLength(2);
    });

    it('clears previous presence when setting new', () => {
      stateManager.setCharacterPresence(['hero']);
      stateManager.setCharacterPresence(['villain']);

      const present = stateManager.getPresentCharacters();
      expect(present).toHaveLength(1);
      expect(present[0].character.id).toBe('villain');
    });
  });

  describe('history tracking', () => {
    it('records choices in history', () => {
      stateManager.recordChoice('node-1', 0, 'Go left');
      stateManager.recordChoice('node-2', 1, 'Talk to hero');

      const history = stateManager.getRecentHistory(5);
      expect(history).toHaveLength(2);
      expect(history[0].nodeId).toBe('node-1');
      expect(history[1].nodeId).toBe('node-2');
    });

    it('increments turn count when recording choices', () => {
      stateManager.recordChoice('node-1', 0, 'Go left');
      expect(stateManager.getTurnCount()).toBe(1);

      stateManager.recordChoice('node-2', 1, 'Talk');
      expect(stateManager.getTurnCount()).toBe(2);
    });

    it('respects history limit in getRecentHistory', () => {
      for (let i = 0; i < 10; i++) {
        stateManager.recordChoice(`node-${i}`, 0, `Choice ${i}`);
      }

      const history = stateManager.getRecentHistory(3);
      expect(history).toHaveLength(3);
      expect(history[0].nodeId).toBe('node-7');
    });

    it('evaluates history conditions', () => {
      stateManager.recordChoice('important-node', 0, 'Key choice');

      expect(
        stateManager.evaluateCondition({
          type: 'history',
          target: 'important-node',
          operator: 'has',
          value: 'important-node',
        })
      ).toBe(true);

      expect(
        stateManager.evaluateCondition({
          type: 'history',
          target: 'other-node',
          operator: 'lacks',
          value: 'other-node',
        })
      ).toBe(true);
    });
  });

  describe('serialization', () => {
    it('exports and imports state correctly', () => {
      stateManager.applyModifications([
        { target: 'player.courage', type: 'set', value: 75 },
        { target: 'flags.metHero', type: 'set', value: true },
      ]);
      stateManager.recordChoice('test-node', 0, 'Test');

      const exported = stateManager.exportState();
      const newManager = new StateManager(testDefinition, testCharacters, 'start');
      newManager.importState(exported);

      const state = newManager.getState();
      expect(state.player.courage).toBe(75);
      expect(state.flags.metHero).toBe(true);
      expect(state.turnCount).toBe(1);
    });
  });
});
