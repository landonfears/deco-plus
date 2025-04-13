import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SystemVisualizerWithProvider } from "../SystemVisualizer";
import { getVisualizerSystemData } from "~/system/visualizer";
import { system } from "~/system/visualizer-system";

describe("SystemVisualizer", () => {
  it("renders the visualizer container", () => {
    const systemData = getVisualizerSystemData(system);
    render(<SystemVisualizerWithProvider systemData={systemData} />);
    expect(screen.getByTestId("system-visualizer")).toBeInTheDocument();
  });

  it("renders all component nodes with proper nesting", async () => {
    const systemData = getVisualizerSystemData(system);
    render(<SystemVisualizerWithProvider systemData={systemData} />);

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

    // Wait for React Flow to initialize and render edges
    await waitFor(
      () => {
        const wrapper = screen.getByTestId("rf__wrapper");
        const edgeGroup = wrapper.querySelector(".react-flow__edges g");
        expect(edgeGroup).toBeInTheDocument();
      },
      { timeout: 100 },
    );

    // Verify parent4 has no children
    expect(
      screen.queryByTestId("node-parent parent_4)-children"),
    ).not.toBeInTheDocument();
  });

  it("handles empty system data", () => {
    render(<SystemVisualizerWithProvider systemData={{ components: [] }} />);
    expect(screen.getByTestId("system-visualizer")).toBeInTheDocument();
  });
});

// describe("SystemVisualizer Filtering", () => {
//   const systemData = getVisualizerSystemData(system);

//   it("renders all components when no filter is applied", async () => {
//     render(<SystemVisualizerWithProvider systemData={systemData} />);

//     // Check that all components are rendered
//     expect(screen.getByTestId("node-parent (parent_1)")).toBeInTheDocument();
//     expect(screen.getByTestId("node-child1 (child1_1)")).toBeInTheDocument();
//     expect(screen.getByTestId("node-child2 (child2_1)")).toBeInTheDocument();
//     expect(
//       screen.getByTestId("node-grandchild (grandchild_1)"),
//     ).toBeInTheDocument();
//   });

//   it("filters components when a child component is selected", () => {
//     render(
//       <SystemVisualizerWithProvider
//         systemData={systemData}
//         filterComponent="child1"
//       />,
//     );

//     // Check that only Root and its children are visible
//     expect(screen.getByTestId("node-parent (parent_1)")).toBeInTheDocument();
//     expect(screen.getByTestId("node-child1 (child1_1)")).toBeInTheDocument();
//     expect(
//       screen.queryByTestId("node-child2 (child2_1)"),
//     ).not.toBeInTheDocument();
//     expect(
//       screen.queryByTestId("node-grandchild (grandchild_1)"),
//     ).toBeInTheDocument();
//   });

//   it("filters components when another child component is selected", () => {
//     render(
//       <SystemVisualizerWithProvider
//         systemData={systemData}
//         filterComponent="child2"
//       />,
//     );

//     // Check that only Root and its children are visible
//     expect(screen.getByTestId("node-parent (parent_1)")).toBeInTheDocument();
//     expect(
//       screen.queryByTestId("node-child1 (child1_1)"),
//     ).not.toBeInTheDocument();
//     expect(screen.getByTestId("node-child2 (child2_1)")).toBeInTheDocument();
//     expect(
//       screen.queryByTestId("node-grandchild (grandchild_1)"),
//     ).not.toBeInTheDocument();
//   });

//   // TODO: Tests do not render edges in React Flow
// });
