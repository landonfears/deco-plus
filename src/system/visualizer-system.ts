import { System, type Component, type ComponentData } from "./core-system";

export const system = new System();

// Create components
// Set up system event handling with explicit instance targeting
const systemComponent = system.getComponent("system");
systemComponent!.createInstance("system", "system_1", {});

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
  // Only process if this event is meant for this instance

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

// Define the order of components for instance creation
const COMPONENT_ORDER = [
  "system",
  "parent",
  "child1",
  "child2",
  "grandchild",
] as const;

// Create instances for each component with explicit IDs, grouped by component type
// System instances
if (systemComponent) {
  systemComponent.createInstanceInOrder(
    "system_1",
    {
      name: "Main System",
      status: "active",
    },
    COMPONENT_ORDER,
  );
}

// Parent instances
parent.createInstanceInOrder(
  "parent_1",
  {
    name: "Main Parent",
    status: "active",
  },
  COMPONENT_ORDER,
);
parent.createInstanceInOrder(
  "parent_2",
  {
    name: "Backup Parent",
    status: "standby",
  },
  COMPONENT_ORDER,
);
parent.createInstanceInOrder(
  "parent_3",
  {
    name: "Alternate Parent",
    status: "standby",
  },
  COMPONENT_ORDER,
);
parent.createInstanceInOrder(
  "parent_4",
  {
    name: "Parent 4",
    status: "standby",
  },
  COMPONENT_ORDER,
);
parent.createInstanceInOrder(
  "parent_5",
  {
    name: "Parent 5",
    status: "standby",
  },
  COMPONENT_ORDER,
);
parent.createInstanceInOrder(
  "parent_6",
  {
    name: "Parent 6",
    status: "standby",
  },
  COMPONENT_ORDER,
);
parent.createInstanceInOrder(
  "parent_7",
  {
    name: "Parent 7",
    status: "standby",
  },
  COMPONENT_ORDER,
);

// Child1 instances
child1.createInstanceInOrder(
  "child1_1",
  {
    name: "Primary Child 1",
    role: "processor",
  },
  COMPONENT_ORDER,
);
child1.createInstanceInOrder(
  "child1_2",
  {
    name: "Secondary Child 1",
    role: "backup",
  },
  COMPONENT_ORDER,
);
child1.createInstanceInOrder(
  "child1_3",
  {
    name: "Tertiary Child 1",
    role: "monitor",
  },
  COMPONENT_ORDER,
);

// Child2 instances
child2.createInstanceInOrder(
  "child2_1",
  {
    name: "Primary Child 2",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_2",
  {
    name: "Secondary Child 2",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1a",
  {
    name: "Primary Child 2a",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1b",
  {
    name: "Primary Child 2b",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1c",
  {
    name: "Primary Child 2c",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1d",
  {
    name: "Primary Child 2d",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1e",
  {
    name: "Primary Child 2e",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1f",
  {
    name: "Primary Child 2f",
    type: "worker",
  },
  COMPONENT_ORDER,
);
child2.createInstanceInOrder(
  "child2_1g",
  {
    name: "Primary Child 2g",
    type: "worker",
  },
  COMPONENT_ORDER,
);

// Grandchild instances
grandchild.createInstanceInOrder(
  "grandchild_1",
  {
    name: "First Grandchild",
    priority: "high",
  },
  COMPONENT_ORDER,
);
grandchild.createInstanceInOrder(
  "grandchild_2",
  {
    name: "Second Grandchild",
    priority: "medium",
  },
  COMPONENT_ORDER,
);
grandchild.createInstanceInOrder(
  "grandchild_3",
  {
    name: "Third Grandchild",
    priority: "low",
  },
  COMPONENT_ORDER,
);
grandchild.createInstanceInOrder(
  "grandchild_4",
  {
    name: "4th Grandchild",
    priority: "low",
  },
  COMPONENT_ORDER,
);

if (systemComponent) {
  systemComponent.on("INITIALIZED_SYSTEM", async (instanceId) => {
    console.log(`System instance ${instanceId} initialized`);
    return {
      send: [
        {
          component: "grandchild",
          event: "STARTED_SYSTEM",
          data: {
            targetInstanceId: "grandchild_1",
          },
        },
      ],
    };
  });
}

systemComponent!.setInstanceParent("parent_6", "system_1");
parent.setInstanceParent("child1_1", "parent_1");
parent.setInstanceParent("child1_2", "parent_1");
parent.setInstanceParent("child1_3", "parent_2");
parent.setInstanceParent("child2_1", "parent_2");
parent.setInstanceParent("child2_1a", "parent_2");
parent.setInstanceParent("child2_1b", "parent_2");
parent.setInstanceParent("child2_1c", "parent_2");
parent.setInstanceParent("child2_1d", "parent_2");
parent.setInstanceParent("child2_1e", "parent_2");
parent.setInstanceParent("child2_2", "parent_3");
parent.setInstanceParent("child2_1f", "parent_5");
parent.setInstanceParent("child2_1g", "parent_5");
child1.setInstanceParent("grandchild_1", "child1_1");
child2.setInstanceParent("grandchild_2", "child2_1");
child2.setInstanceParent("grandchild_3", "child2_2");
child2.setInstanceParent("grandchild_4", "child2_1a");

// Initialize the system with explicit instance
system.queueEvent("system", "system_1", "INITIALIZED_SYSTEM", {});
system.processEvents().catch(console.error);
