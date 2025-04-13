import { describe, it, expect } from "vitest";
import {
  getVisibleComponents,
  calculateFilteredPosition,
  hasAncestorDescendantRelationship,
} from "../visualizer-utils";
import { System } from "../../system/core-system";

describe("visualizer-utils", () => {
  const mockSystemData = {
    components: [
      { name: "Root1", parent: undefined, children: ["Child1"], instances: [] },
      { name: "Child1", parent: "Root1", children: [], instances: [] },
      { name: "Root2", parent: undefined, children: ["Child2"], instances: [] },
      { name: "Child2", parent: "Root2", children: [], instances: [] },
    ],
  };

  describe("getVisibleComponents", () => {
    it("returns all components when no filter is applied", () => {
      const visible = getVisibleComponents(mockSystemData, null);
      expect(visible).toEqual(["Root1", "Child1", "Root2", "Child2"]);
    });

    it("returns only the filtered component and its children", () => {
      const visible = getVisibleComponents(mockSystemData, "Root1");
      expect(visible).toEqual(["Root1", "Child1"]);
    });

    it("returns only the filtered component when it has no children", () => {
      const visible = getVisibleComponents(mockSystemData, "Child1");
      expect(visible).toEqual(["Child1"]);
    });
  });

  describe("calculateFilteredPosition", () => {
    it("returns default position when no filter is applied", () => {
      const position = calculateFilteredPosition("Root1", mockSystemData, null);
      expect(position).toEqual({ x: 0, y: 60 }); // TOP_MARGIN is 60
    });

    it("centers the filtered component", () => {
      const position = calculateFilteredPosition(
        "Root1",
        mockSystemData,
        "Root1",
      );
      expect(position).toEqual({ x: 0, y: 0 });
    });

    it("positions children relative to their filtered parent", () => {
      const position = calculateFilteredPosition(
        "Child1",
        mockSystemData,
        "Root1",
      );
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(60); // Should be below TOP_MARGIN
    });
  });

  describe("hasAncestorDescendantRelationship", () => {
    let system: System;

    beforeEach(() => {
      system = new System();
      system.createComponent("Root1", {});
      system.createComponent("Child1", {}, "Root1");
      system.createComponent("Root2", {});
      system.createComponent("Child2", {}, "Root2");
    });

    it("returns true for direct parent-child relationship", () => {
      const result = hasAncestorDescendantRelationship(
        system,
        "Root1",
        "Child1",
      );
      expect(result).toBe(true);
    });

    it("returns false for unrelated components", () => {
      const result = hasAncestorDescendantRelationship(
        system,
        "Root1",
        "Child2",
      );
      expect(result).toBe(false);
    });

    it("returns true for ancestor-descendant relationship", () => {
      const result = hasAncestorDescendantRelationship(
        system,
        "Root1",
        "Child1",
      );
      expect(result).toBe(true);
    });

    it("returns false for components with no relationship", () => {
      const result = hasAncestorDescendantRelationship(
        system,
        "Child1",
        "Child2",
      );
      expect(result).toBe(false);
    });
  });
});
