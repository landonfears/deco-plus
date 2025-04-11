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

// Create instances for each component
parent.createInstance("parent", "parent_1", {
  name: "Main Parent",
  status: "active",
});
parent.createInstance("parent", "parent_2", {
  name: "Backup Parent",
  status: "standby",
});

child1.createInstance("child1", "child1_1", {
  name: "Primary Child 1",
  role: "processor",
});
child1.createInstance("child1", "child1_2", {
  name: "Secondary Child 1",
  role: "backup",
});
child1.createInstance("child1", "child1_3", {
  name: "Tertiary Child 1",
  role: "monitor",
});

child2.createInstance("child2", "child2_1", {
  name: "Primary Child 2",
  type: "worker",
});
child2.createInstance("child2", "child2_2", {
  name: "Secondary Child 2",
  type: "worker",
});

grandchild.createInstance("grandchild", "grandchild_1", {
  name: "First Grandchild",
  priority: "high",
});
grandchild.createInstance("grandchild", "grandchild_2", {
  name: "Second Grandchild",
  priority: "medium",
});
grandchild.createInstance("grandchild", "grandchild_3", {
  name: "Third Grandchild",
  priority: "low",
});

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
