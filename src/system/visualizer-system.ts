import { System } from "./core-system";

export const system = new System();

// Create components
const parent = system.createComponent("parent", {});
parent.on("STARTED_SYSTEM", async (instanceId, data) => {
  console.log(`Parent instance ${instanceId} received STARTED_SYSTEM event`);
  return { update: {} };
});

const child1 = system.createComponent("child1", {});
const child2 = system.createComponent("child2", {});
child2.on("HAD_HICCUPS", async (instanceId, data) => {
  console.log(`Child2 instance ${instanceId} received HAD_HICCUPS event`);
  return { update: {} };
});
const grandchild = system.createComponent("grandchild", {});
grandchild.on("STARTED_SYSTEM", async (instanceId, data) => {
  console.log(
    `Grandchild instance ${instanceId} received STARTED_SYSTEM event`,
  );
  return {
    send: [
      {
        component: "child2",
        event: "HAD_HICCUPS",
        data: { targetInstanceId: "child2_1" },
      },
    ],
  };
});

// Set up parent-child relationships
child1.setParent("parent");
child2.setParent("parent");
grandchild.setParent("child1");

// Create instances for each component with explicit IDs
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

// Set up system event handling with explicit instance targeting
const systemComponent = system.getComponent("system");
systemComponent?.createInstance("system", "system_1", {});

if (systemComponent) {
  systemComponent.on("INITIALIZED_SYSTEM", async (instanceId) => {
    console.log(`System instance ${instanceId} initialized`);
    return {
      send: [
        {
          component: "parent",
          event: "STARTED_SYSTEM",
          data: { targetInstanceId: "parent_1" },
        },
        {
          component: "grandchild",
          event: "STARTED_SYSTEM",
          data: { targetInstanceId: "grandchild_1" },
        },
      ],
    };
  });
}

// Initialize the system with explicit instance
system.queueEvent("system", "system_1", "INITIALIZED_SYSTEM", {});
system.processEvents().catch(console.error);
