"use client";

import { useEffect, useRef, useState } from "react";
import { GraphNode } from "./types";

// Custom hook for calculating dimensions based on container size
export const useGraphDimensions = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, [containerRef]);

  return dimensions;
};

// Custom hook for handling node interactions (click, double-click, alt+click)
export const useNodeInteractions = () => {
  const lastClickRef = useRef<{nodeId: string, time: number} | null>(null);
  
  const handleNodeClick = (
    node: GraphNode, 
    event: any,
    singleClickHandler?: (node: GraphNode) => void, 
    doubleClickHandler?: (node: GraphNode) => Promise<void>,
    collapseHandler?: (node: GraphNode) => void
  ) => {
    if (!node) return;
    
    // Handle Alt+Click for collapse (works on both Mac and Windows)
    if (event && (event.altKey || event.getModifierState('Alt'))) {
      console.log("Alt+Click detected, collapsing node:", node.id);
      collapseHandler?.(node);
      return;
    }
    
    const now = Date.now();
    const lastClick = lastClickRef.current;
    
    // Make double-click detection more forgiving - use 500ms
    if (lastClick && now - lastClick.time < 500) {
      // This is a double-click, expand the node
      console.log("Double-click detected on node:", node.id);
      doubleClickHandler?.(node);
    } else {
      // This is a single click, just select the node
      singleClickHandler?.(node);
    }
    
    // Update the last click reference
    lastClickRef.current = {
      nodeId: node.id,
      time: now
    };
  };

  return handleNodeClick;
};
