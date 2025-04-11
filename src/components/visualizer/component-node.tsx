"use client";

import { type NodeTypes, Position, Handle } from "reactflow";
import "reactflow/dist/style.css";
import "@reactflow/node-resizer/dist/style.css";
import { showOrHideStyle } from "~/lib/visualizer-utils";
import { cn } from "~/lib/utils";

const ComponentOrInstanceNode = ({
  data,
  selected,
}: {
  data: {
    label: string;
    hasChildren?: boolean;
    targetHandles: string[];
    sourceHandles: string[];
  };
  selected?: boolean;
}) => {
  return (
    <>
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={showOrHideStyle(data.sourceHandles.includes("top"))}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={showOrHideStyle(data.sourceHandles.includes("right"))}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={showOrHideStyle(data.sourceHandles.includes("bottom"))}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={showOrHideStyle(data.sourceHandles.includes("left"))}
      />

      <div
        className={cn(
          `relative flex h-full w-full flex-col ${
            data.hasChildren ? "" : "items-center justify-center"
          }`,
        )}
        data-testid={`node-${data.label}`}
      >
        <div className="text-lg font-bold text-neutral-600">{data.label}</div>
        {data.hasChildren && (
          <div className="flex-1" data-testid={`node-${data.label}-children`} />
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={showOrHideStyle(data.targetHandles.includes("top"))}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={showOrHideStyle(data.targetHandles.includes("right"))}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={showOrHideStyle(data.targetHandles.includes("bottom"))}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={showOrHideStyle(data.targetHandles.includes("left"))}
      />
    </>
  );
};

export const nodeTypes: NodeTypes = {
  default: ComponentOrInstanceNode,
};
