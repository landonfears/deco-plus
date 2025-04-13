"use client";

import { SystemVisualizerWithProvider } from "../../components/SystemVisualizer";
import { getVisualizerSystemData } from "../../system/visualizer";
import { system } from "../../system/visualizer-system";
import { useEffect, useState } from "react";
import type { SystemVisualizerData } from "../../system/visualizer";

export default function VisualizerPage() {
  const [systemData, setSystemData] = useState<SystemVisualizerData | null>(
    null,
  );

  useEffect(() => {
    void getVisualizerSystemData(system).then(setSystemData);
  }, []);

  if (!systemData) return null;

  return (
    <div className="h-screen w-screen">
      <SystemVisualizerWithProvider systemData={systemData} />
    </div>
  );
}
