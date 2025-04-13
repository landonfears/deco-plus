import { getVisualizerSystemData } from "../visualizer";
import { system } from "../visualizer-system";

describe("Visualizer", () => {
  it("should identify event relationships without triggering events", async () => {
    // Get the system data with event relationships
    const systemData = await getVisualizerSystemData(system);

    // Verify the system component -> grandchild relationship exists
    const systemToGrandchild = systemData.events?.find(
      (e) =>
        e.from === "system" &&
        e.to === "grandchild" &&
        e.name === "STARTED_SYSTEM" &&
        e.data?.targetInstanceId === "grandchild_1",
    );
    expect(systemToGrandchild).toBeDefined();

    // Verify the grandchild -> child2 relationship exists
    const grandchildToChild2 = systemData.events?.find(
      (e) =>
        e.from === "grandchild" &&
        e.to === "child2" &&
        e.name === "HAD_HICCUPS" &&
        e.data?.targetInstanceId === "child2_1",
    );
    expect(grandchildToChild2).toBeDefined();

    // Verify no other grandchild instances are sending HAD_HICCUPS events
    const otherGrandchildEvents = systemData.events?.filter(
      (e) =>
        e.from === "grandchild" &&
        e.name === "HAD_HICCUPS" &&
        e.data?.instanceId !== "grandchild_1",
    );
    expect(otherGrandchildEvents).toHaveLength(0);
  });

  it("should include all component instances in the visualization", async () => {
    const systemData = await getVisualizerSystemData(system);

    // Verify system component exists with its instance
    const systemComponent = systemData.components.find(
      (c) => c.name === "system",
    );
    expect(systemComponent).toBeDefined();
    expect(systemComponent?.instances).toContainEqual(
      expect.objectContaining({ id: "system_1" }),
    );

    // Verify grandchild component exists with all its instances
    const grandchildComponent = systemData.components.find(
      (c) => c.name === "grandchild",
    );
    expect(grandchildComponent).toBeDefined();
    expect(grandchildComponent?.instances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "grandchild_1" }),
        expect.objectContaining({ id: "grandchild_2" }),
        expect.objectContaining({ id: "grandchild_3" }),
        expect.objectContaining({ id: "grandchild_4" }),
      ]),
    );
  });

  it("should maintain parent-child relationships in the visualization", async () => {
    const systemData = await getVisualizerSystemData(system);

    // Verify parent-child relationships
    const parentComponent = systemData.components.find(
      (c) => c.name === "parent",
    );
    expect(parentComponent).toBeDefined();
    expect(parentComponent?.children).toContain("child1");
    expect(parentComponent?.children).toContain("child2");

    const child1Component = systemData.components.find(
      (c) => c.name === "child1",
    );
    expect(child1Component).toBeDefined();
    expect(child1Component?.parent).toBe("parent");
    expect(child1Component?.children).toContain("grandchild");
  });

  it("should only send STARTED_SYSTEM event to grandchild_1", async () => {
    const systemData = await getVisualizerSystemData(system);

    // Verify that only grandchild_1 receives the STARTED_SYSTEM event
    const startedSystemEvents =
      systemData.events?.filter(
        (e) => e.name === "STARTED_SYSTEM" && e.to === "grandchild",
      ) ?? [];
    expect(startedSystemEvents).toHaveLength(1);
    expect(startedSystemEvents[0]?.data?.targetInstanceId).toBe("grandchild_1");

    // Verify no other grandchild instances receive STARTED_SYSTEM events
    const otherGrandchildStartedSystemEvents =
      systemData.events?.filter(
        (e) =>
          e.name === "STARTED_SYSTEM" &&
          e.to === "grandchild" &&
          e.data?.targetInstanceId !== "grandchild_1",
      ) ?? [];
    expect(otherGrandchildStartedSystemEvents).toHaveLength(0);
  });
});
