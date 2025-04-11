import { useRef } from "react";

export const usePrevious = <T>(value: T): T | null => {
  const info = useRef<{
    curr: T;
    prev: T | null;
  }>({
    curr: value,
    prev: null,
  });

  if (info.current.curr !== value) {
    info.current = {
      curr: value,
      prev: info.current.curr,
    };
  }

  return info.current.prev;
};
