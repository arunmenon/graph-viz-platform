"use client";

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ForceGraphProps } from "./types";
import { preprocessGraphData, initializeGraph, initializeTreeLayout } from "./graphUtils";

// Dynamic import of force-graph with SSR handling
export const ForceGraph2D = dynamic(() => import("force-graph").then(mod => {
  // This returns the force-graph instance which can be wrapped in our own component
  return Promise.resolve(({ graphData, width, height, ...rest }: ForceGraphProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (!containerRef.current || !graphData) return;
      
      // Debug: Check data before passing to force-graph
      console.log("ForceGraph received data:", { 
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        nodesSample: graphData.nodes.slice(0, 2),
        linksSample: graphData.links.slice(0, 2)
      });
      
      // Pre-process the graph data to ensure links have proper references
      const processedData = preprocessGraphData(graphData);
      
      const graph = initializeGraph(mod, containerRef, processedData, width, height, rest);
      
      // Return the zoom method reference for controls
      if (typeof rest.onRef === 'function') {
        rest.onRef(graph);
      }
      
      // Initialize layout for Category nodes in a grid pattern
      setTimeout(() => initializeTreeLayout(graph, width, height), 500);
      
      return () => {
        graph._destructor && graph._destructor();
      };
    }, [graphData, width, height, rest.onNodeClick]);
    
    return <div ref={containerRef} />;
  });
}), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
});
