"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { GraphNode, GraphVisualizationProps } from "./types";
import { useGraphDimensions, useNodeInteractions } from "./hooks";
import { handleNodeExpansion } from "./NodeExpansion";
import { collapseNode } from "./NodeCollapse";
import { applyTreeLayout } from "./graphUtils";
import { ForceGraph2D } from "./DynamicForceGraph";
import { ControlPanel, InstructionsPanel, CategoryIndicator, NoDataView } from "./components";

// Main graph visualization component
export function GraphVisualization({ onNodeClick }: GraphVisualizationProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { graphData, addNodesToGraph, updateGraphData, resetToOriginalData } = useStore();
  const dimensions = useGraphDimensions(containerRef);
  const handleNodeInteraction = useNodeInteractions();

  // Debug to check if links are in the data
  useEffect(() => {
    if (graphData) {
      console.log("Graph data loaded:", {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        linkSample: graphData.links.slice(0, 3)
      });
      
      // Log node types for debugging
      const nodeTypes = new Set();
      graphData.nodes.forEach(node => {
        if (node.type) nodeTypes.add(node.type);
      });
      console.log("Node types present:", Array.from(nodeTypes));
      
      // Count Category nodes
      const categoryCount = graphData.nodes.filter(n => n.type === 'Category').length;
      console.log(`Found ${categoryCount} nodes with type='Category'`);
    }
  }, [graphData]);

  const handleCollapseNode = (node: GraphNode) => {
    collapseNode(node, graphRef, updateGraphData);
  };

  const handleNodeClickEvent = (node: GraphNode, event?: MouseEvent) => {
    handleNodeInteraction(
      node,
      event,
      // Single click handler
      (n) => onNodeClick && onNodeClick(n),
      // Double click handler
      (n) => handleNodeExpansion(n, graphRef, addNodesToGraph),
      // Collapse handler (Alt+Click)
      handleCollapseNode
    );
  };

  const resetLayout = () => {
    applyTreeLayout(graphRef, dimensions);
  };

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <ControlPanel 
        graphRef={graphRef} 
        resetLayout={resetLayout} 
        resetToOriginal={resetToOriginalData} 
      />
      <InstructionsPanel />

      {graphData ? (
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          onNodeClick={handleNodeClickEvent}
          onRef={(ref: any) => { graphRef.current = ref; }}
        />
      ) : (
        <NoDataView />
      )}
      
      <CategoryIndicator />
    </div>
  );
}
