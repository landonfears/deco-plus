import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SystemVisualizerWithProvider } from "../SystemVisualizer";
import { getVisualizerSystemData } from "~/system/visualizer";
import { system } from "~/system/visualizer-system";

describe("SystemVisualizer", () => {
  it("renders the visualizer container", async () => {
    const systemData = await getVisualizerSystemData(system);
    render(<SystemVisualizerWithProvider systemData={systemData} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId("rf__wrapper")).toBeInTheDocument();
    });
  });

  it("renders all component nodes with proper nesting", async () => {
    const systemData = await getVisualizerSystemData(system);
    render(<SystemVisualizerWithProvider systemData={systemData} />);

    // Wait for loading to complete and nodes to be rendered
    await waitFor(() => {
      // Check for all component nodes
      expect(screen.getByTestId("node-parent (parent_1)")).toBeInTheDocument();
      expect(screen.getByTestId("node-child1 (child1_1)")).toBeInTheDocument();
      expect(screen.getByTestId("node-child2 (child2_1)")).toBeInTheDocument();
      expect(
        screen.getByTestId("node-grandchild (grandchild_1)"),
      ).toBeInTheDocument();

      // Verify parent nodes have children containers
      expect(
        screen.getByTestId("node-parent (parent_1)-children"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("node-child1 (child1_1)-children"),
      ).toBeInTheDocument();
    });

    // Wait for React Flow to initialize and render edges
    await waitFor(
      () => {
        const wrapper = screen.getByTestId("rf__wrapper");
        const edgeGroup = wrapper.querySelector(".react-flow__edges g");
        expect(edgeGroup).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Verify parent4 has no children
    expect(
      screen.queryByTestId("node-parent parent_4)-children"),
    ).not.toBeInTheDocument();
  });

  it("handles empty system data", async () => {
    render(<SystemVisualizerWithProvider systemData={{ components: [] }} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId("rf__wrapper")).toBeInTheDocument();
    });
  });
});

describe("SystemVisualizer Filtering", () => {
  it("renders all instances when no filter is applied", async () => {
    const systemData = await getVisualizerSystemData(system);
    render(<SystemVisualizerWithProvider systemData={systemData} />);

    // Wait for loading to complete and nodes to be rendered
    await waitFor(() => {
      // Check that all components are rendered
      expect(screen.getByTestId("node-parent (parent_1)")).toBeInTheDocument();
      expect(screen.getByTestId("node-child1 (child1_1)")).toBeInTheDocument();
      expect(screen.getByTestId("node-child2 (child2_1)")).toBeInTheDocument();
      expect(
        screen.getByTestId("node-grandchild (grandchild_1)"),
      ).toBeInTheDocument();
    });
  });

  it("filters instances when a child component is selected", async () => {
    const systemData = await getVisualizerSystemData(system);
    render(
      <SystemVisualizerWithProvider
        systemData={systemData}
        filterInstance="child1_1"
      />,
    );

    // Wait for loading to complete and nodes to be rendered
    await waitFor(() => {
      // Check that only Root and its children are visible
      expect(screen.getByTestId("node-parent (parent_1)")).toBeInTheDocument();
      expect(screen.getByTestId("node-child1 (child1_1)")).toBeInTheDocument();
      expect(
        screen.queryByTestId("node-child2 (child2_1)"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("node-grandchild (grandchild_1)"),
      ).toBeInTheDocument();
    });
  });

  it("filters instances when another child component is selected", async () => {
    const systemData = await getVisualizerSystemData(system);
    render(
      <SystemVisualizerWithProvider
        systemData={systemData}
        filterInstance="child2_1"
      />,
    );

    // Wait for loading to complete and nodes to be rendered
    await waitFor(() => {
      // Check that only Root and its children are visible
      expect(screen.getByTestId("node-parent (parent_2)")).toBeInTheDocument();
      expect(
        screen.queryByTestId("node-child1 (child1_1)"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("node-child2 (child2_1)")).toBeInTheDocument();
      expect(
        screen.queryByTestId("node-grandchild (grandchild_1)"),
      ).not.toBeInTheDocument();
    });
  });
});
