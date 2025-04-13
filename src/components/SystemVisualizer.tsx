import { ReactFlowProvider } from "reactflow";
import { SystemComponentVisualizer } from "./SystemComponentVisualizer";
import type { SystemVisualizerProps } from "~/lib/visualizer-utils";

export const SystemVisualizerWithProvider = (props: SystemVisualizerProps) => {
  return (
    <ReactFlowProvider>
      <SystemComponentVisualizer {...props} />
    </ReactFlowProvider>
  );
};
