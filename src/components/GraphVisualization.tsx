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
        // Clear hierarchical tree-style links
        .linkDirectionalArrowLength(20) // Larger arrows for hierarchy
        .linkDirectionalArrowRelPos(1)
        .linkWidth(link => {
          // Thicker links for parent-child relationships
          const sourceY = typeof link.source === 'object' ? link.source.y : 0;
          const targetY = typeof link.target === 'object' ? link.target.y : 0;
          return Math.abs(targetY - sourceY) > 150 ? 4 : 1; // Thicker for vertical links
        })
        .linkLabel("label")
        .linkColor(link => {
          // Check vertical positioning
          const sourceY = typeof link.source === 'object' ? link.source.y : 0;
          const targetY = typeof link.source === 'object' ? link.target.y : 0;
          
          // Different colors based on relationship type
          if (Math.abs(targetY - sourceY) > 150) {
            // Vertical parent-child links (dark blue)
            return "#0047AB"; 
          } else {
            // Horizontal sibling links (light gray)
            return "#CCCCCC";
          }
        })
        .linkCurvature(link => {
          // Straight lines for parent-child, curved for siblings
          const sourceY = typeof link.source === 'object' ? link.source.y : 0;
          const targetY = typeof link.target === 'object' ? link.target.y : 0;
          
          // If significant vertical difference, it's a tree relationship: straight line
          // Otherwise it's a sibling relationship: use curve
          return Math.abs(targetY - sourceY) > 150 ? 0 : 0.3;
        })
        // Use dashed lines for sibling relationships
        .linkLineDash(link => {
          const sourceY = typeof link.source === 'object' ? link.source.y : 0;
          const targetY = typeof link.target === 'object' ? link.target.y : 0;
          
          // Solid lines for vertical parent-child links
          // Dashed lines for horizontal sibling links
          return Math.abs(targetY - sourceY) > 150 ? null : [5, 5];
        })
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
        .d3VelocityDecay(0.2) // Moderate decay for controlled movement
        // STRICT tree layout forces
        // Very strong downward force - essential for tree layout
        .d3Force('charge', null) // Remove charge force that causes radial layout
        // Very long link distance for clear tree structure
        .d3Force('link', d3.forceLink().distance(250).strength(1))
        // No center force - use individual node positioning instead
        .d3Force('center', null)
        // Large collision radius to keep nodes well separated
        .d3Force('collision', d3.forceCollide(80))
        // Vertical forces for tree layout
        .d3Force('y', d3.forceY(node => {
          // Allow any node type, but maintain hierarchy
          return 300; // Default position, will be overridden by node.fy for fixed positions
        }).strength(0.1))
        // Horizontal distribution
        .d3Force('x', d3.forceX(node => {
          return width / 2; // Center by default, will be overridden by node.fx for fixed positions
        }).strength(0.1))
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
            containerRef.current.style.cursor = node ? 'grab' : 'default';
          }
        })
        // Enable node dragging for manual layout
        .nodeRelSize(12) // Collision detection area for dragging
        .enableNodeDrag(true) // Allow nodes to be dragged
        .onNodeDragEnd(node => {
          // Pin the node in place after dragging
          node.fx = node.x;
          node.fy = node.y;
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
          const label = node.label || "";
          const fontSize = 16/globalScale; // Larger font size
          ctx.font = `bold ${fontSize}px Sans-Serif`; // Bold font
          const textWidth = ctx.measureText(label).width;
          const bgDimensions = [textWidth, fontSize].map(n => n + 10/globalScale); // More padding

          // Node size varies by node type - root nodes are larger
          // Calculate size based on type - root nodes are larger
          const isRootNode = node.type === 'Root Category' || 
                            node.type === 'Category' || 
                            node.label?.toLowerCase().includes('root');
          const nodeSize = isRootNode ? 35 : 30; // Larger size for root nodes
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
          ctx.fillStyle = node.color || "#1e88e5";
          ctx.fill();
          
          // Add special border styling based on node type
          if (isRootNode) {
            // Silver-white thick border for root nodes - makes them stand out
            ctx.strokeStyle = "#FFFFFF"; // Pure white
            ctx.lineWidth = 5;
            ctx.stroke();
            
            // Second border with a black outline for high contrast
            ctx.strokeStyle = "#000000"; // Black
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (node.type === 'Subcategory' || node.type === 'Sub Category') {
            // Dashed border for subcategories
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Apply a distinct pattern
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]); // Dashed effect
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
          } else {
            // Standard border for regular nodes
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Add second border for emphasis
            ctx.strokeStyle = node.color || "#1e88e5";
            ctx.lineWidth = 1;
            ctx.stroke();
          }

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
      
      // Initialize layout for Category nodes in a grid pattern
      const initializeTreeLayout = () => {
        // Get current data - looking for Category nodes only
        const data = graph.graphData();
        
        // Generic approach to identify Category nodes
        const categoryNodes = data.nodes.filter(node => 
          // Check if node has Category type
          node.type === 'Category' ||
          // Check if node has Category in properties
          (node.properties && node.properties.category === true)
        );
        
        // If we found none, just use all nodes (fallback)
        if (categoryNodes.length === 0) {
          console.log("No Category nodes found, using all available nodes");
          return;
        }
        
        console.log(`Found ${categoryNodes.length} Category nodes for initial display`);
        
        if (categoryNodes.length === 0) return;
        
        // Arrange category nodes in a grid layout
        const gridColumns = Math.min(4, Math.ceil(Math.sqrt(categoryNodes.length)));
        const gridRows = Math.ceil(categoryNodes.length / gridColumns);
        
        // Calculate spacing
        const horizontalSpacing = width / (gridColumns + 1);
        const verticalSpacing = height / (gridRows + 1);
        
        // Position each category node in a grid
        categoryNodes.forEach((node, i) => {
          const col = i % gridColumns;
          const row = Math.floor(i / gridColumns);
          
          // Fix position in grid layout
          node.fx = horizontalSpacing * (col + 1);
          node.fy = verticalSpacing * (row + 1);
          
          // Mark as a Category node
          node.type = 'Category';
        });
        
        // Update the graph with modified data
        graph.graphData(data);
        
        // Fit to view all nodes
        graph.zoomToFit(500, 50);
        
        // Apply a moderate zoom level
        setTimeout(() => {
          const currentZoom = graph.zoom();
          if (currentZoom < 0.8) {
            graph.zoom(1.2, 500);
          }
        }, 600);
      };
      
      // Run tree layout initialization after a short delay
      setTimeout(initializeTreeLayout, 500);
      
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
          
          // Before adding nodes, position them in a tree layout underneath the parent
          const parentX = node.x || 0;
          const parentY = node.y || 0;
          
          // Position child nodes directly below parent in a strict tree structure
          expandedData.nodes.forEach((childNode, i) => {
            // If this is a new node (not already in the graph), position it
            if (!graphRef.current.graphData().nodes.find(n => n.id === childNode.id)) {
              // Calculate position - strictly in a horizontal row under the parent
              const totalChildren = expandedData.nodes.length;
              const childSpacing = totalChildren <= 3 ? 150 : 100; // More space if fewer children
              const rowWidth = childSpacing * (totalChildren - 1);
              const startX = parentX - (rowWidth / 2);
              
              // Position child in a row under parent
              childNode.x = startX + (i * childSpacing);
              childNode.y = parentY + 300; // Fixed distance below parent
              
              // Mark this node as a sub-category
              if (!childNode.type) {
                childNode.type = 'Subcategory';
              }
            }
          });
          
          // Add nodes to the graph
          addNodesToGraph(expandedData);
          
          // After adding new nodes, arrange them in tree layout
          setTimeout(() => {
            if (graphRef.current) {
              // Get the current graph data
              const currentData = graphRef.current.graphData();
              
              // Find newly added nodes (children of the expanded node)
              const childNodes = currentData.nodes.filter(n => 
                expandedData.nodes.some(newNode => newNode.id === n.id)
              );
              
              // Position children in a clear row below parent, FIXED positions
              const totalChildren = childNodes.length;
              const childSpacing = totalChildren <= 3 ? 150 : 100; // More space if fewer children
              const rowWidth = childSpacing * (totalChildren - 1);
              const startX = parentX - (rowWidth / 2);
              
              // Position each child with fixed coordinates
              childNodes.forEach((childNode, i) => {
                // Fix position to enforce strict tree layout
                childNode.fx = startX + (i * childSpacing); // Fixed X
                childNode.fy = parentY + 300; // Fixed Y, much lower than parent
                
                // Mark child nodes with type if not already set
                if (!childNode.type) {
                  childNode.type = 'Subcategory';
                }
              });
              
              // Update the graph with the modified data
              graphRef.current.graphData(currentData);
              
              // Center on the parent node and fit all nodes
              graphRef.current.centerAt(parentX, parentY, 1000);
              setTimeout(() => {
                graphRef.current.zoomToFit(500, 60);
              }, 1200);
            }
          }, 100);
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
  
  // Reset the physics simulation and node positions, maintaining tree structure
  const resetLayout = () => {
    if (graphRef.current) {
      const graphData = graphRef.current.graphData();
      
      // Generic approach to identify Category nodes
      const categoryNodes = graphData.nodes.filter(node => 
        // Check if node has Category type
        node.type === 'Category' ||
        // Check if node has Category in properties
        (node.properties && node.properties.category === true)
      );
      
      // If we found none, just use some other fallback
      if (categoryNodes.length === 0) {
        console.log("No Category nodes found in resetLayout, checking for subcategories");
        // Try to use subcategories as a fallback
        const fallbackNodes = graphData.nodes.filter(node => 
          node.type === 'Subcategory' || 
          (node.label && node.label.includes('Sub'))
        );
        
        // If still nothing, just use any nodes
        if (fallbackNodes.length > 0) {
          console.log(`Using ${fallbackNodes.length} subcategory nodes as fallback`);
          return;
        }
      }
      
      // Create a node map to find children
      const nodeMap = new Map();
      graphData.nodes.forEach(node => nodeMap.set(node.id, node));
      
      // Create a map of parent -> children relationships
      const childrenMap = new Map();
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // We need to determine which is parent and which is child
        // In a tree hierarchy, we assume source is parent and target is child
        if (!childrenMap.has(sourceId)) {
          childrenMap.set(sourceId, []);
        }
        childrenMap.get(sourceId).push(targetId);
      });
      
      // First clear all fixed positions
      graphData.nodes.forEach(node => {
        delete node.fx;
        delete node.fy;
      });
      
      // Position category nodes in a grid layout
      const gridColumns = Math.min(4, Math.ceil(Math.sqrt(categoryNodes.length)));
      const gridRows = Math.ceil(categoryNodes.length / gridColumns);
      
      // Calculate spacing
      const horizontalSpacing = dimensions.width / (gridColumns + 1);
      const verticalSpacing = Math.min(300, dimensions.height / (gridRows + 1));
      
      // Position each category node in a grid
      categoryNodes.forEach((node, i) => {
        const col = i % gridColumns;
        const row = Math.floor(i / gridColumns);
        
        // Fix position in grid layout
        node.fx = horizontalSpacing * (col + 1);
        node.fy = verticalSpacing * (row + 1);
      });
      
      // Function to position children recursively in a tree
      const positionChildren = (parentId, level = 1, horizontalOffset = 0) => {
        const children = childrenMap.get(parentId) || [];
        const parent = nodeMap.get(parentId);
        
        if (!parent || children.length === 0) return;
        
        const parentX = parent.fx || parent.x || 0;
        const parentY = parent.fy || parent.y || 0;
        
        // Calculate width needed for all children
        const childSpacing = 120;
        const totalWidth = (children.length - 1) * childSpacing;
        
        // Position each child
        children.forEach((childId, i) => {
          const child = nodeMap.get(childId);
          if (!child) return;
          
          // Position child in tree layout under parent
          const xPosition = parentX + ((i - (children.length - 1) / 2) * childSpacing) + horizontalOffset;
          const yPosition = parentY + 200;
          
          child.fx = xPosition;
          child.fy = yPosition;
          
          // Recursively position this child's children
          positionChildren(childId, level + 1, xPosition - parentX);
        });
      };
      
      // Position all nodes starting from category nodes
      categoryNodes.forEach(category => {
        positionChildren(category.id);
      });
      
      // Update the graph with the tree-structured layout
      graphRef.current.graphData(graphData);
      
      // Restart simulation with new positions
      if (typeof graphRef.current.resetSimulation === 'function') {
        graphRef.current.resetSimulation();
      } else if (typeof graphRef.current.restartSimulation === 'function') {
        graphRef.current.restartSimulation();
      } else {
        // Force a refresh through zoom
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom * 1.01, 10);
        setTimeout(() => graphRef.current.zoom(currentZoom, 300), 50);
      }
      
      // Fit all nodes to view
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(500, 60);
        }
      }, 1000);
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
          </div>
          
          {/* Debug button - hidden in production */}
          <Button size="icon" variant="outline" onClick={inspectGraph} className="w-full mt-2" title="Debug Graph">
            <span className="font-mono">🔍</span>
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-2 z-10">
        <div className="bg-background/80 backdrop-blur-sm p-3 rounded-md border border-blue-300 shadow-md text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">i</span>
            <div>
              <p className="font-medium text-foreground">Graph Interaction Tips</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• <span className="font-bold">Click nodes</span> to view details</li>
                <li>• <span className="font-bold">Double-click</span> to expand child nodes</li>
                <li>• <span className="font-bold">Tree Layout</span> organizes nodes hierarchically</li>
                <li>• <span className="font-bold">Drag nodes</span> to adjust positions if needed</li>
              </ul>
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
      
      {/* Category View Indicator */}
      <div className="absolute top-2 left-2 z-10">
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-semibold text-sm border border-blue-300">
          Starting with Categories - Double-click to Explore
        </div>
      </div>
    </div>
  );
}
