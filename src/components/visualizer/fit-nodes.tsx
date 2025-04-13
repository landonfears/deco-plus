"use client";

import { useEffect } from "react";
import { type Node, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";

import { usePrevious } from "~/hooks/use-previous";

export const FitNodes = ({
  filteredInstance,
  nodes,
}: {
  filteredInstance: string | null;
  nodes: Node[];
}) => {
  const { fitView } = useReactFlow();
  const lastFilteredInstance = usePrevious(filteredInstance);

  // Add effect to fit view when filtered component changes
  useEffect(() => {
    // Wait for nodes to be updated
    const timer = setTimeout(() => {
      if (lastFilteredInstance !== filteredInstance) {
        fitView({ padding: 0.3, duration: 300 });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [filteredInstance, fitView, lastFilteredInstance]);

  return null;
};
