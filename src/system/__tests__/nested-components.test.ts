import { describe, test, expect } from "vitest";
import { System, Component } from "../core-system";

describe("Nested Components", () => {
  test("Component Creation - should create a component with a parent", () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child = system.createComponent("child", {}, "parent");

    const parentComponent = child.getParent();
    const childComponents = parent.getChildren();

    expect(parentComponent).toBeDefined();
    expect(childComponents).toBeDefined();
    expect(childComponents).toContain(child);
  });

  test("Component Creation - should create a component with multiple children", () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child1 = system.createComponent("child1", {}, "parent");
    const child2 = system.createComponent("child2", {}, "parent");

    const childComponents = parent.getChildren();
    const parent1 = child1.getParent();
    const parent2 = child2.getParent();

    expect(childComponents).toBeDefined();
    expect(childComponents).toContain(child1);
    expect(childComponents).toContain(child2);
    expect(parent1).toBeDefined();
    expect(parent2).toBeDefined();
    expect(parent1).toBe(parent);
    expect(parent2).toBe(parent);
  });

  test("Component Creation - should create a component with children in one call", () => {
    const system = new System();
    const parent = system.createComponentWithChildren("parent", {}, [
      { name: "child1", dataModel: {} },
      { name: "child2", dataModel: {} },
    ]);

    const children = parent.getChildren();
    expect(children).toBeDefined();
    expect(children).toHaveLength(2);
    expect(children[0]?.getName()).toBe("child1");
    expect(children[1]?.getName()).toBe("child2");
  });

  test("Instance Management - should create instances for parent and children", () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child = system.createComponent("child", {});
    child.setParent("parent");

    const COMPONENT_ORDER = ["parent", "child"] as const;

    // Parent instances
    parent.createInstanceInOrder("parent_1", {}, COMPONENT_ORDER);
    child.createInstanceInOrder("child_1", {}, COMPONENT_ORDER);

    const parentInstance = parent.getInstance("parent_1");
    const childInstance = child.getInstance("child_1");

    expect(parentInstance).toBeDefined();
    expect(childInstance).toBeDefined();
  });

  test("Instance Management - should maintain instance hierarchy", () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child = system.createComponent("child", {});
    const grandchild = system.createComponent("grandchild", {});
    child.setParent("parent");
    grandchild.setParent("child");

    const COMPONENT_ORDER = ["parent", "child", "grandchild"] as const;

    // Parent instances
    parent.createInstanceInOrder("parent_test", {}, COMPONENT_ORDER);
    child.createInstanceInOrder("child_test", {}, COMPONENT_ORDER);
    grandchild.createInstanceInOrder("grandchild_test", {}, COMPONENT_ORDER);

    const parentInstance = parent.getInstance("parent_test");
    const childInstance = child.getInstance("child_test");
    const grandchildInstance = grandchild.getInstance("grandchild_test");

    expect(parentInstance).toBeDefined();
    expect(childInstance).toBeDefined();
    expect(grandchildInstance).toBeDefined();
  });

  test("Event Propagation - should propagate events from child to parent", async () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child = system.createComponent("child", {});
    const COMPONENT_ORDER = [
      "system",
      "parent",
      "child",
      "grandchild",
    ] as const;

    const systemComponent = system.getComponent("system");
    systemComponent!.createInstanceInOrder("system_test", {}, COMPONENT_ORDER);
    parent.createInstanceInOrder("parent_test", {}, COMPONENT_ORDER);
    child.createInstanceInOrder("child_test", {}, COMPONENT_ORDER);

    let parentEventReceived = false;
    let childEventReceived = false;

    parent.on("test", async () => {
      parentEventReceived = true;
      return {};
    });

    child.on("test", async () => {
      childEventReceived = true;
      return {};
    });

    systemComponent!.on("INITIALIZED_SYSTEM", async (instanceId) => {
      return {
        send: [
          {
            component: "parent",
            event: "test",
            data: { targetInstanceId: "parent_test" },
          },
          {
            component: "child",
            event: "test",
            data: { targetInstanceId: "child_test" },
          },
        ],
      };
    });

    system.queueEvent("system", "system_1", "INITIALIZED_SYSTEM", {});
    await system.processEvents();

    expect(childEventReceived).toBe(true);
    expect(parentEventReceived).toBe(true);
  });

  test("Event Propagation - should not propagate events if shouldPropagateToParent returns false", async () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child = system.createComponent("child", {}, "parent");

    let parentEventReceived = false;
    let childEventReceived = false;

    parent.on("test", async () => {
      parentEventReceived = true;
      return {};
    });

    child.on("test", async () => {
      childEventReceived = true;
      return {};
    });

    // Create a new component that doesn't propagate events
    const nonPropagatingChild = system.createComponent(
      "nonPropagatingChild",
      {},
      "parent",
    );
    nonPropagatingChild.on("test", async () => {
      return { update: {}, send: [] }; // Return empty send array to prevent propagation
    });

    parent.createInstance("parent", "test", {});
    nonPropagatingChild.createInstance(
      "nonPropagatingChild",
      "nonPropagatingChild_test",
      {},
    );

    await nonPropagatingChild.processEvent(
      "nonPropagatingChild_test",
      "test",
      {},
    );

    expect(parentEventReceived).toBe(false);
  });

  test("Component Hierarchy - should get all descendants of a component", () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child1 = system.createComponent("child1", {}, "parent");
    const child2 = system.createComponent("child2", {}, "parent");
    const grandchild = system.createComponent("grandchild", {}, "child1");

    const descendants = system.getDescendants("parent");
    expect(descendants).toBeDefined();
    expect(descendants).toHaveLength(3);
    expect(descendants).toContain(child1);
    expect(descendants).toContain(child2);
    expect(descendants).toContain(grandchild);
  });

  test("Component Hierarchy - should get all ancestors of a component", () => {
    const system = new System();
    const parent = system.createComponent("parent", {});
    const child = system.createComponent("child", {}, "parent");
    const grandchild = system.createComponent("grandchild", {}, "child");

    const ancestors = system.getAncestors("grandchild");
    expect(ancestors).toBeDefined();
    expect(ancestors).toHaveLength(2);
    expect(ancestors).toContain(child);
    expect(ancestors).toContain(parent);
  });
});
