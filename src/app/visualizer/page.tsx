"use client";

import { SystemVisualizer } from "../../components/SystemVisualizer";
import { getVisualizerSystemData } from "../../system/visualizer-system";

export default function VisualizerPage() {
  const systemData = getVisualizerSystemData();

  return (
    <div className="h-screen w-screen">
      <SystemVisualizer systemData={systemData} />
    </div>
  );
}
