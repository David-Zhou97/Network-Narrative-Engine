# Network Narrative Engine

A TypeScript library for creating branching interactive narratives with AI-powered dialogue generation. Build story-driven chat experiences where users make meaningful choices that lead to distinct endings.

## Overview

The Network Narrative Engine combines structured narrative graphs with AI-generated dialogue to create dynamic, personalized story experiences. Users interact through curated conversations, choosing from three dialogue options per turn, navigating from multiple starting scenarios to varied endings.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Entry A     │────►│   Story      │────►│   Ending X   │
└──────────────┘     │   Nodes      │     └──────────────┘
                     │              │
┌──────────────┐     │   (choices)  │     ┌──────────────┐
│  Entry B     │────►│              │────►│   Ending Y   │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Key Features

- **Structured Narrative Graphs**: Define story structure with nodes (scenes) and edges (choices)
- **AI-Powered Dialogue**: Natural language generation for narration and NPC conversations
- **Three Choices Per Turn**: Consistent, meaningful player agency
- **World State Tracking**: Relationships, flags, resources that affect story progression
- **Multiple Endings**: Convergent paths leading to distinct conclusions
- **Session Persistence**: Save and resume player progress

## Installation

```bash
npm install network-narrative-engine
```

## Quick Start

```typescript
import { NarrativeEngine, DialogueGenerator, AnthropicClient } from 'network-narrative-engine';
import narrativeData from './my-story.json';

// Initialize the engine
const engine = new NarrativeEngine(narrativeData);

// Validate the narrative
const validation = engine.validate();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Set up AI provider (optional but recommended)
const aiClient = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });
const dialogueGenerator = new DialogueGenerator({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024
}, aiClient);
engine.setAIProvider(dialogueGenerator);

// Get available starting scenarios
const scenarios = engine.getStartingScenarios();
console.log('Available scenarios:', scenarios.map(s => s.title));

// Start a session
const session = engine.startSession(scenarios[0].id);

// Get the current turn
const turn = await engine.getCurrentTurn();
console.log(turn.narration);
turn.dialogues.forEach(d => console.log(`${d.characterName}: ${d.text}`));
turn.choices.forEach((c, i) => console.log(`${i + 1}. ${c.text}`));

// Make a choice (0, 1, or 2)
const nextTurn = await engine.makeChoice(1);

// Check for ending
if (nextTurn.isEnding) {
  console.log(`Ending: ${nextTurn.ending.title}`);
  console.log(nextTurn.ending.epilogue);
}
```

## Narrative Schema

Define your story as JSON:

```json
{
  "metadata": {
    "id": "my-story",
    "title": "My Interactive Story",
    "description": "A brief premise for your narrative"
  },
  "characters": [
    {
      "id": "npc1",
      "name": "Character Name",
      "description": "Who they are",
      "personality": "How they speak and act",
      "traits": ["trait1", "trait2"],
      "initialRelationship": 0
    }
  ],
  "worldState": {
    "player": {
      "courage": { "type": "number", "default": 50 }
    },
    "flags": {
      "discovered_secret": { "type": "boolean", "default": false }
    }
  },
  "nodes": [
    {
      "id": "start",
      "type": "entry",
      "title": "Beginning",
      "preview": "Where it all starts",
      "description": "Scene description for AI"
    },
    {
      "id": "scene1",
      "type": "story",
      "description": "What happens here",
      "beat": "Key story moment",
      "characters": ["npc1"]
    },
    {
      "id": "good_ending",
      "type": "ending",
      "endingType": "good",
      "title": "Happy End",
      "description": "Final scene",
      "epilogue": "What happens after"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "start",
      "to": "scene1",
      "choiceType": "agree",
      "choiceHint": "Accept the adventure"
    }
  ]
}
```

## Architecture

```
src/
├── types/           # TypeScript interfaces
│   ├── narrative.ts # Core narrative types
│   └── ai.ts        # AI integration types
├── engine/          # Core engine components
│   ├── NarrativeEngine.ts   # Main orchestrator
│   ├── GraphManager.ts      # Graph operations
│   ├── StateManager.ts      # World state
│   └── ChoiceResolver.ts    # Choice handling
├── ai/              # AI integration
│   ├── DialogueGenerator.ts # Turn generation
│   ├── AnthropicClient.ts   # Claude API
│   └── prompts/             # Prompt templates
└── examples/        # Example narratives
```

## Node Types

| Type | Description |
|------|-------------|
| `entry` | Starting scenarios (user picks one) |
| `story` | Standard scenes with 3 choices |
| `branch` | Automatic routing based on conditions |
| `converge` | Where multiple paths merge |
| `ending` | Terminal nodes (good/neutral/bad/secret) |

## Edge Choice Types

Edges define the available choices. Each has a `choiceType` that guides AI generation:

- `agree` - Cooperative, positive
- `refuse` - Resistant, negative
- `question` - Seeking information
- `deflect` - Avoiding, changing subject
- `confront` - Direct, aggressive
- `comfort` - Supportive, empathetic
- `investigate` - Explore, examine
- `leave` - Exit, depart
- `custom` - Author-defined

## State Conditions

Control path availability with conditions:

```json
{
  "conditions": [
    { "type": "flag", "target": "discovered_secret", "operator": "==", "value": true },
    { "type": "relationship", "target": "npc1", "operator": ">=", "value": 50 },
    { "type": "resource", "target": "gold", "operator": ">", "value": 100 }
  ]
}
```

## State Effects

Modify world state when choices are made:

```json
{
  "effects": [
    { "type": "set", "target": "flags.secret_found", "value": true },
    { "type": "add", "target": "character.npc1.relationship", "value": 20 },
    { "type": "subtract", "target": "resources.gold", "value": 50 }
  ]
}
```

## AI Integration

The engine supports pluggable AI providers. The default implementation uses Claude:

```typescript
// With AI (rich, contextual dialogue)
const aiClient = new AnthropicClient({ apiKey: 'your-key' });
engine.setAIProvider(new DialogueGenerator(config, aiClient));

// Without AI (uses choiceHint text directly)
// Just don't call setAIProvider()
```

## Session Management

```typescript
// Save session
const saveData = engine.exportSession();
localStorage.setItem('game_save', saveData);

// Load session
const savedSession = JSON.parse(localStorage.getItem('game_save'));
engine.resumeSession(savedSession);
```

## Documentation

- [Design Document](./docs/DESIGN.md) - Architecture and design decisions
- [Example Story](./examples/detective-mystery.json) - Complete detective narrative

## License

MIT
