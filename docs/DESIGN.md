# Network Narrative Engine - Design Document

## Overview

The Network Narrative Engine is a system for creating branching interactive narratives where users make meaningful choices that lead to distinct endings. It combines a structured narrative graph with AI-powered dialogue generation to create dynamic, personalized story experiences.

## Core Concepts

### 1. Narrative Graph Structure

The narrative graph is a directed graph where:
- **Nodes** represent story states (scenes, beats, or moments)
- **Edges** represent transitions triggered by user choices
- **Entry Nodes** are starting scenarios
- **Terminal Nodes** are endings

```
[Entry A] ──┐
            ├──► [Node 1] ──► [Node 2] ──┬──► [Ending X]
[Entry B] ──┘         │           │      │
                      ▼           ▼      │
                 [Node 3] ◄── [Node 4] ──┴──► [Ending Y]
                      │
                      ▼
                 [Ending Z]
```

### 2. Node Types

| Type | Description |
|------|-------------|
| `entry` | Starting scenarios users can choose |
| `story` | Standard narrative nodes with choices |
| `branch` | Conditional nodes based on world state |
| `converge` | Nodes where multiple paths merge |
| `ending` | Terminal nodes representing conclusions |

### 3. World State

A key-value store tracking:
- Player attributes (relationships, reputation, resources)
- Story flags (events witnessed, secrets learned)
- Character states (alive, disposition, location)

## User Input Schema

Authors define narratives through a JSON schema:

```json
{
  "narrative": {
    "id": "unique-story-id",
    "title": "Story Title",
    "description": "Brief story premise"
  },
  "characters": [...],
  "worldState": {...},
  "nodes": [...],
  "edges": [...]
}
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Author Input                             │
│  (Narrative Schema JSON)                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Narrative Engine                           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Graph Store │  │ State Manager│  │ Choice Generator  │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Integration Layer                      │
│  ┌─────────────────┐  ┌────────────────────────────────┐    │
│  │ Dialogue Gen    │  │ Choice Contextualization       │    │
│  └─────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     User Experience                          │
│  - Current scene narration                                   │
│  - NPC dialogue                                              │
│  - Three contextual choices                                  │
└─────────────────────────────────────────────────────────────┘
```

## AI Integration Strategy

### Dialogue Generation

The AI uses node context to generate:
1. **Scene narration** - Environmental descriptions
2. **Character dialogue** - In-character NPC responses
3. **Choice text** - Three contextual options

### Prompt Structure

```
System: You are the narrator for "{story_title}".

Context:
- Current scene: {node.description}
- Active characters: {characters in scene}
- World state: {relevant state values}
- Conversation history: {recent exchanges}

Generate:
1. Narration for the current moment
2. Any NPC dialogue
3. Three distinct choices for the player that lead to: {edge targets}
```

### Choice Mapping

Each generated choice maps to a defined edge:
- **Choice A** → Edge leading to Node X
- **Choice B** → Edge leading to Node Y
- **Choice C** → Edge leading to Node Z

The AI contextualizes these transitions into natural dialogue options while preserving the narrative structure.

## Implementation Architecture

```
src/
├── types/
│   ├── narrative.ts      # Core type definitions
│   ├── state.ts          # World state types
│   └── ai.ts             # AI integration types
├── engine/
│   ├── NarrativeEngine.ts    # Main engine class
│   ├── GraphManager.ts       # Graph operations
│   ├── StateManager.ts       # World state management
│   └── ChoiceResolver.ts     # Choice → Edge resolution
├── ai/
│   ├── AIProvider.ts         # AI provider interface
│   ├── DialogueGenerator.ts  # Generates contextual dialogue
│   └── prompts/              # Prompt templates
├── schema/
│   └── narrative.schema.json # JSON schema for validation
└── examples/
    └── detective-story.json  # Example narrative
```

## Key Design Decisions

### 1. Three Choices Per Turn
- Provides meaningful agency without overwhelming
- Maps cleanly to "positive/neutral/negative" or "approach/avoid/investigate"
- Consistent UX across all story beats

### 2. Structured Graph + AI Generation
- Graph ensures narrative coherence and author control
- AI provides natural language and personalization
- Best of both worlds: structure + flexibility

### 3. State-Driven Branching
- World state enables complex conditional logic
- Supports relationship tracking, resource management
- Allows for state-gated content (locked paths)

### 4. Convergent Paths
- Not pure branching (exponential explosion)
- Paths can merge at key story moments
- Keeps content manageable while maintaining choice impact
