import { getSystemEvents, type System } from "./core-system";

export const getVisualizerSystemData = (system: System) => {
  // const system = visualizerSystem;

  // Get all registered events by checking event handlers
  const events: Array<{
    from: string;
    to: string;
    type: "event";
    name: string;
  }> = [];

  // Get all components
  const components = Array.from(system.getComponents());

  // For each component, check its event handlers and their send actions
  components.forEach((sourceComponent) => {
    const commonEvents = getSystemEvents(system);

    commonEvents.forEach((eventName) => {
      const handler = sourceComponent.getEventHandler(eventName);
      if (!handler) return;

      // Call the handler to see what events it sends
      handler("test_instance_id", {}, sourceComponent)
        .then((result) => {
          if (result?.send) {
            // For each event being sent, check if the target component has a handler for it
            result.send.forEach((sendAction) => {
              if (!sendAction.component) return;
              const targetComponent = system.getComponent(sendAction.component);
              if (targetComponent?.getEventHandler(sendAction.event)) {
                events.push({
                  from: sourceComponent.getName(),
                  to: sendAction.component,
                  type: "event",
                  name: sendAction.event,
                });
              }
            });
          }
        })
        .catch(console.error);
    });
  });

  return {
    components: components.map((component) => ({
      name: component.getName(),
      parent: component.getParent()?.getName() ?? undefined,
      children: component.getChildren().map((child) => child.getName()),
    })),
    events,
  };
};
