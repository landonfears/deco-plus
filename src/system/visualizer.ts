import { getSystemEvents, type System, type EventData } from "./core-system";

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

export const getVisualizerSystemData = (
  system: System,
): SystemVisualizerData => {
  const events: EventRelationship[] = [];
  const components = Array.from(system.getComponents());

  // For each component, check its event handlers and their send actions
  components.forEach((sourceComponent) => {
    const commonEvents = getSystemEvents(system);
    const sourceInstances = sourceComponent.getInstanceIds();

    // For each instance of the source component
    sourceInstances.forEach((sourceInstanceId) => {
      commonEvents.forEach((eventName) => {
        const handler = sourceComponent.getEventHandler(eventName);
        if (!handler) return;

        // Call the handler with the actual instance ID
        handler(
          sourceInstanceId,
          { instanceId: sourceInstanceId } as EventData,
          sourceComponent,
        )
          .then((result) => {
            if (result?.send) {
              result.send.forEach((sendAction) => {
                if (!sendAction.component) return;
                const targetComponent = system.getComponent(
                  sendAction.component,
                );
                if (!targetComponent?.getEventHandler(sendAction.event)) return;

                // Get the target instance ID from the event data
                const targetInstanceId = (sendAction.data?.targetInstanceId ??
                  sourceInstanceId) as string;

                // Only create an event relationship if the target instance exists
                const targetInstance =
                  targetComponent.getInstance(targetInstanceId);
                if (!targetInstance) return;

                // Check if this event relationship already exists
                const eventKey = `${sourceComponent.getName()}_${sourceInstanceId}-${sendAction.component}_${targetInstanceId}-${sendAction.event}`;
                if (
                  events.some(
                    (e) =>
                      e.from === sourceComponent.getName() &&
                      e.to === sendAction.component &&
                      e.name === sendAction.event &&
                      e.data?.instanceId === sourceInstanceId &&
                      e.data?.targetInstanceId === targetInstanceId,
                  )
                )
                  return;

                events.push({
                  from: sourceComponent.getName(),
                  to: sendAction.component,
                  type: "event",
                  name: sendAction.event,
                  data: {
                    instanceId: sourceInstanceId,
                    targetInstanceId: targetInstanceId,
                  },
                });
              });
            }
          })
          .catch(console.error);
      });
    });
  });

  return {
    components: components.map((component) => ({
      name: component.getName(),
      parent: component.getParent()?.getName() ?? undefined,
      children: component.getChildren().map((child) => child.getName()),
      instances: component.getInstanceIds().map((instanceId) => ({
        id: instanceId,
        data: component.getInstance(instanceId) ?? {},
        childInstanceIds: component.getInstance(instanceId)?.childInstanceIds,
        parentInstanceId: component.getInstance(instanceId)?.parentInstanceId,
        siblingInstanceIds:
          component.getInstance(instanceId)?.siblingInstanceIds,
        siblingIndex: component.getInstance(instanceId)?.siblingIndex,
      })),
    })),
    events,
  };
};
