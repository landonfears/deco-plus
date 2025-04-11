"use client";

import { useCallback, useEffect, type FC, useState, useMemo } from "react";
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
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  TOP_MARGIN,
  // type ComponentCounts,
  type EventRelationship,
  type NodeBounds,
  type HandleConnections,
  type SystemVisualizerProps,
  // getNodePosition,
  determineHandlePositions,
  // getEventRelationships,
  // getVisibleComponents,
  // hasAncestorDescendantRelationship,
  calculateContainerDimensions,
  calculatePositionForRoot,
  // calculateFilteredPosition,
  // hasCircularEventRelationship,
} from "~/lib/visualizer-utils";
import { usePrevious } from "~/hooks/use-previous";
import { cn } from "~/lib/utils";

type EdgeData = {
  label?: string;
  testid?: string;
  eventName?: string;
};
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
        className={cn(
          `relative flex h-full w-full flex-col ${
            data.hasChildren ? "" : "items-center justify-center"
          }`,
        )}
        data-testid={`node-${data.label}`}
      >
        <div className="text-lg font-bold text-neutral-600">{data.label}</div>
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

  const edgeData = data as EdgeData;
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={style}
        markerEnd={markerEnd}
        fill="none"
        data-testid={edgeData?.testid}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag nopan absolute z-[1000] rounded-md bg-pink-50 p-2 text-xs font-bold text-pink-700"
        >
          {edgeData?.label}
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

const FitNodes = ({
  filteredComponent,
  nodes,
}: {
  filteredComponent: string | null;
  nodes: Node[];
}) => {
  const { fitView } = useReactFlow();
  const lastFilteredComponent = usePrevious(filteredComponent);

  // Add effect to fit view when filtered component changes
  useEffect(() => {
    // Wait for nodes to be updated
    const timer = setTimeout(() => {
      if (lastFilteredComponent !== filteredComponent) {
        fitView({ padding: 0.3, duration: 300 });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [filteredComponent, fitView, lastFilteredComponent]);

  return null;
};

export const SystemVisualizer: FC<SystemVisualizerProps> = ({
  systemData,
  filterComponent = null,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [filteredComponent, setFilteredComponent] = useState<string | null>(
    filterComponent,
  );
  // useFitNodes({ filteredComponent, nodes });
  // Get all unique component names for the filter dropdown
  const componentNames = useMemo(() => {
    const names = new Set<string>();
    systemData.components.forEach((component) => {
      names.add(component.name);
    });
    return Array.from(names).sort();
  }, [systemData.components]);

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

    // Helper function to check if a component should be included
    const shouldIncludeComponent = (componentName: string): boolean => {
      if (!filteredComponent) return true;

      // Include the filtered component
      if (componentName === filteredComponent) return true;

      // Include the parent of the filtered component
      const filteredNode = systemData.components.find(
        (c) => c.name === filteredComponent,
      );
      if (filteredNode?.parent === componentName) return true;

      // Include all descendants of the filtered component
      const isDescendant = (current: string, ancestor: string): boolean => {
        if (current === ancestor) return true;
        const node = systemData.components.find((c) => c.name === current);
        if (!node?.parent) return false;
        return isDescendant(node.parent, ancestor);
      };

      if (isDescendant(componentName, filteredComponent)) return true;

      // Include all ancestors of the filtered component
      const isAncestor = (current: string, descendant: string): boolean => {
        return isDescendant(descendant, current);
      };

      if (isAncestor(componentName, filteredComponent)) return true;

      return false;
    };

    // Initialize handle connections for all nodes
    systemData.components.forEach((component) => {
      if (shouldIncludeComponent(component.name)) {
        handleConnections.set(component.name, {
          sourceHandles: [],
          targetHandles: [],
        });
      }
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
          const relativePos = childPositions.get(componentName) ?? {
            x: 0,
            y: TOP_MARGIN,
          };

          position = {
            x: parentBounds.x + relativePos.x,
            y: parentBounds.y + relativePos.y,
          };
        } else {
          // For root nodes, use the normal position calculation
          position = calculatePositionForRoot(componentName, systemData);
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
      // Skip if either component is not included in the filtered view
      if (
        !shouldIncludeComponent(event.from) ||
        !shouldIncludeComponent(event.to)
      )
        return;

      const eventPairKey = `${event.from}-${event.to}`;
      if (processedEventPairs.has(eventPairKey)) return;

      // Skip if it's a self-connection or creates a circular event path
      if (
        event.from === event.to ||
        hasCircularEventRelationship(
          event.from,
          event.to,
          systemData.events ?? [],
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

      // Create the edge with appropriate styling
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
      if (visited.has(componentName) || !shouldIncludeComponent(componentName))
        return;
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
            systemData,
            // filteredComponent,
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
            handleConnections.get(componentName)?.sourceHandles ?? [],
          targetHandles:
            handleConnections.get(componentName)?.targetHandles ?? [],
        },
        position,
        draggable: parentId ? false : true,
        parentNode: parentId,
        expandParent: false,
        style: {
          width,
          height,
          padding: 16,
          borderRadius: 4,
          zIndex: 0,
          border: "1px solid #999999",
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
      if (!component.parent && shouldIncludeComponent(component.name)) {
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
      if (
        !visited.has(component.name) &&
        shouldIncludeComponent(component.name)
      ) {
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
  }, [
    systemData.components,
    systemData.events,
    setNodes,
    setEdges,
    filteredComponent,
  ]);

  // Initialize the visualization when the component mounts
  useEffect(() => {
    buildComponentNodes();
  }, [buildComponentNodes]);

  return (
    <div
      className="flex h-full w-full flex-col"
      data-testid="system-visualizer"
    >
      <div className="border-b border-gray-200 p-4">
        <Select
          value={filteredComponent ?? "all"}
          onValueChange={(value: string) =>
            setFilteredComponent(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px]" data-testid="component-filter">
            <SelectValue placeholder="All Components" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            {componentNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <ReactFlowProvider>
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
            <FitNodes filteredComponent={filteredComponent} nodes={nodes} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export const SystemVisualizerWithProvider = (props: SystemVisualizerProps) => {
  return (
    <ReactFlowProvider>
      <SystemVisualizer {...props} />
    </ReactFlowProvider>
  );
};
