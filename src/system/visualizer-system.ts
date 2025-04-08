import { System } from "./core-system";

// Create a shared system instance
export const createVisualizerSystem = () => {
  const system = new System();

  // Create components
  const parent = system.createComponent("parent", {});
  parent.on("STARTED_SYSTEM", async (instanceId) => {
    console.log("Parent received STARTED_SYSTEM event");
    return { update: {} };
  });

  const child1 = system.createComponent("child1", {});
  const child2 = system.createComponent("child2", {});
  child2.on("HAD_HICCUPS", async (instanceId) => {
    console.log("Child2 received HAD_HICCUPS event");
    return { update: {} };
  });
  const grandchild = system.createComponent("grandchild", {});
  grandchild.on("STARTED_SYSTEM", async (instanceId) => {
    console.log("Grandchild received STARTED_SYSTEM event");
    return {
      send: [
        {
          component: "child2",
          event: "HAD_HICCUPS",
          data: {},
        },
      ],
    };
  });

  // Set up parent-child relationships
  child1.setParent("parent");
  child2.setParent("parent");
  grandchild.setParent("child1");

  // Set up system event handling
  const systemComponent = system.getComponent("system");
  if (systemComponent) {
    systemComponent.on("INITIALIZED_SYSTEM", async (instanceId) => {
      console.log("System initialized");
      return {
        send: [
          {
            component: "parent",
            event: "STARTED_SYSTEM",
            data: {},
          },
          {
            component: "grandchild",
            event: "STARTED_SYSTEM",
            data: {},
          },
        ],
      };
    });
  }

  // Initialize the system
  system.queueEvent("system", "system_1", "INITIALIZED_SYSTEM", {});
  system.processEvents().catch(console.error);

  return system;
};

// Create and export the system data
export const getVisualizerSystemData = () => {
  const system = createVisualizerSystem();

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
    // Try common events that we know exist in the system
    const commonEvents = [
      "INITIALIZED_SYSTEM",
      "STARTED_SYSTEM",
      "HAD_HICCUPS",
    ];

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
