import type {
  ComponentVisualizerData,
  EventRelationship,
  InstanceVisualizerData,
  SystemVisualizerData,
} from "~/system/visualizer";
import type { System, Component } from "../system/core-system";

// Layout configuration
export const NODE_MIN_WIDTH = 200;
export const NODE_MIN_HEIGHT = 100;
export const NODES_PER_ROW = 3;
export const NODE_PARENT_PADDING = 30;
export const TOP_MARGIN = 60; // Space for parent node's label
export const NODE_MARGIN = NODE_PARENT_PADDING * 2; // Space between nodes
export const ROW_MARGIN = 30; // Space between rows
export const LEVEL_HEIGHT = 200;
export const HORIZONTAL_SPACING = 200;
export const VERTICAL_SPACING = 100;
export const DEFAULT_WIDTH = 200;
export const DEFAULT_HEIGHT = 100;
export const NODE_PADDING = 20;
export const PARENT_CHILD_PADDING = 40;

export interface SystemComponent {
  name: string;
  children: string[];
  parent: string | undefined;
  instances: InstanceVisualizerData[];
}

export interface ComponentCounts {
  visible: number;
  total: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeShiftedVertical {
  min: number;
  max: number;
}

export interface HandleConnections {
  sourceHandles: string[];
  targetHandles: string[];
}

export interface SimpleNode {
  id: string;
  position: {
    x: number;
    y: number;
  };
}

export interface SystemVisualizerProps {
  systemData: SystemVisualizerData;
  filterInstance?: string | null;
}

export function getNodePosition(
  nodeId: string,
  existingNodes: SimpleNode[],
): { x: number; y: number } {
  const existingNode = existingNodes.find((n) => n.id === nodeId);
  if (existingNode) {
    return { x: existingNode.position.x, y: existingNode.position.y };
  }
  // Generate a random position if not found
  return {
    x: Math.random() * 500,
    y: Math.random() * 500,
  };
}

export const determineHandlePositions = (
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

export function getEventRelationships(
  component: Component,
): EventRelationship[] {
  const relationships: EventRelationship[] = [];
  const eventNames = component.getRegisteredEventNames();

  for (const event of eventNames) {
    const handler = component.getEventHandler(event);
    if (handler) {
      relationships.push({
        from: component.getName(),
        to: component.getName(),
        type: "event",
        name: event,
      });
    }
  }

  return relationships;
}

export function getVisibleComponents(
  systemData: {
    components: Array<{
      name: string;
      parent: string | undefined;
      children: string[];
    }>;
  },
  filterComponent: string | null,
): string[] {
  if (!filterComponent) {
    return systemData.components.map((c) => c.name);
  }

  const visibleComponents = new Set<string>();
  const component = systemData.components.find(
    (c) => c.name === filterComponent,
  );

  if (component) {
    // Add the filtered component
    visibleComponents.add(component.name);

    // Add all children recursively
    const addChildren = (compName: string) => {
      const children = systemData.components.filter(
        (c) => c.parent === compName,
      );
      for (const child of children) {
        visibleComponents.add(child.name);
        addChildren(child.name);
      }
    };

    addChildren(component.name);
  }

  return Array.from(visibleComponents);
}

/*
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
    if (!node?.parent) return false;
    return isDescendant(node.parent, ancestor);
  };

  // Check if source is a descendant of target (target is ancestor of source)
  const isAncestor = (current: string, descendant: string): boolean => {
    return isDescendant(descendant, current);
  };

  return isDescendant(target, source) || isAncestor(source, target);
};
*/
export function hasAncestorDescendantRelationship(
  system: System,
  node1: string,
  node2: string,
): boolean {
  const component1 = system.getComponent(node1);
  const component2 = system.getComponent(node2);

  if (!component1 || !component2) return false;

  // Check if node1 is an ancestor of node2
  let current = component2;
  while (current) {
    const parent = current.getParent();
    if (!parent) break;
    if (parent.getName() === node1) return true;
    current = parent;
  }

  // Check if node2 is an ancestor of node1
  current = component1;
  while (current) {
    const parent = current.getParent();
    if (!parent) break;
    if (parent.getName() === node2) return true;
    current = parent;
  }

  return false;
}

export const calculateContainerDimensions = (
  componentName: string,
  systemData: SystemVisualizerProps["systemData"],
): {
  width: number;
  height: number;
  childPositions: Map<string, { x: number; y: number }>;
} => {
  // Find all immediate children
  const children: ComponentVisualizerData[] | InstanceVisualizerData[] =
    systemData.components.filter((c) => c.parent === componentName);

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
export const calculatePositionForRoot = (
  componentName: string,
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

export const hasCircularEventRelationship = (
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
// export function hasCircularEventRelationship(
//   from: string,
//   to: string,
//   events: EventRelationship[],
// ): boolean {
//   const visited = new Set<string>();
//   const stack = new Set<string>();

//   function hasCycle(node: string): boolean {
//     if (stack.has(node)) return true;
//     if (visited.has(node)) return false;

//     visited.add(node);
//     stack.add(node);

//     const outgoingEvents = events.filter((e) => e.from === node);
//     for (const event of outgoingEvents) {
//       if (hasCycle(event.to)) return true;
//     }

//     stack.delete(node);
//     return false;
//   }

//   return hasCycle(from);
// }

export function calculateFilteredPosition(
  componentName: string,
  systemData: { components: SystemComponent[] },
  filteredComponent: string | null,
): { x: number; y: number } {
  if (!filteredComponent) {
    return { x: 0, y: TOP_MARGIN };
  }

  const component = systemData.components.find((c) => c.name === componentName);
  if (!component) {
    return { x: 0, y: TOP_MARGIN };
  }

  // If this is the filtered component, position it at the top
  if (componentName === filteredComponent) {
    return { x: 0, y: 0 };
  }

  // If this is a child of the filtered component, position it below
  if (component.parent === filteredComponent) {
    const parent = systemData.components.find(
      (c) => c.name === filteredComponent,
    );
    if (!parent) {
      return { x: 0, y: TOP_MARGIN + VERTICAL_SPACING };
    }

    const childIndex = parent.children.indexOf(componentName);
    return {
      x: (childIndex + 1) * HORIZONTAL_SPACING,
      y: TOP_MARGIN + VERTICAL_SPACING,
    };
  }

  // If this is a parent of the filtered component, position it above
  if (component.children.includes(filteredComponent)) {
    return { x: 0, y: -VERTICAL_SPACING };
  }

  // Default position for other components
  return { x: 0, y: TOP_MARGIN };
}

export type EdgeData = {
  label?: string;
  testid?: string;
  eventName?: string;
};
// Custom node component
export const showOrHideStyle = (show: boolean) => {
  return {
    ...(show ? {} : { background: "transparent", border: 0 }),
  };
};

export interface HierarchicalComponent {
  name: string;
  children: HierarchicalComponent[];
  level: number;
}

export function getHierarchicalInstances(components: SystemComponent[]) {
  const instances = [];

  for (const component of components) {
    instances.push(...component.instances);
  }
  return instances;
}

export const getComponentByInstanceId = (
  systemData: SystemVisualizerData,
  instanceId: string,
) => {
  for (const component of systemData.components) {
    const foundInstance = component.instances.find(
      (instance) => instance.id === instanceId,
    );
    if (foundInstance) {
      return component.name;
    }
  }
  return undefined;
};

export const getInstanceById = (
  systemData: SystemVisualizerData,
  instanceId: string,
) => {
  for (const component of systemData.components) {
    const foundInstance = component.instances.find(
      (instance) => instance.id === instanceId,
    );
    if (foundInstance) {
      return foundInstance;
    }
  }
  return undefined;
};

export const getComponentByComponentId = (
  systemData: SystemVisualizerData,
  componentName: string,
) => {
  return systemData.components.find((c) => c.name === componentName);
};

export const buildInstanceLabel = (
  componentName: string,
  instanceId: string,
) => {
  return `${componentName}__${instanceId}`;
};

export const splitInstanceLabel = (
  instanceLabel: string,
): { componentName: string; instanceId: string } => {
  const [componentName, instanceId] = instanceLabel.split("__") as [
    string,
    string,
  ];
  return { componentName, instanceId };
};
