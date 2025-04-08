import { System } from "./core-system";

export const system = new System();

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
