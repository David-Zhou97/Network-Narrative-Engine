/**
 * GraphEditor - Visual editor for story graphs
 * Displays nodes and edges, allows inspection and editing
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GeneratedGraph, GeneratedNode, GeneratedEdge } from '../../../../src/types/storyCreation';
import { NodeEditor } from './NodeEditor';
import { EdgeEditor } from './EdgeEditor';
import styles from './GraphEditor.module.css';

interface GraphEditorProps {
  graph: GeneratedGraph;
  onUpdateGraph: (graph: GeneratedGraph) => void;
  onBack: () => void;
  onPublish: () => void;
}

interface NodePosition {
  x: number;
  y: number;
}

interface DragState {
  nodeId: string | null;
  offsetX: number;
  offsetY: number;
}

type ViewMode = 'graph' | 'list';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const LEVEL_HEIGHT = 150;
const HORIZONTAL_SPACING = 250;

export function GraphEditor({ graph, onUpdateGraph, onBack, onPublish }: GraphEditorProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<GeneratedNode | null>(null);
  const [editingEdge, setEditingEdge] = useState<GeneratedEdge | null>(null);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [dragState, setDragState] = useState<DragState>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate automatic layout on mount or graph change
  useEffect(() => {
    const newPositions = calculateLayout(graph);
    setPositions(newPositions);
  }, [graph.nodes.length, graph.edges.length]);

  // Calculate positions using a layered layout algorithm
  const calculateLayout = useCallback((g: GeneratedGraph): Record<string, NodePosition> => {
    const pos: Record<string, NodePosition> = {};
    const nodeById = new Map(g.nodes.map(n => [n.id, n]));
    const incomingEdges = new Map<string, string[]>();
    const outgoingEdges = new Map<string, string[]>();

    // Build edge maps
    for (const edge of g.edges) {
      if (!outgoingEdges.has(edge.from)) outgoingEdges.set(edge.from, []);
      if (!incomingEdges.has(edge.to)) incomingEdges.set(edge.to, []);
      outgoingEdges.get(edge.from)!.push(edge.to);
      incomingEdges.get(edge.to)!.push(edge.from);
    }

    // Assign levels using BFS from entry nodes
    const levels = new Map<string, number>();
    const entryNodes = g.nodes.filter(n => n.type === 'entry');
    const queue: Array<{ id: string; level: number }> = entryNodes.map(n => ({ id: n.id, level: 0 }));

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (levels.has(id)) continue;
      levels.set(id, level);

      const outgoing = outgoingEdges.get(id) || [];
      for (const nextId of outgoing) {
        if (!levels.has(nextId)) {
          queue.push({ id: nextId, level: level + 1 });
        }
      }

      // Handle branch node conditions
      const node = nodeById.get(id);
      if (node?.type === 'branch' && node.conditions) {
        for (const cond of node.conditions) {
          if (!levels.has(cond.targetNodeId)) {
            queue.push({ id: cond.targetNodeId, level: level + 1 });
          }
        }
      }
    }

    // Assign positions to remaining nodes (orphans)
    let maxLevel = Math.max(...Array.from(levels.values()), 0);
    for (const node of g.nodes) {
      if (!levels.has(node.id)) {
        levels.set(node.id, maxLevel + 1);
      }
    }

    // Group nodes by level
    const levelGroups = new Map<number, string[]>();
    for (const [nodeId, level] of levels) {
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level)!.push(nodeId);
    }

    // Assign positions
    for (const [level, nodeIds] of levelGroups) {
      const totalWidth = nodeIds.length * HORIZONTAL_SPACING;
      const startX = -totalWidth / 2 + HORIZONTAL_SPACING / 2;

      nodeIds.forEach((nodeId, index) => {
        pos[nodeId] = {
          x: startX + index * HORIZONTAL_SPACING + 400,
          y: level * LEVEL_HEIGHT + 50,
        };
      });
    }

    return pos;
  }, []);

  // Node dragging
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const nodePos = positions[nodeId] || { x: 0, y: 0 };
    setDragState({
      nodeId,
      offsetX: e.clientX / zoom - nodePos.x + pan.x / zoom,
      offsetY: e.clientY / zoom - nodePos.y + pan.y / zoom,
    });
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }, [positions, zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState.nodeId) {
      const newX = e.clientX / zoom - dragState.offsetX + pan.x / zoom;
      const newY = e.clientY / zoom - dragState.offsetY + pan.y / zoom;
      setPositions(prev => ({
        ...prev,
        [dragState.nodeId!]: { x: newX, y: newY },
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [dragState, zoom, pan, isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setDragState({ nodeId: null, offsetX: 0, offsetY: 0 });
    setIsPanning(false);
  }, []);

  // Canvas panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && e.target === e.currentTarget) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  }, [pan]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 2));
  }, []);

  // Node/Edge editing
  const handleNodeDoubleClick = useCallback((node: GeneratedNode) => {
    setEditingNode(node);
  }, []);

  const handleEdgeClick = useCallback((edge: GeneratedEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const handleEdgeDoubleClick = useCallback((edge: GeneratedEdge) => {
    setEditingEdge(edge);
  }, []);

  const handleSaveNode = useCallback((updatedNode: GeneratedNode) => {
    const newNodes = graph.nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    onUpdateGraph({ ...graph, nodes: newNodes });
    setEditingNode(null);
  }, [graph, onUpdateGraph]);

  const handleSaveEdge = useCallback((updatedEdge: GeneratedEdge) => {
    const newEdges = graph.edges.map(e => e.id === updatedEdge.id ? updatedEdge : e);
    onUpdateGraph({ ...graph, edges: newEdges });
    setEditingEdge(null);
  }, [graph, onUpdateGraph]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const newNodes = graph.nodes.filter(n => n.id !== nodeId);
    const newEdges = graph.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    onUpdateGraph({ ...graph, nodes: newNodes, edges: newEdges });
    setEditingNode(null);
    setSelectedNodeId(null);
  }, [graph, onUpdateGraph]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    const newEdges = graph.edges.filter(e => e.id !== edgeId);
    onUpdateGraph({ ...graph, edges: newEdges });
    setEditingEdge(null);
    setSelectedEdgeId(null);
  }, [graph, onUpdateGraph]);

  // Get color for node type
  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'entry': return '#10b981';
      case 'story': return '#6366f1';
      case 'branch': return '#f59e0b';
      case 'converge': return '#8b5cf6';
      case 'ending': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Get ending type color
  const getEndingColor = (endingType?: string): string => {
    switch (endingType) {
      case 'good': return '#10b981';
      case 'neutral': return '#6b7280';
      case 'bad': return '#ef4444';
      case 'secret': return '#a78bfa';
      default: return '#ef4444';
    }
  };

  // Selected node/edge details
  const selectedNode = selectedNodeId ? graph.nodes.find(n => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? graph.edges.find(e => e.id === selectedEdgeId) : null;

  // Stats
  const stats = useMemo(() => ({
    total: graph.nodes.length,
    entries: graph.nodes.filter(n => n.type === 'entry').length,
    stories: graph.nodes.filter(n => n.type === 'story').length,
    branches: graph.nodes.filter(n => n.type === 'branch').length,
    endings: graph.nodes.filter(n => n.type === 'ending').length,
    edges: graph.edges.length,
  }), [graph]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <BackIcon />
          <span>Back to Editor</span>
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.title}>{graph.metadata.title}</h1>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'graph' ? styles.active : ''}`}
              onClick={() => setViewMode('graph')}
            >
              <GraphIcon />
              Graph
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              <ListIcon />
              List
            </button>
          </div>
        </div>
        <button className={styles.publishButton} onClick={onPublish}>
          Publish Story
        </button>
      </header>

      <div className={styles.content}>
        {/* Stats Panel */}
        <div className={styles.statsPanel}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Nodes</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.edges}</span>
            <span className={styles.statLabel}>Edges</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.entries}</span>
            <span className={styles.statLabel}>Entries</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.endings}</span>
            <span className={styles.statLabel}>Endings</span>
          </div>
        </div>

        {viewMode === 'graph' ? (
          /* Graph View */
          <div
            ref={containerRef}
            className={styles.graphContainer}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <svg
              className={styles.graphSvg}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              {/* Edges */}
              {graph.edges.map(edge => {
                const fromPos = positions[edge.from];
                const toPos = positions[edge.to];
                if (!fromPos || !toPos) return null;

                const isSelected = edge.id === selectedEdgeId;
                const fromX = fromPos.x + NODE_WIDTH / 2;
                const fromY = fromPos.y + NODE_HEIGHT;
                const toX = toPos.x + NODE_WIDTH / 2;
                const toY = toPos.y;

                // Curved path
                const midY = (fromY + toY) / 2;
                const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;

                return (
                  <g
                    key={edge.id}
                    onClick={() => handleEdgeClick(edge)}
                    onDoubleClick={() => handleEdgeDoubleClick(edge)}
                    style={{ cursor: 'pointer' }}
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke={isSelected ? '#a78bfa' : 'rgba(124, 58, 237, 0.4)'}
                      strokeWidth={isSelected ? 3 : 2}
                      className={styles.edgePath}
                    />
                    {/* Arrow */}
                    <polygon
                      points={`${toX},${toY} ${toX - 6},${toY - 10} ${toX + 6},${toY - 10}`}
                      fill={isSelected ? '#a78bfa' : 'rgba(124, 58, 237, 0.6)'}
                    />
                    {/* Edge label */}
                    {isSelected && (
                      <text
                        x={(fromX + toX) / 2}
                        y={midY - 10}
                        textAnchor="middle"
                        fill="#a78bfa"
                        fontSize="12"
                        className={styles.edgeLabel}
                      >
                        {edge.choiceHint.slice(0, 30)}...
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            <div
              className={styles.nodesContainer}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              {graph.nodes.map(node => {
                const pos = positions[node.id] || { x: 0, y: 0 };
                const isSelected = node.id === selectedNodeId;
                const nodeColor = node.type === 'ending'
                  ? getEndingColor(node.endingType)
                  : getNodeColor(node.type);

                return (
                  <div
                    key={node.id}
                    className={`${styles.node} ${isSelected ? styles.nodeSelected : ''}`}
                    style={{
                      left: pos.x,
                      top: pos.y,
                      borderColor: nodeColor,
                      boxShadow: isSelected ? `0 0 0 2px ${nodeColor}` : undefined,
                    }}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    onDoubleClick={() => handleNodeDoubleClick(node)}
                  >
                    <div
                      className={styles.nodeType}
                      style={{ backgroundColor: nodeColor }}
                    >
                      {node.type}
                      {node.type === 'ending' && node.endingType && (
                        <span> ({node.endingType})</span>
                      )}
                    </div>
                    <div className={styles.nodeContent}>
                      <div className={styles.nodeTitle}>
                        {node.title || node.beat || node.id}
                      </div>
                      <div className={styles.nodeDescription}>
                        {node.description?.slice(0, 60)}...
                      </div>
                    </div>
                    {node.characters && node.characters.length > 0 && (
                      <div className={styles.nodeCharacters}>
                        {node.characters.slice(0, 2).map(c => (
                          <span key={c} className={styles.characterBadge}>{c}</span>
                        ))}
                        {node.characters.length > 2 && (
                          <span className={styles.characterBadge}>+{node.characters.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zoom controls */}
            <div className={styles.zoomControls}>
              <button onClick={() => setZoom(z => Math.min(z * 1.2, 2))}>+</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))}>-</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
            </div>
          </div>
        ) : (
          /* List View */
          <div className={styles.listContainer}>
            <div className={styles.listSection}>
              <h3>Nodes ({graph.nodes.length})</h3>
              <div className={styles.nodeList}>
                {graph.nodes.map(node => (
                  <div
                    key={node.id}
                    className={`${styles.listItem} ${selectedNodeId === node.id ? styles.listItemSelected : ''}`}
                    onClick={() => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
                    onDoubleClick={() => setEditingNode(node)}
                  >
                    <span
                      className={styles.listItemType}
                      style={{ backgroundColor: node.type === 'ending' ? getEndingColor(node.endingType) : getNodeColor(node.type) }}
                    >
                      {node.type}
                    </span>
                    <span className={styles.listItemTitle}>
                      {node.title || node.beat || node.id}
                    </span>
                    <span className={styles.listItemId}>{node.id}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.listSection}>
              <h3>Edges ({graph.edges.length})</h3>
              <div className={styles.edgeList}>
                {graph.edges.map(edge => (
                  <div
                    key={edge.id}
                    className={`${styles.listItem} ${selectedEdgeId === edge.id ? styles.listItemSelected : ''}`}
                    onClick={() => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
                    onDoubleClick={() => setEditingEdge(edge)}
                  >
                    <span className={styles.edgeRoute}>
                      {edge.from} → {edge.to}
                    </span>
                    <span className={styles.edgeChoice}>{edge.choiceHint}</span>
                    {edge.conflict && (
                      <span className={styles.edgeConflict}>Conflict: {edge.conflict}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Details Panel */}
        <div className={styles.detailsPanel}>
          <h3>Details</h3>
          {selectedNode ? (
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>ID</span>
                <span className={styles.detailValue}>{selectedNode.id}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>{selectedNode.type}</span>
              </div>
              {selectedNode.title && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Title</span>
                  <span className={styles.detailValue}>{selectedNode.title}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Description</span>
                <span className={styles.detailValue}>{selectedNode.description}</span>
              </div>
              {selectedNode.context && (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Location</span>
                    <span className={styles.detailValue}>{selectedNode.context.location}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Mood</span>
                    <span className={styles.detailValue}>{selectedNode.context.mood}</span>
                  </div>
                </>
              )}
              <button
                className={styles.editButton}
                onClick={() => setEditingNode(selectedNode)}
              >
                Edit Node
              </button>
            </div>
          ) : selectedEdge ? (
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>From</span>
                <span className={styles.detailValue}>{selectedEdge.from}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>To</span>
                <span className={styles.detailValue}>{selectedEdge.to}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Choice Type</span>
                <span className={styles.detailValue}>{selectedEdge.choiceType}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Choice</span>
                <span className={styles.detailValue}>{selectedEdge.choiceHint}</span>
              </div>
              {selectedEdge.conflict && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Conflict</span>
                  <span className={styles.detailValue}>{selectedEdge.conflict}</span>
                </div>
              )}
              {selectedEdge.benefit && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Benefit</span>
                  <span className={styles.detailValue}>{selectedEdge.benefit}</span>
                </div>
              )}
              {selectedEdge.cost && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Cost</span>
                  <span className={styles.detailValue}>{selectedEdge.cost}</span>
                </div>
              )}
              <button
                className={styles.editButton}
                onClick={() => setEditingEdge(selectedEdge)}
              >
                Edit Edge
              </button>
            </div>
          ) : (
            <p className={styles.noSelection}>
              Click a node or edge to view details. Double-click to edit.
            </p>
          )}

          {graph.warnings && graph.warnings.length > 0 && (
            <div className={styles.warnings}>
              <h4>Warnings</h4>
              {graph.warnings.map((warning, i) => (
                <div key={i} className={styles.warning}>{warning}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Node Editor Modal */}
      <AnimatePresence>
        {editingNode && (
          <NodeEditor
            node={editingNode}
            characters={graph.characters}
            onSave={handleSaveNode}
            onDelete={() => handleDeleteNode(editingNode.id)}
            onClose={() => setEditingNode(null)}
          />
        )}
      </AnimatePresence>

      {/* Edge Editor Modal */}
      <AnimatePresence>
        {editingEdge && (
          <EdgeEditor
            edge={editingEdge}
            nodes={graph.nodes}
            onSave={handleSaveEdge}
            onDelete={() => handleDeleteEdge(editingEdge.id)}
            onClose={() => setEditingEdge(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Icons
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M8.5 8.5l7 7M15 6H9" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
