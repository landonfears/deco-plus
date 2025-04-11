"use client";

import {
  Position,
  type EdgeTypes,
  type EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "reactflow";
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";
import { type EdgeData } from "~/lib/visualizer-utils";

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) => {
  // Add padding based on the target position
  const getOffset = (position: Position) => {
    switch (position) {
      case Position.Left:
      case Position.Right:
        return 32; // More horizontal space for side arrows
      case Position.Top:
      case Position.Bottom:
        return 32; // More vertical space for top/bottom arrows
      default:
        return 32;
    }
  };

  const offset = getOffset(targetPosition);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
    offset,
  });

  const edgeData = data as EdgeData;
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={style}
        markerEnd={markerEnd}
        fill="none"
        data-testid={edgeData?.testid}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag nopan absolute z-[1000] rounded-md bg-pink-50 p-2 text-xs font-bold text-pink-700"
        >
          {edgeData?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};
