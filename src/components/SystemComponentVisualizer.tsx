"use client";

import {
  useCallback,
  useEffect,
  type FC,
  useState,
  useMemo,
  Fragment,
} from "react";
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  TOP_MARGIN,
  NODES_PER_ROW,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  NODE_PADDING,
  PARENT_CHILD_PADDING,
  // type ComponentCounts,
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
  hasCircularEventRelationship,
  // calculateFilteredPosition,
  // hasCircularEventRelationship,
  type HierarchicalComponent,
  buildInstanceLabel,
  getComponentByInstanceId,
  getInstanceById,
  NODE_MIN_WIDTH,
  NODE_MIN_HEIGHT,
  type NodeShiftedVertical,
  splitInstanceLabel,
  getComponentByComponentId,
  getHierarchicalInstances,
  type SystemComponent,
} from "~/lib/visualizer-utils";
import { nodeTypes } from "~/components/visualizer/component-node";
import { edgeTypes } from "~/components/visualizer/custom-edge";
import { FitNodes } from "~/components/visualizer/fit-nodes";
import { ChevronRightIcon, CornerDownRightIcon } from "lucide-react";
import type {
  ComponentVisualizerData,
  InstanceVisualizerData,
} from "~/system/visualizer";

export const SystemComponentVisualizer: FC<SystemVisualizerProps> = ({
  systemData,
  filterInstance = null,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [filteredInstance, setFilteredInstance] = useState<string | null>(
    filterInstance,
  );

  // Get hierarchical components for the filter dropdown
  const hierarchicalComponents = useMemo(() => {
    return systemData.components;
  }, [systemData.components]);

  // Render hierarchical select items
  const renderHierarchicalItems = (components: SystemComponent[]) => {
    return components.map((component) => {
      return (
        <SelectGroup key={component.name}>
          <SelectLabel>{component.name}</SelectLabel>
          <Fragment>
            {component.instances.map((instance) => {
              return (
                <Fragment key={instance.id}>
                  <SelectItem value={instance.id}>
                    <p>{(instance.data.name as string) ?? instance.id}</p>
                  </SelectItem>
                </Fragment>
              );
            })}
          </Fragment>
        </SelectGroup>
      );
    });
  };

  // Update buildComponentNodes to handle event edges
  const buildComponentNodes = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const visited = new Set<string>();
    const handleConnections = new Map<string, HandleConnections>();
    const nodeDimensions = new Map<string, NodeBounds>();
    const nodeShiftedMaxY = new Map<string, number[]>();
    // Constants for layout

    // Helper function to check if a component should be included
    const shouldIncludeInstance = (instanceId: string): boolean => {
      if (!filteredInstance) return true;

      const instance = getInstanceById(systemData, instanceId);
      if (!instance) return false;

      // Check if this is the filtered instance
      if (instanceId === filteredInstance) return true;

      // Get all ancestors
      const getAncestors = (currentId: string): string[] => {
        const current = getInstanceById(systemData, currentId);
        if (!current?.parentInstanceId) return [];
        return [
          current.parentInstanceId,
          ...getAncestors(current.parentInstanceId),
        ];
      };

      // Get all descendants
      const getDescendants = (currentId: string): string[] => {
        const current = getInstanceById(systemData, currentId);
        if (!current?.childInstanceIds?.length) return [];
        return [
          ...current.childInstanceIds,
          ...current.childInstanceIds.flatMap(getDescendants),
        ];
      };

      // Check if filtered instance is an ancestor or descendant
      const ancestors = getAncestors(instanceId);
      const descendants = getDescendants(instanceId);

      return (
        ancestors.includes(filteredInstance) ||
        descendants.includes(filteredInstance)
      );
    };

    // Initialize handle connections for all nodes
    systemData.components.forEach((component) => {
      component.instances.forEach((instance) => {
        if (shouldIncludeInstance(instance.id)) {
          const instanceId = buildInstanceLabel(component.name, instance.id);
          handleConnections.set(instanceId, {
            sourceHandles: [],
            targetHandles: [],
          });
        }
      });
    });

    // Function to get or calculate node bounds
    const shiftNodePosition = (
      instanceId: string,
      shift: { x: number; y: number },
    ) => {
      const instanceLabel = buildInstanceLabel(
        getComponentByInstanceId(systemData, instanceId)!,
        instanceId,
      );
      const instanceBounds = nodeDimensions.get(instanceLabel);

      if (instanceBounds) {
        nodeDimensions.set(instanceLabel, {
          ...instanceBounds,
          x: instanceBounds.x + shift.x,
          y: instanceBounds.y + shift.y,
        });
      }
    };

    // Function to get or calculate node bounds
    const shiftNodeVerticalPosition = (instanceId: string) => {
      const instance = getInstanceById(systemData, instanceId);
      if (!instance?.siblingInstanceIds?.length) return;
      const siblingIndex = instance?.siblingIndex ?? 0;

      // Calculate which row this instance is on
      const rowNumber = Math.floor(siblingIndex / NODES_PER_ROW);

      let totalHeight = 0;
      for (let i = 0; i < rowNumber; i += 1) {
        let maxHeight = 0;
        for (let j = 0; j < NODES_PER_ROW; j += 1) {
          const siblingId =
            instance?.siblingInstanceIds?.[i * NODES_PER_ROW + j];
          if (siblingId) {
            const siblingLabel = buildInstanceLabel(
              getComponentByInstanceId(systemData, siblingId)!,
              siblingId,
            );
            const siblingBounds = nodeDimensions.get(siblingLabel);
            if (siblingBounds) {
              maxHeight = Math.max(maxHeight, siblingBounds.height);
            }
          }
        }
        totalHeight += maxHeight;
      }
      totalHeight += NODE_PADDING * rowNumber;
      if (instance.parentInstanceId) {
        totalHeight += TOP_MARGIN;
      }

      const instanceLabel = buildInstanceLabel(
        getComponentByInstanceId(systemData, instanceId)!,
        instanceId,
      );
      const instanceBounds = nodeDimensions.get(instanceLabel);

      if (instanceBounds) {
        nodeDimensions.set(instanceLabel, {
          ...instanceBounds,
          y: totalHeight,
        });
      }
    };

    const accomodateChildren = (instance: InstanceVisualizerData) => {
      // Increase parent width and height to accomodate new child, as well as shift siblings to the right and below

      if (instance.parentInstanceId) {
        const parentInstance = getInstanceById(
          systemData,
          instance.parentInstanceId,
        );
        if (parentInstance) {
          const totalRows = parentInstance?.childInstanceIds?.length
            ? Math.ceil(parentInstance.childInstanceIds.length / NODES_PER_ROW)
            : 0;
          let maxWidth = 0;
          let totalHeight = 0;
          for (let i = 0; i < totalRows; i += 1) {
            let rowWidth = 0;
            let maxHeight = 0;
            for (let j = 0; j < NODES_PER_ROW; j += 1) {
              const childId =
                parentInstance.childInstanceIds?.[i * NODES_PER_ROW + j];
              if (childId) {
                const childLabel = buildInstanceLabel(
                  getComponentByInstanceId(systemData, childId)!,
                  childId,
                );
                const childBounds = nodeDimensions.get(childLabel);
                if (childBounds) {
                  rowWidth += childBounds.width + NODE_PADDING;
                  maxHeight = Math.max(maxHeight, childBounds.height);
                }
              }
            }
            totalHeight += maxHeight;
            maxWidth = Math.max(maxWidth, rowWidth);
            // y += maxHeight + NODE_PADDING;
          }
          const parentLabel = buildInstanceLabel(
            getComponentByInstanceId(systemData, parentInstance.id)!,
            parentInstance.id,
          );
          const parentBounds = nodeDimensions.get(parentLabel);

          if (parentBounds) {
            const newWidth = maxWidth + NODE_PADDING;
            const widthDiff = newWidth - parentBounds.width;
            const newHeight =
              totalHeight + TOP_MARGIN + NODE_PADDING * totalRows;
            nodeDimensions.set(parentLabel, {
              ...parentBounds,
              width: newWidth,
              height: newHeight,
            });

            // shift all siblings on the same row to the right
            // and all siblings on the next row down
            parentInstance.siblingInstanceIds?.forEach((siblingId) => {
              const siblingInstance = getInstanceById(systemData, siblingId);

              if (siblingInstance?.siblingIndex !== undefined) {
                const isSameRow =
                  Math.floor(parentInstance.siblingIndex! / NODES_PER_ROW) ===
                  Math.floor(siblingInstance.siblingIndex / NODES_PER_ROW);
                if (
                  siblingInstance?.siblingIndex > parentInstance.siblingIndex!
                ) {
                  if (isSameRow) {
                    shiftNodePosition(siblingId, { x: widthDiff, y: 0 });
                  } else {
                    shiftNodeVerticalPosition(siblingId);
                  }
                }
              }
            });
          }
          accomodateChildren(parentInstance);
        }
      }
    };
    const getNodeBoundsAlt = (
      component: ComponentVisualizerData,
      instance: InstanceVisualizerData,
    ): NodeBounds => {
      const instanceLabel = buildInstanceLabel(component.name, instance.id);

      // get position
      const parentBounds = nodeDimensions.get(
        buildInstanceLabel(
          getComponentByInstanceId(systemData, instance.parentInstanceId!)!,
          instance.parentInstanceId!,
        ),
      );
      let x = parentBounds?.x !== undefined ? NODE_PADDING : 0;
      let y = parentBounds?.y !== undefined ? TOP_MARGIN : 0;

      if (
        instance.siblingInstanceIds?.length &&
        instance.siblingIndex !== undefined
      ) {
        // Compute x position
        const startIndex =
          Math.floor(instance.siblingIndex / NODES_PER_ROW) * NODES_PER_ROW;

        for (let i = startIndex; i < instance.siblingIndex; i += 1) {
          const siblingId = instance.siblingInstanceIds?.[i];

          if (siblingId) {
            const siblingBounds = nodeDimensions.get(
              buildInstanceLabel(
                getComponentByInstanceId(systemData, siblingId)!,
                siblingId,
              ),
            );
            if (siblingBounds) {
              x += siblingBounds.width + NODE_PADDING;
            }
          }
        }
        // Compute y position
        const endIndex = Math.floor(instance.siblingIndex / NODES_PER_ROW);
        for (let i = 0; i < endIndex; i += 1) {
          let maxHeight = 0;
          for (let j = 0; j < NODES_PER_ROW; j += 1) {
            const siblingId =
              instance.siblingInstanceIds?.[i * NODES_PER_ROW + j];
            if (siblingId) {
              const siblingBounds = nodeDimensions.get(
                buildInstanceLabel(
                  getComponentByInstanceId(systemData, siblingId)!,
                  siblingId,
                ),
              );
              if (siblingBounds) {
                maxHeight = Math.max(maxHeight, siblingBounds.height);
              }
            }
          }
          y += maxHeight + NODE_PADDING;
        }
      }

      // Get all siblings of the parent
      nodeDimensions.set(instanceLabel, {
        x,
        y,
        width: NODE_MIN_WIDTH,
        height: NODE_MIN_HEIGHT,
      });
      accomodateChildren(instance);

      const bounds = nodeDimensions.get(instanceLabel);
      return bounds!;
    };
    // const getNodeBounds = (fullInstanceId: string): NodeBounds => {
    //   if (!nodeDimensions.has(fullInstanceId)) {
    //     const { componentName, instanceId } =
    //       splitInstanceLabel(fullInstanceId);
    //     if (!componentName || !instanceId) {
    //       return { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    //     }

    //     const component = systemData.components.find(
    //       (c) => c.name === componentName,
    //     );
    //     const instance = component?.instances.find((i) => i.id === instanceId);

    //     if (!component || !instance) {
    //       return { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    //     }

    //     // Get child instances
    //     const childInstances = (instance.childInstanceIds ?? [])
    //       .map((childId) => {
    //         const childComponent = systemData.components.find((c) =>
    //           c.instances.some((i) => i.id === childId),
    //         );
    //         return childComponent
    //           ? buildInstanceLabel(childComponent.name, childId)
    //           : null;
    //       })
    //       .filter((id): id is string => id !== null);

    //     // Calculate dimensions based on children
    //     let width = DEFAULT_WIDTH;
    //     let height = DEFAULT_HEIGHT;

    //     if (childInstances.length > 0) {
    //       // Calculate how many rows and columns we need
    //       const numChildren = childInstances.length;
    //       const numCols = Math.min(NODES_PER_ROW, numChildren);
    //       const numRows = Math.ceil(numChildren / NODES_PER_ROW);

    //       // Width is based on actual number of columns needed
    //       width = numCols * DEFAULT_WIDTH + (numCols + 1) * NODE_PADDING;

    //       // Height is based on number of rows, with padding
    //       height =
    //         numRows * DEFAULT_HEIGHT +
    //         (numRows + 1) * NODE_PADDING +
    //         PARENT_CHILD_PADDING;
    //     }

    //     // Calculate position
    //     let position = { x: 0, y: 0 };

    //     if (instance.parentInstanceId) {
    //       // For child nodes, position relative to parent
    //       const parentComponent = systemData.components.find((c) =>
    //         c.instances.some((i) => i.id === instance.parentInstanceId),
    //       );

    //       if (parentComponent) {
    //         const parentId = buildInstanceLabel(
    //           parentComponent.name,
    //           instance.parentInstanceId,
    //         );
    //         const parentBounds = getNodeBounds(parentId);

    //         // Find all siblings that share the same parent
    //         const siblings = systemData.components.flatMap((c) =>
    //           c.instances
    //             .filter((i) => i.parentInstanceId === instance.parentInstanceId)
    //             .map((i) => buildInstanceLabel(c.name, i.id)),
    //         );

    //         const siblingIndex = siblings.indexOf(fullInstanceId);
    //         const row = Math.floor(siblingIndex / NODES_PER_ROW);
    //         const col = siblingIndex % NODES_PER_ROW;

    //         // Position relative to parent with padding
    //         position = {
    //           x:
    //             parentBounds.x +
    //             NODE_PADDING +
    //             col * (DEFAULT_WIDTH + NODE_PADDING),
    //           y:
    //             parentBounds.y +
    //             PARENT_CHILD_PADDING +
    //             row * (DEFAULT_HEIGHT + NODE_PADDING) +
    //             NODE_PADDING,
    //         };
    //       }
    //     } else {
    //       // For root nodes, position based on index
    //       const rootInstances = systemData.components.flatMap((c) =>
    //         c.instances
    //           .filter((i) => !i.parentInstanceId)
    //           .map((i) => buildInstanceLabel(c.name, i.id)),
    //       );

    //       const rootIndex = rootInstances.indexOf(fullInstanceId);
    //       const row = Math.floor(rootIndex / NODES_PER_ROW);
    //       const col = rootIndex % NODES_PER_ROW;

    //       position = {
    //         x: col * (DEFAULT_WIDTH + NODE_PADDING),
    //         y: row * (DEFAULT_HEIGHT + NODE_PADDING),
    //       };
    //     }

    //     nodeDimensions.set(fullInstanceId, {
    //       x: position.x,
    //       y: position.y,
    //       width,
    //       height,
    //     });
    //   }
    //   return nodeDimensions.get(fullInstanceId)!;
    // };

    // Create edges for events between instances
    const processedEventPairs = new Set<string>();

    // Build nodes for instances
    const boundsMap = new Map<string, NodeBounds>();
    systemData.components.forEach((component) => {
      component.instances.forEach((instance) => {
        if (!shouldIncludeInstance(instance.id)) return;
        if (!instance.id) return;

        const instanceId = buildInstanceLabel(component.name, instance.id);
        const bounds = getNodeBoundsAlt(component, instance);
        boundsMap.set(instanceId, bounds);
        // Find the parent component and create the full parent instance ID
        let parentNode: string | undefined;
        if (instance.parentInstanceId) {
          const parentComponent = systemData.components.find((c) =>
            c.instances.some((i) => i.id === instance.parentInstanceId),
          );
          if (parentComponent) {
            parentNode = buildInstanceLabel(
              parentComponent.name,
              instance.parentInstanceId,
            );
          }
        }

        newNodes.push({
          id: instanceId,
          type: "default",
          data: {
            label: `${component.name} (${instance.id})`,
            hasChildren: (instance.childInstanceIds ?? []).length > 0,
            sourceHandles:
              handleConnections.get(instanceId)?.sourceHandles ?? [],
            targetHandles:
              handleConnections.get(instanceId)?.targetHandles ?? [],
            instanceData: instance.data,
          },
          position: { x: bounds.x, y: bounds.y },
          draggable: !instance.parentInstanceId,
          parentNode,
          expandParent: false,
          style: {
            width: bounds.width,
            height: bounds.height,
            padding: 16,
            borderRadius: 4,
            zIndex: 0,
            border: "1px solid #999999",
          },
        });
      });
    });

    systemData.events?.forEach((event) => {
      const fromComponent = systemData.components.find(
        (c) => c.name === event.from,
      );
      const toComponent = systemData.components.find(
        (c) => c.name === event.to,
      );

      if (!fromComponent || !toComponent || !event.data) return;

      const fromInstanceId = buildInstanceLabel(
        event.from,
        event.data.instanceId,
      );
      const toInstanceId = buildInstanceLabel(
        event.to,
        event.data.targetInstanceId,
      );

      if (
        !shouldIncludeInstance(fromInstanceId) ||
        !shouldIncludeInstance(toInstanceId)
      )
        return;

      const eventPairKey = `${fromInstanceId}-${toInstanceId}`;
      if (processedEventPairs.has(eventPairKey)) return;

      if (
        fromInstanceId === toInstanceId ||
        hasCircularEventRelationship(
          fromInstanceId,
          toInstanceId,
          systemData.events ?? [],
        )
      ) {
        return;
      }
      const sourceBounds = boundsMap.get(fromInstanceId)!;
      const targetBounds = boundsMap.get(toInstanceId)!;

      // const sourceBounds = getNodeBounds(fromInstanceId);
      // const targetBounds = getNodeBounds(toInstanceId);

      const fromPos = { x: sourceBounds.x, y: sourceBounds.y };
      const toPos = { x: targetBounds.x, y: targetBounds.y };

      const { sourceHandle, targetHandle } = determineHandlePositions(
        fromPos,
        toPos,
        sourceBounds,
        targetBounds,
      );

      const sourceConn = handleConnections.get(fromInstanceId);
      const targetConn = handleConnections.get(toInstanceId);

      if (sourceConn && !sourceConn.sourceHandles.includes(sourceHandle)) {
        sourceConn.sourceHandles.push(sourceHandle);
      }
      if (targetConn && !targetConn.targetHandles.includes(targetHandle)) {
        targetConn.targetHandles.push(targetHandle);
      }

      newEdges.push({
        id: `${fromInstanceId}-${toInstanceId}-${event.name}`,
        source: fromInstanceId,
        target: toInstanceId,
        type: "custom",
        sourceHandle,
        targetHandle,
        data: {
          testid: `edge-${fromInstanceId}-${toInstanceId}-${event.name}`,
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

    // Hydrate node with dynamic dimensions
    // for each nodeDimension, find the node in newNodes and update the position and size
    nodeDimensions.forEach((bounds, instanceId) => {
      const node = newNodes.find((n) => n.id === instanceId);
      if (node) {
        node.position = { x: bounds.x, y: bounds.y };
        node.style!.width = bounds.width;
        node.style!.height = bounds.height;
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [systemData, setNodes, setEdges, filteredInstance]);

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
          value={filteredInstance ?? "all"}
          onValueChange={(value: string) =>
            setFilteredInstance(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px]" data-testid="instance-filter">
            <SelectValue>{filteredInstance ?? "All Instances"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Instances</SelectItem>
            {hierarchicalComponents &&
              renderHierarchicalItems(hierarchicalComponents)}
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
            <FitNodes filteredInstance={filteredInstance} nodes={nodes} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};
