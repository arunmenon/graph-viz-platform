"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

// Import d3 for force calculations
import * as d3 from 'd3';

// Keep track of debug logging to avoid spam
let linkDebugLogged = false;

// Import ForceGraph2D directly to avoid 3D/VR dependencies
const ForceGraph2D = dynamic(() => import("force-graph").then(mod => {
  // This returns the force-graph instance which can be wrapped in our own component
  return Promise.resolve(({ graphData, width, height, ...rest }) => {
    const containerRef = useRef(null);
    
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
      const nodeById = new Map();
      
      // Index nodes by id
      graphData.nodes.forEach(node => {
        nodeById.set(node.id, node);
      });
      
      // Convert link string references to object references
      const processedLinks = graphData.links.map(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // Look up the actual node objects by id
        const sourceNode = nodeById.get(sourceId);
        const targetNode = nodeById.get(targetId);
        
        if (!sourceNode || !targetNode) {
          console.warn(`Invalid link: ${sourceId} -> ${targetId}. Missing nodes?`);
          return null;
        }
        
        return {
          ...link,
          source: sourceNode,
          target: targetNode
        };
      }).filter(Boolean); // Remove null links
      
      const processedData = {
        nodes: graphData.nodes,
        links: processedLinks
      };
      
      console.log("Processed data for force-graph:", {
        originalLinks: graphData.links.length,
        processedLinks: processedLinks.length,
        sampleLink: processedLinks.length > 0 ? processedLinks[0] : null
      });
      
      const graph = mod.default()(containerRef.current)
        .graphData(processedData)
        .width(width)
        .height(height)
        .nodeLabel("label")
        .nodeColor(n => n.color || "#1e88e5")
        // Make links extremely visible
        .linkDirectionalArrowLength(15) // Larger arrows
        .linkDirectionalArrowRelPos(1)
        .linkWidth(10) // Extremely thick links for maximum visibility
        .linkLabel("label")
        .linkColor(() => "#ff0000") // Pure red for maximum visibility
        .linkCurvature(0.2) // Gentle curves
        // Make links solid rather than dashed for better visibility
        .linkLineDash(() => null) // Solid lines are more visible
        .linkCanvasObjectMode(() => "after")
        .linkCanvasObject((link, ctx) => {
          // Log only once using the global variable
          if (!linkDebugLogged) {
            console.log("First link structure in canvas object:", {
              link,
              sourceType: typeof link.source,
              targetType: typeof link.target,
              hasSourcePos: typeof link.source === 'object' && 'x' in link.source,
              hasTargetPos: typeof link.target === 'object' && 'x' in link.target
            });
            linkDebugLogged = true;
          }
          
          // Draw link label at the middle of the link
          if (link.label) {
            const start = link.source;
            const end = link.target;
            if (!start || !end) {
              console.warn("Missing link endpoint:", { link, start, end });
              return;
            }
            
            const textPos = Object.assign({}, ...['x', 'y'].map(c => ({
              [c]: start[c] + (end[c] - start[c]) / 2
            })));
            
            const label = link.label;
            
            // Background with border
            ctx.font = 'bold 10px Sans-Serif'; // Larger, bold font
            const textWidth = ctx.measureText(label).width;
            
            // Draw filled rectangle with border
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            const labelBgX = textPos.x - textWidth/2 - 5;
            const labelBgY = textPos.y - 8;
            const labelBgWidth = textWidth + 10;
            const labelBgHeight = 16;
            
            // Rounded rectangle background
            const radius = 4;
            ctx.beginPath();
            ctx.moveTo(labelBgX + radius, labelBgY);
            ctx.lineTo(labelBgX + labelBgWidth - radius, labelBgY);
            ctx.quadraticCurveTo(labelBgX + labelBgWidth, labelBgY, labelBgX + labelBgWidth, labelBgY + radius);
            ctx.lineTo(labelBgX + labelBgWidth, labelBgY + labelBgHeight - radius);
            ctx.quadraticCurveTo(labelBgX + labelBgWidth, labelBgY + labelBgHeight, labelBgX + labelBgWidth - radius, labelBgY + labelBgHeight);
            ctx.lineTo(labelBgX + radius, labelBgY + labelBgHeight);
            ctx.quadraticCurveTo(labelBgX, labelBgY + labelBgHeight, labelBgX, labelBgY + labelBgHeight - radius);
            ctx.lineTo(labelBgX, labelBgY + radius);
            ctx.quadraticCurveTo(labelBgX, labelBgY, labelBgX + radius, labelBgY);
            ctx.fill();
            ctx.stroke();
            
            // Bold text in dark color
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            ctx.fillText(label, textPos.x, textPos.y);
          }
        })
        .onNodeClick(rest.onNodeClick)
        .cooldownTicks(200) // Longer cooldown for better stabilization
        .d3AlphaDecay(0.01) // Slower decay for more movement
        .d3VelocityDecay(0.05) // Lower decay for more sustained movement
        // Extremely strong repulsive forces for maximum node separation
        .d3Force('charge', d3.forceManyBody().strength(-1500))
        // Increase link distance for better spacing
        .d3Force('link', d3.forceLink().distance(300).strength(0.8))
        // Center the graph in view
        .d3Force('center', d3.forceCenter())
        // Add a custom tick function to debug positions
        .onEngineTick(() => {
          if (!linkDebugLogged) {
            const graphData = graph.graphData();
            if (graphData.links.length > 0) {
              const firstLink = graphData.links[0];
              console.log("Link positions:", {
                source: firstLink.source,
                target: firstLink.target,
                hasSourcePos: typeof firstLink.source === 'object' && 'x' in firstLink.source,
                hasTargetPos: typeof firstLink.target === 'object' && 'x' in firstLink.target
              });
              linkDebugLogged = true;
            }
          }
        })
        // Add hover interaction for nodes
        .onNodeHover(node => {
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'pointer' : 'default';
          }
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
          const label = node.label || "";
          const fontSize = 16/globalScale; // Larger font size
          ctx.font = `bold ${fontSize}px Sans-Serif`; // Bold font
          const textWidth = ctx.measureText(label).width;
          const bgDimensions = [textWidth, fontSize].map(n => n + 10/globalScale); // More padding

          // Node circle - extremely large size for better visibility and clickability
          const nodeSize = 30; // Extremely large node size for easy clicking
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
          ctx.fillStyle = node.color || "#1e88e5";
          ctx.fill();
          
          // Add thick white border for contrast
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Add second border for emphasis
          ctx.strokeStyle = node.color || "#1e88e5";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Always show labels for better visibility
          // Get vertical offset based on node size
          const vertOffset = nodeSize + 4;
          
          // Add background rectangle with improved visibility
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)"; // Nearly opaque background
          ctx.strokeStyle = "#000000"; // Black border for maximum contrast
          ctx.lineWidth = 2; // Thicker border
          
          // Position the background below the node
          const bgX = (node.x || 0) - textWidth/2 - 8/globalScale;
          const bgY = (node.y || 0) + vertOffset/globalScale;
          const bgWidth = bgDimensions[0];
          const bgHeight = bgDimensions[1];
          
          // Draw rounded rectangle for background
          const radius = 6/globalScale; // Larger radius for more rounded corners
          ctx.beginPath();
          ctx.moveTo(bgX + radius, bgY);
          ctx.lineTo(bgX + bgWidth - radius, bgY);
          ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
          ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
          ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
          ctx.lineTo(bgX + radius, bgY + bgHeight);
          ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
          ctx.lineTo(bgX, bgY + radius);
          ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Add a connecting line from node to label
          ctx.beginPath();
          ctx.moveTo(node.x || 0, (node.y || 0) + nodeSize); // Start at bottom of node
          ctx.lineTo(node.x || 0, bgY); // Connect to top of label background
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Text with improved positioning - use dark, bold text
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#000000"; // Black text for maximum contrast
          ctx.font = `bold ${fontSize}px Sans-Serif`; // Ensure font is bold
          // Draw text with slight shadow for better contrast
          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          ctx.shadowBlur = 2;
          ctx.fillText(
            label, 
            node.x || 0, 
            (node.y || 0) + vertOffset/globalScale + fontSize/2
          );
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        });
        
      // Return the zoom method reference for controls
      if (typeof rest.onRef === 'function') {
        rest.onRef(graph);
      }
      
      // Auto-fit on first render
      setTimeout(() => graph.zoomToFit(400, 40), 500);
      
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

interface GraphVisualizationProps {
  onNodeClick?: (node: any) => void;
}

export function GraphVisualization({ onNodeClick }: GraphVisualizationProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { graphData } = useStore();
  
  // Debug to check if links are in the data
  useEffect(() => {
    if (graphData) {
      console.log("Graph data loaded:", {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        linkSample: graphData.links.slice(0, 3)
      });
    }
  }, [graphData]);
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
  }, []);

  // Track last clicked node and timestamp for double-click detection
  const lastClickRef = useRef<{nodeId: string, time: number} | null>(null);
  const { addNodesToGraph } = useStore();

  const handleNodeClick = async (node: any) => {
    if (!node) return;
    
    const now = Date.now();
    const lastClick = lastClickRef.current;
    
    // Make double-click detection more forgiving - use 500ms and ignore exact node match
    // This makes node expansion easier, effectively making a single click work after
    // the first click on any node
    if (lastClick && now - lastClick.time < 500) {
      // This is a double-click, expand the node
      console.log("Double-click detected on node:", node.id);
      
      try {
        // Import dynamically to prevent circular dependencies
        const { expandNode } = await import("@/lib/neo4jConnector");
        
        // Show visual feedback that expansion is happening
        const originalColor = node.color || "#1e88e5";
        node.color = "#ff0000"; // Set to red during expansion
        
        // Need to update the graph to see the color change
        if (graphRef.current) {
          // Force a tiny zoom to trigger a refresh
          const zoom = graphRef.current.zoom();
          graphRef.current.zoom(zoom * 1.01, 10);
          setTimeout(() => graphRef.current.zoom(zoom, 10), 50);
        }
        
        // Expand the node
        console.log("Expanding node:", node.id);
        const expandedData = await expandNode(node.id);
        
        // Restore original color
        node.color = originalColor;
        
        // Update the graph again to restore the color
        if (graphRef.current) {
          // Force a tiny zoom to trigger a refresh
          const zoom = graphRef.current.zoom();
          graphRef.current.zoom(zoom * 1.01, 10);
          setTimeout(() => graphRef.current.zoom(zoom, 10), 50);
        }
        
        if (expandedData && expandedData.nodes.length > 0) {
          console.log(`Adding ${expandedData.nodes.length} nodes and ${expandedData.links.length} links from expansion`);
          addNodesToGraph(expandedData);
        } else {
          console.log("No additional connections found for node:", node.id);
        }
      } catch (error) {
        console.error("Error expanding node:", error);
      }
    } else {
      // This is a single click, just select the node
      if (onNodeClick) {
        onNodeClick(node);
      }
    }
    
    // Update the last click reference
    lastClickRef.current = {
      nodeId: node.id,
      time: now
    };
  };

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
  
  // Add a debug function
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
    <div className="w-full h-full relative" ref={containerRef}>
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <div className="bg-background/80 backdrop-blur-sm p-1 rounded border shadow-sm">
          <div className="flex gap-1 mb-1">
            <Button size="icon" variant="outline" onClick={zoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={zoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
          <Button size="icon" variant="outline" onClick={resetView} className="w-full" title="Fit Graph">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button size="icon" variant="outline" onClick={inspectGraph} className="w-full mt-1" title="Debug Graph">
            <span className="font-mono">🔍</span>
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-2 z-10">
        <div className="bg-background/80 backdrop-blur-sm p-3 rounded-md border border-blue-300 shadow-sm text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">i</span>
            <div>
              <p className="font-medium text-foreground">Expand the Graph</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold">Click any node</span> to select it, then <span className="font-bold">click again</span> to expand and explore its relationships
              </p>
            </div>
          </div>
        </div>
      </div>

      {graphData && (
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          onNodeClick={handleNodeClick}
          onRef={(ref: any) => { graphRef.current = ref; }}
        />
      )}

      {!graphData && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground">Run a query to visualize graph data</p>
        </div>
      )}
    </div>
  );
}
