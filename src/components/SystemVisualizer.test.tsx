import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SystemVisualizer } from "./SystemVisualizer";
import { getVisualizerSystemData } from "../system/visualizer";
import { system } from "../system/visualizer-system";
// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

window.ResizeObserver = mockResizeObserver;

describe("SystemVisualizer", () => {
  it("renders the visualizer container", () => {
    const systemData = getVisualizerSystemData(system);
    render(<SystemVisualizer systemData={systemData} />);
    expect(screen.getByTestId("system-visualizer")).toBeInTheDocument();
  });

  it("renders all component nodes with proper nesting", async () => {
    const systemData = getVisualizerSystemData(system);
    render(<SystemVisualizer systemData={systemData} />);

    // Check for all component nodes
    expect(screen.getByTestId("node-parent")).toBeInTheDocument();
    expect(screen.getByTestId("node-child1")).toBeInTheDocument();
    expect(screen.getByTestId("node-child2")).toBeInTheDocument();
    expect(screen.getByTestId("node-grandchild")).toBeInTheDocument();

    // Verify parent nodes have children containers
    expect(screen.getByTestId("node-parent-children")).toBeInTheDocument();
    expect(screen.getByTestId("node-child1-children")).toBeInTheDocument();

    // Wait for React Flow to initialize and render edges
    await waitFor(
      () => {
        const wrapper = screen.getByTestId("rf__wrapper");
        const edgeGroup = wrapper.querySelector(".react-flow__edges g");
        expect(edgeGroup).toBeInTheDocument();
      },
      { timeout: 100 },
    );

    // Verify child2 has no children
    expect(
      screen.queryByTestId("node-child2-children"),
    ).not.toBeInTheDocument();
  });

  it("handles empty system data", () => {
    render(<SystemVisualizer systemData={{ components: [] }} />);
    expect(screen.getByTestId("system-visualizer")).toBeInTheDocument();
  });
});
