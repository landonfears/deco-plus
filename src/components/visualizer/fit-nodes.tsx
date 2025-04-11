"use client";

import { useEffect } from "react";
import { type Node, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";

import { usePrevious } from "~/hooks/use-previous";

export const FitNodes = ({
  filteredComponent,
  nodes,
}: {
  filteredComponent: string | null;
  nodes: Node[];
}) => {
  const { fitView } = useReactFlow();
  const lastFilteredComponent = usePrevious(filteredComponent);

  // Add effect to fit view when filtered component changes
  useEffect(() => {
    // Wait for nodes to be updated
    const timer = setTimeout(() => {
      if (lastFilteredComponent !== filteredComponent) {
        fitView({ padding: 0.3, duration: 300 });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [filteredComponent, fitView, lastFilteredComponent]);

  return null;
};
