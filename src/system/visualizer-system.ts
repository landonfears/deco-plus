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
  const grandchild = system.createComponent("grandchild", {});

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

  // For INITIALIZED_SYSTEM -> STARTED_SYSTEM flow, we need:
  // 1. System component must have INITIALIZED_SYSTEM handler that sends STARTED_SYSTEM
  // 2. Parent component must have STARTED_SYSTEM handler to receive it
  const systemComponent = system.getComponent("system");
  const parentComponent = system.getComponent("parent");

  const systemHandler = systemComponent?.getEventHandler("INITIALIZED_SYSTEM");
  const parentHandler = parentComponent?.getEventHandler("STARTED_SYSTEM");

  // Only add the event edge if both sides of the relationship exist
  if (systemHandler && parentHandler) {
    events.push({
      from: "system",
      to: "parent",
      type: "event",
      name: "STARTED_SYSTEM",
    });
  }

  return {
    components: Array.from(system.getComponents()).map((component) => ({
      name: component.getName(),
      parent: component.getParent()?.getName() ?? undefined,
      children: component.getChildren().map((child) => child.getName()),
    })),
    events,
  };
};
