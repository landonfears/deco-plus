import {
  getSystemEvents,
  type System,
  type EventData,
  type Component,
} from "./core-system";

export interface EventRelationship {
  from: string;
  to: string;
  type: "event";
  name: string;
  data?: {
    instanceId: string;
    targetInstanceId: string;
  };
}

export interface InstanceVisualizerData {
  id: string;
  data: Record<string, unknown>;
  childInstanceIds?: string[];
  parentInstanceId?: string;
  siblingInstanceIds?: string[];
  siblingIndex?: number;
}

export interface ComponentVisualizerData {
  name: string;
  parent: string | undefined;
  children: string[];
  instances: InstanceVisualizerData[];
}

export interface SystemVisualizerData {
  components: ComponentVisualizerData[];
  events?: EventRelationship[];
}

export const getVisualizerSystemData = async (
  system: System,
): Promise<SystemVisualizerData> => {
  const events: EventRelationship[] = [];
  const components = Array.from(system.getComponents());

  // Helper function to process event relationships
  const processEventRelationship = (
    sourceComponent: Component,
    sourceInstanceId: string,
    targetComponent: string,
    targetInstanceId: string,
    eventName: string,
  ) => {
    // Check if this event relationship already exists
    const exists = events.some(
      (e) =>
        e.from === sourceComponent.getName() &&
        e.to === targetComponent &&
        e.name === eventName &&
        e.data?.instanceId === sourceInstanceId &&
        e.data?.targetInstanceId === targetInstanceId,
    );

    if (!exists) {
      events.push({
        from: sourceComponent.getName(),
        to: targetComponent,
        type: "event",
        name: eventName,
        data: {
          instanceId: sourceInstanceId,
          targetInstanceId: targetInstanceId,
        },
      });
    }
  };

  // Helper function to simulate event handling
  const simulateEventHandler = async (
    sourceComponent: Component,
    sourceInstanceId: string,
    eventName: string,
    eventData: EventData,
  ) => {
    const handler = sourceComponent.getEventHandler(eventName);
    if (!handler) return;

    const result = await handler(sourceInstanceId, eventData, sourceComponent);
    if (result?.send) {
      for (const sendAction of result.send) {
        if (!sendAction.component) continue;
        const targetComponent = system.getComponent(sendAction.component);
        if (!targetComponent?.getEventHandler(sendAction.event)) continue;

        const targetInstanceId = (sendAction.data?.targetInstanceId ??
          sourceInstanceId) as string;
        const targetInstance = targetComponent.getInstance(targetInstanceId);
        if (!targetInstance) continue;

        processEventRelationship(
          sourceComponent,
          sourceInstanceId,
          sendAction.component,
          targetInstanceId,
          sendAction.event,
        );

        // Recursively simulate the target event handler
        await simulateEventHandler(
          targetComponent,
          targetInstanceId,
          sendAction.event,
          sendAction.data ?? {},
        );
      }
    }
  };

  // Simulate the initial INITIALIZED_SYSTEM event
  const systemComponent = system.getComponent("system");
  if (systemComponent) {
    const systemInstanceIds = systemComponent.getInstanceIds();
    if (systemInstanceIds.length > 0) {
      await simulateEventHandler(
        systemComponent,
        systemInstanceIds[0]!,
        "INITIALIZED_SYSTEM",
        {},
      );
    }
  }

  // Build component hierarchy
  const componentHierarchy = new Map<string, ComponentVisualizerData>();
  components.forEach((component) => {
    const parent = component.getParent();
    const children = component.getChildren();

    componentHierarchy.set(component.getName(), {
      name: component.getName(),
      parent: parent?.getName() ?? undefined,
      children: children.map((child) => child.getName()),
      instances: component.getInstanceIds().map((instanceId) => ({
        id: instanceId,
        data: component.getInstance(instanceId) ?? {},
        childInstanceIds: component.getInstance(instanceId)?.childInstanceIds,
        parentInstanceId: component.getInstance(instanceId)?.parentInstanceId,
        siblingInstanceIds:
          component.getInstance(instanceId)?.siblingInstanceIds,
        siblingIndex: component.getInstance(instanceId)?.siblingIndex,
      })),
    });
  });

  return {
    components: Array.from(componentHierarchy.values()),
    events,
  };
};
