"use client";

import { useCallback, useEffect, type FC } from "react";
import ReactFlow, {
  type Node,
  type Edge,
  type NodeTypes,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  MarkerType,
  type EdgeTypes,
  type EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";

// Custom node component
const showOrHideStyle = (show: boolean) => {
  return {
    ...(show ? {} : { background: "transparent", border: 0 }),
  };
};
const ComponentNode = ({
  data,
  selected,
}: {
  data: {
    label: string;
    hasChildren?: boolean;
    targetHandles: string[];
    sourceHandles: string[];
  };
  selected?: boolean;
}) => {
  {
    /* <NodeResizer isVisible={selected} handleStyle={{ width: 8, height: 8 }} /> */
  }
  return (
    <>
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={showOrHideStyle(data.sourceHandles.includes("top"))}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={showOrHideStyle(data.sourceHandles.includes("right"))}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={showOrHideStyle(data.sourceHandles.includes("bottom"))}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={showOrHideStyle(data.sourceHandles.includes("left"))}
      />

      <div
        className={`relative flex h-full w-full flex-col ${
          data.hasChildren ? "" : "items-center justify-center"
        }`}
        data-testid={`node-${data.label}`}
      >
        <div className="text-lg font-bold text-neutral-800">{data.label}</div>
        {data.hasChildren && (
          <div className="flex-1" data-testid={`node-${data.label}-children`} />
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={showOrHideStyle(data.targetHandles.includes("top"))}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={showOrHideStyle(data.targetHandles.includes("right"))}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={showOrHideStyle(data.targetHandles.includes("bottom"))}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={showOrHideStyle(data.targetHandles.includes("left"))}
      />
    </>
  );
};
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) => {
  // Add padding based on the target position
  const getOffset = (position: Position) => {
    switch (position) {
      case Position.Left:
      case Position.Right:
        return 32; // More horizontal space for side arrows
      case Position.Top:
      case Position.Bottom:
        return 32; // More vertical space for top/bottom arrows
      default:
        return 32;
    }
  };

  const offset = getOffset(targetPosition);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
    offset,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={style}
        markerEnd={markerEnd}
        fill="none"
        data-testid={data?.testid}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag nopan absolute z-[1000] rounded-md bg-pink-50 p-2 text-xs font-bold text-pink-700"
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes: NodeTypes = {
  default: ComponentNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Add type for event relationships
interface EventRelationship {
  from: string;
  to: string;
  type: "event";
  name: string;
}

interface SystemVisualizerProps {
  systemData: {
    components: Array<{
      name: string;
      parent: string | undefined;
      children: string[];
    }>;
    events?: EventRelationship[];
  };
}

// Layout configuration
const NODE_MIN_WIDTH = 200;
const NODE_MIN_HEIGHT = 100;
const NODES_PER_ROW = 3;
const NODE_PARENT_PADDING = 30;
const TOP_MARGIN = 60; // Space for parent node's label
const NODE_MARGIN = NODE_PARENT_PADDING * 2; // Space between nodes
const ROW_MARGIN = 30; // Space between rows
const LEVEL_HEIGHT = 200;

// Add types for handle data
interface HandleConnections {
  sourceHandles: string[];
  targetHandles: string[];
}

// Add types for node bounds
interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Add function to determine handle positions based on relative node positions and dimensions
const determineHandlePositions = (
  source: { x: number; y: number },
  target: { x: number; y: number },
  sourceBounds: NodeBounds,
  targetBounds: NodeBounds,
): { sourceHandle: string; targetHandle: string } => {
  // Calculate center points
  const sourceCenter = {
    x: source.x + sourceBounds.width / 2,
    y: source.y + sourceBounds.height / 2,
  };
  const targetCenter = {
    x: target.x + targetBounds.width / 2,
    y: target.y + targetBounds.height / 2,
  };

  // Calculate the angle between centers
  const angle = Math.atan2(
    targetCenter.y - sourceCenter.y,
    targetCenter.x - sourceCenter.x,
  );
  const degrees = angle * (180 / Math.PI);

  // Check if nodes overlap vertically or horizontally
  const sourceVerticalRange = {
    min: source.y,
    max: source.y + sourceBounds.height,
  };
  const targetVerticalRange = {
    min: target.y,
    max: target.y + targetBounds.height,
  };
  const sourceHorizontalRange = {
    min: source.x,
    max: source.x + sourceBounds.width,
  };
  const targetHorizontalRange = {
    min: target.x,
    max: target.x + targetBounds.width,
  };

  const hasVerticalOverlap =
    sourceVerticalRange.min <= targetVerticalRange.max &&
    sourceVerticalRange.max >= targetVerticalRange.min;
  const hasHorizontalOverlap =
    sourceHorizontalRange.min <= targetHorizontalRange.max &&
    sourceHorizontalRange.max >= targetHorizontalRange.min;

  // Determine optimal handles based on angle and overlap
  if (hasVerticalOverlap) {
    // Nodes are at similar vertical positions
    if (targetCenter.x > sourceCenter.x) {
      return { sourceHandle: "right", targetHandle: "left" };
    } else {
      return { sourceHandle: "left", targetHandle: "right" };
    }
  }

  if (hasHorizontalOverlap) {
    // Nodes are at similar horizontal positions
    if (targetCenter.y > sourceCenter.y) {
      return { sourceHandle: "top", targetHandle: "bottom" };
    } else {
      return { sourceHandle: "bottom", targetHandle: "top" };
    }
  }
  console.log("deg start", degrees);
  // For diagonal relationships, use the angle to determine the best handles
  if (degrees >= -45 && degrees < 45) {
    // Target is to the right
    return { sourceHandle: "right", targetHandle: "left" };
  } else if (degrees >= 45 && degrees < 135) {
    // Target is below
    return { sourceHandle: "top", targetHandle: "bottom" };
  } else if (degrees >= 135 || degrees < -135) {
    // Target is to the left
    return { sourceHandle: "right", targetHandle: "left" };
  } else {
    // Target is above
    return { sourceHandle: "bottom", targetHandle: "top" };
  }
};

const calculateContainerDimensions = (
  componentName: string,
  systemData: SystemVisualizerProps["systemData"],
): {
  width: number;
  height: number;
  childPositions: Map<string, { x: number; y: number }>;
} => {
  // Find all immediate children
  const children = systemData.components.filter(
    (c) => c.parent === componentName,
  );
  if (!children.length) {
    return {
      width: NODE_MIN_WIDTH,
      height: NODE_MIN_HEIGHT,
      childPositions: new Map(),
    };
  }

  // Calculate child positions and collect their dimensions
  const childPositions = new Map<string, { x: number; y: number }>();
  let maxChildHeight = NODE_MIN_HEIGHT;

  children.forEach((child, index) => {
    // Get child's dimensions recursively
    const childDims = calculateContainerDimensions(child.name, systemData);
    maxChildHeight = Math.max(maxChildHeight, childDims.height);

    // Calculate row and column position
    const row = Math.floor(index / NODES_PER_ROW);
    const col = index % NODES_PER_ROW;

    // Calculate incremental padding
    const horizontalPadding = (col + 1) * NODE_PARENT_PADDING;
    const verticalPadding = (row + 1) * NODE_PARENT_PADDING;

    // Store position for this child
    childPositions.set(child.name, {
      x: horizontalPadding + col * (NODE_MIN_WIDTH + NODE_MARGIN),
      y: TOP_MARGIN + verticalPadding + row * (maxChildHeight + ROW_MARGIN),
    });
  });

  // Calculate container width and height to accommodate the incremental padding
  const numRows = Math.ceil(children.length / NODES_PER_ROW);
  const nodesInLastRow = children.length % NODES_PER_ROW || NODES_PER_ROW;
  const maxColsInAnyRow = Math.min(children.length, NODES_PER_ROW);

  const width = Math.max(
    NODE_MIN_WIDTH,
    maxColsInAnyRow * (NODE_MIN_WIDTH + NODE_MARGIN) +
      (maxColsInAnyRow + 1) * NODE_PARENT_PADDING -
      NODE_MARGIN,
  );

  const height =
    TOP_MARGIN +
    numRows * maxChildHeight +
    (numRows - 1) * ROW_MARGIN +
    (numRows + 1) * NODE_PARENT_PADDING;

  return { width, height, childPositions };
};

// Add this helper function to calculate cumulative width
const calculatePositionForRoot = (
  componentName: string,
  horizontalPosition: number,
  systemData: SystemVisualizerProps["systemData"],
): { x: number; y: number } => {
  // Find all root nodes (nodes without parents)
  const rootNodes = systemData.components.filter((c) => !c.parent);
  const currentRootIndex = rootNodes.findIndex((c) => c.name === componentName);

  if (currentRootIndex === -1) return { x: 0, y: 0 };

  // Calculate which row this node should be in
  const row = Math.floor(currentRootIndex / NODES_PER_ROW);
  const col = currentRootIndex % NODES_PER_ROW;

  // If this is the first node in a row, x should be 0
  if (col === 0) {
    return {
      x: 0,
      y: row * LEVEL_HEIGHT,
    };
  }

  // Calculate cumulative width of previous nodes in the same row
  let x = 0;
  for (let i = row * NODES_PER_ROW; i < currentRootIndex; i++) {
    const prevNode = rootNodes[i];
    if (!prevNode) break;
    const { width } = calculateContainerDimensions(prevNode.name, systemData);
    x += width + NODE_MARGIN;
  }

  return {
    x,
    y: row * LEVEL_HEIGHT,
  };
};

// Add helper function to check if two nodes have an ancestor/descendant relationship
const hasAncestorDescendantRelationship = (
  source: string,
  target: string,
  systemData: SystemVisualizerProps["systemData"],
): boolean => {
  // Check if target is a descendant of source
  const isDescendant = (current: string, ancestor: string): boolean => {
    if (current === ancestor) return true;
    const node = systemData.components.find((c) => c.name === current);
    if (!node || !node.parent) return false;
    return isDescendant(node.parent, ancestor);
  };

  // Check if source is a descendant of target (target is ancestor of source)
  const isAncestor = (current: string, descendant: string): boolean => {
    return isDescendant(descendant, current);
  };

  return isDescendant(target, source) || isAncestor(source, target);
};

export const SystemVisualizer: FC<SystemVisualizerProps> = ({ systemData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Add helper function to check if two nodes have a circular event relationship
  const hasCircularEventRelationship = (
    source: string,
    target: string,
    events: EventRelationship[],
    visited: Set<string> = new Set(),
  ): boolean => {
    if (visited.has(target)) {
      return target === source;
    }

    visited.add(target);
    const outgoingEvents = events.filter((e) => e.from === target);

    return outgoingEvents.some((event) =>
      hasCircularEventRelationship(source, event.to, events, new Set(visited)),
    );
  };

  // Update buildComponentNodes to handle event edges
  const buildComponentNodes = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const visited = new Set<string>();
    const handleConnections = new Map<string, HandleConnections>();
    const nodeDimensions = new Map<string, NodeBounds>();

    // Initialize handle connections for all nodes
    systemData.components.forEach((component) => {
      handleConnections.set(component.name, {
        sourceHandles: [],
        targetHandles: [],
      });
    });

    // Function to get or calculate node bounds
    const getNodeBounds = (componentName: string): NodeBounds => {
      if (!nodeDimensions.has(componentName)) {
        const { width, height } = calculateContainerDimensions(
          componentName,
          systemData,
        );

        // Find the component and its parent
        const component = systemData.components.find(
          (c) => c.name === componentName,
        );
        let position;

        if (component?.parent) {
          // For child nodes, get parent's bounds and add child's relative position
          const parentBounds = getNodeBounds(component.parent);
          const { childPositions } = calculateContainerDimensions(
            component.parent,
            systemData,
          );
          const relativePos = childPositions.get(componentName) || {
            x: 0,
            y: TOP_MARGIN,
          };

          position = {
            x: parentBounds.x + relativePos.x,
            y: parentBounds.y + relativePos.y,
          };
        } else {
          // For root nodes, use the normal position calculation
          position = calculatePositionForRoot(componentName, 0, systemData);
        }

        nodeDimensions.set(componentName, {
          x: position.x,
          y: position.y,
          width,
          height,
        });
      }
      return nodeDimensions.get(componentName)!;
    };

    // Create edges for events before building nodes
    const processedEventPairs = new Set<string>();

    systemData.events?.forEach((event) => {
      const eventPairKey = `${event.from}-${event.to}`;
      if (processedEventPairs.has(eventPairKey)) return;

      // Skip if it's a self-connection or creates a circular event path
      if (
        event.from === event.to ||
        hasCircularEventRelationship(
          event.from,
          event.to,
          systemData.events || [],
        )
      ) {
        return;
      }

      // Get node bounds
      const sourceBounds = getNodeBounds(event.from);
      const targetBounds = getNodeBounds(event.to);

      // Calculate positions based on the nodes' expected positions
      const fromPos = { x: sourceBounds.x, y: sourceBounds.y };
      const toPos = { x: targetBounds.x, y: targetBounds.y };

      // Determine optimal handles
      const { sourceHandle, targetHandle } = determineHandlePositions(
        fromPos,
        toPos,
        sourceBounds,
        targetBounds,
      );

      // Update handle connections
      const sourceConn = handleConnections.get(event.from);
      const targetConn = handleConnections.get(event.to);

      if (sourceConn && !sourceConn.sourceHandles.includes(sourceHandle)) {
        sourceConn.sourceHandles.push(sourceHandle);
      }
      if (targetConn && !targetConn.targetHandles.includes(targetHandle)) {
        targetConn.targetHandles.push(targetHandle);
      }

      newEdges.push({
        id: `${event.from}-${event.to}-${event.name}`,
        source: event.from,
        target: event.to,
        type: "custom",
        sourceHandle,
        targetHandle,
        data: {
          testid: `edge-${event.from}-${event.to}-${event.name}`,
          eventName: event.name,
          label: event.name,
        },
        style: {
          stroke: "#be185d",
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 24,
          height: 24,
          color: "#be185d",
        },
        zIndex: 1000,
      });

      processedEventPairs.add(eventPairKey);
    });

    const buildNode = (
      componentName: string,
      parentId?: string,
      level = 0,
      horizontalPosition = 0,
      parentChildPositions?: Map<string, { x: number; y: number }>,
    ) => {
      if (visited.has(componentName)) return;
      visited.add(componentName);

      const component = systemData.components.find(
        (c) => c.name === componentName,
      );
      if (!component) {
        console.warn(`Component ${componentName} not found in system data`);
        return;
      }

      const nodeId = componentName;
      const { width, height, childPositions } = calculateContainerDimensions(
        componentName,
        systemData,
      );

      const position = parentId
        ? (parentChildPositions?.get(componentName) ?? { x: 0, y: TOP_MARGIN })
        : calculatePositionForRoot(
            componentName,
            horizontalPosition,
            systemData,
          );

      // Check if any components have this node as their parent
      const hasChildren = systemData.components.some(
        (c) => c.parent === componentName,
      );

      // Add the node
      newNodes.push({
        id: nodeId,
        type: "default",
        data: {
          label: componentName,
          hasChildren,
          sourceHandles:
            handleConnections.get(componentName)?.sourceHandles || [],
          targetHandles:
            handleConnections.get(componentName)?.targetHandles || [],
        },
        position,
        draggable: parentId ? false : true,
        parentNode: parentId,
        expandParent: false,
        style: {
          width,
          height,
          padding: 0,
          borderRadius: 8,
          zIndex: 0,
        },
      });

      // Process children
      component.children.forEach((childName) => {
        buildNode(
          childName,
          nodeId,
          level + 1,
          horizontalPosition,
          childPositions,
        );
      });
    };

    // Build all components, starting with root components
    let rootIndex = 0;
    systemData.components.forEach((component) => {
      if (!component.parent) {
        const { childPositions } = calculateContainerDimensions(
          component.name,
          systemData,
        );
        buildNode(component.name, undefined, 0, rootIndex, childPositions);
        rootIndex++;
      }
    });

    // Build any remaining components that weren't reached through the root components
    systemData.components.forEach((component) => {
      if (!visited.has(component.name)) {
        const parentComponent = systemData.components.find(
          (c) => c.name === component.parent,
        );
        if (parentComponent) {
          const { childPositions } = calculateContainerDimensions(
            parentComponent.name,
            systemData,
          );
          buildNode(component.name, component.parent, 1, 0, childPositions);
        }
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [systemData.components, systemData.events, setNodes, setEdges]);

  // Initialize the visualization when the component mounts
  useEffect(() => {
    buildComponentNodes();
  }, [buildComponentNodes]);

  return (
    <div className="h-full w-full" data-testid="system-visualizer">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
        snapToGrid={true}
        snapGrid={[20, 20]}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        minZoom={0.1}
        maxZoom={2}
        className="bg-gray-50 [&_.react-flow__edge]:!z-[1000]"
      >
        <Background color="#aaaaaa" gap={20} />
        <Controls showInteractive={true} />
      </ReactFlow>
    </div>
  );
};
