import { System, type Component, type ComponentData } from "./core-system";

export const system = new System();

const systemComponent = system.getComponent("system");
systemComponent!.createInstance("system", "system_instance", {
  name: "Main System",
});

const parent = system.createComponent("parent", {});
const child = system.createComponent("child", {});
const grandchild = system.createComponent("grandchild", {});

const COMPONENT_ORDER = ["system", "parent", "child", "grandchild"] as const;

child.setParent("parent");
grandchild.setParent("child");

parent.createInstanceInOrder(
  "parent_susan",
  {
    name: "Susan",
    isSleeping: true,
  },
  COMPONENT_ORDER,
);
child.createInstanceInOrder(
  "child_thomas",
  {
    name: "Thomas",
    isSleeping: true,
  },
  COMPONENT_ORDER,
);
grandchild.createInstanceInOrder(
  "grandchild_richard",
  {
    name: "Richard",
    isSleeping: true,
  },
  COMPONENT_ORDER,
);

parent.setInstanceParent("child_thomas", "parent_susan"); // aligns with child.setParent("parent");
child.setInstanceParent("grandchild_richard", "child_thomas"); // aligns with grandchild.setParent("child");

systemComponent!.on("INITIALIZED_SYSTEM", async (instanceId) => {
  return {
    send: [
      {
        component: "parent",
        event: "SOMETHING_HAPPENED",
        data: {
          targetInstanceId: "parent_susan",
        },
      },
    ],
  };
});

parent.on("SOMETHING_HAPPENED", async (instanceId, data) => {
  return {
    update: {
      isSleeping: false,
    },
    send: [
      {
        component: "child",
        event: "SET_OFF_ALARM",
        data: {
          targetInstanceId: "child_thomas",
        },
      },
    ],
  };
});
child.on("SET_OFF_ALARM", async (instanceId, data) => {
  return {
    update: {
      isSleeping: false,
    },
    send: [
      {
        component: "grandchild",
        event: "SET_OFF_ALARM",
        data: {
          targetInstanceId: "grandchild_richard",
        },
      },
    ],
  };
});
grandchild.on("SET_OFF_ALARM", async (instanceId, data) => {
  return {
    update: {
      isSleeping: false,
    },
  };
});

// Initialize the system with explicit instance
system.queueEvent("system", "system_instance", "INITIALIZED_SYSTEM", {});
system.processEvents().catch(console.error);
