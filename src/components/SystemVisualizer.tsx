import { ReactFlowProvider } from "reactflow";
import { SystemComponentVisualizer } from "./SystemComponentVisualizer";
import type { SystemVisualizerProps } from "~/lib/visualizer-utils";
import { SystemInstanceVisualizer } from "./SystemInstanceVisualizer";

export const SystemVisualizerWithProvider = (props: SystemVisualizerProps) => {
  return (
    <ReactFlowProvider>
      <SystemInstanceVisualizer {...props} />
    </ReactFlowProvider>
  );
};
