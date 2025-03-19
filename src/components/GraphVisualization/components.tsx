"use client";

import { Button } from "../ui/button";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

// Control panel component with zoom and layout controls
export const ControlPanel = ({ 
  graphRef, 
  resetLayout, 
  resetToOriginal
}: { 
  graphRef: React.RefObject<any>, 
  resetLayout: () => void,
  resetToOriginal?: () => void
}) => {
  const zoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 400);
    }
  };

  const zoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 0.8, 400);
    }
  };

  const resetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 40);
    }
  };

  const inspectGraph = () => {
    if (graphRef.current) {
      const currentData = graphRef.current.graphData();
      console.log("Current force-graph internal data:", {
        nodes: currentData.nodes.length,
        links: currentData.links.length,
        nodeSample: currentData.nodes.slice(0, 2),
        linkSample: currentData.links.slice(0, 2)
      });
      
      // Note: force-graph doesn't have a refresh method
      // Use other methods to trigger a refresh
      const zoom = graphRef.current.zoom();
      graphRef.current.zoom(zoom * 1.01, 10); // tiny zoom change to refresh
      setTimeout(() => graphRef.current.zoom(zoom, 10), 100); // restore zoom
    } else {
      console.log("Graph reference not available");
    }
  };

  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <div className="bg-background/80 backdrop-blur-sm p-2 rounded-md border shadow-md">
        <p className="text-xs font-semibold mb-2 text-center">Tree Hierarchy View</p>
        
        {/* Zoom controls */}
        <div className="flex gap-1 mb-2">
          <Button size="icon" variant="outline" onClick={zoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={zoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Layout controls */}
        <div className="space-y-2">
          <Button size="sm" variant="outline" onClick={resetView} className="w-full flex items-center justify-center gap-2" title="Fit All Nodes">
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs">Fit to View</span>
          </Button>
          
          <Button size="sm" variant="default" onClick={resetLayout} className="w-full flex items-center justify-center gap-2" title="Apply Tree Layout">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <span className="text-xs">Tree Layout</span>
          </Button>
          
          {/* Reset to original graph data button */}
          {resetToOriginal && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={resetToOriginal} 
              className="w-full flex items-center justify-center gap-2 mt-2" 
              title="Reset to Original Graph"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs">Reset Graph</span>
            </Button>
          )}
        </div>
        
        {/* Debug button - hidden in production */}
        <Button size="icon" variant="outline" onClick={inspectGraph} className="w-full mt-2" title="Debug Graph">
          <span className="font-mono">🔍</span>
        </Button>
      </div>
    </div>
  );
};

// Instructions panel component
export const InstructionsPanel = () => (
  <div className="absolute bottom-2 left-2 z-10">
    <div className="bg-background/80 backdrop-blur-sm p-3 rounded-md border border-blue-300 shadow-md text-sm">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">i</span>
        <div>
          <p className="font-medium text-foreground">Graph Interaction Tips</p>
          <ul className="text-xs text-muted-foreground mt-1 space-y-1">
            <li>• <span className="font-bold">Click nodes</span> to view details</li>
            <li>• <span className="font-bold">Double-click</span> to expand child nodes</li>
            <li>• <span className="font-bold">Alt+Click</span> to collapse a node's subtree</li>
            <li>• <span className="font-bold">Tree Layout</span> organizes nodes hierarchically</li>
            <li>• <span className="font-bold">Drag nodes</span> to adjust positions if needed</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// Category indicator component
export const CategoryIndicator = () => (
  <div className="absolute top-2 left-2 z-10">
    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-semibold text-sm border border-blue-300">
      Starting with Categories - Double-click to Explore
    </div>
  </div>
);

// No data view component
export const NoDataView = () => (
  <div className="w-full h-full flex items-center justify-center">
    <p className="text-muted-foreground">Run a query to visualize graph data</p>
  </div>
);
