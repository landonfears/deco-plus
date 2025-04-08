"use client";

import { SystemVisualizer } from "../../components/SystemVisualizer";
import { getVisualizerSystemData } from "../../system/visualizer";
import { system } from "../../system/visualizer-system";
export default function VisualizerPage() {
  const systemData = getVisualizerSystemData(system);

  return (
    <div className="h-screen w-screen">
      <SystemVisualizer systemData={systemData} />
    </div>
  );
}
