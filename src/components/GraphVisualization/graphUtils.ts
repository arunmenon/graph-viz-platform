"use client";

import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from "./types";
import { renderLinkLabels, renderNodes, linkDebugLogged } from "./renderFunctions";

// Preprocess graph data to ensure links have proper references
export const preprocessGraphData = (graphData: GraphData) => {
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
  
  return {
    nodes: graphData.nodes,
    links: processedLinks
  };
};

// Initialize the force graph with all its settings
export const initializeGraph = (mod: any, containerRef: React.RefObject<HTMLDivElement>, processedData: GraphData, width: number, height: number, rest: any) => {
  console.log("Processed data for force-graph:", {
    originalLinks: processedData.links.length,
    processedLinks: processedData.links.length,
    sampleLink: processedData.links.length > 0 ? processedData.links[0] : null
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
    .linkCanvasObject(renderLinkLabels)
    .onNodeClick(rest.onNodeClick)
    .cooldownTicks(200) // Longer cooldown for better stabilization
    .d3AlphaDecay(0.01) // Slower decay for more movement
    .d3VelocityDecay(0.2) // Moderate decay for controlled movement
    .d3Force('charge', null) // Remove charge force that causes radial layout
    .d3Force('link', d3.forceLink().distance(250).strength(1))
    .d3Force('center', null)
    .d3Force('collision', d3.forceCollide(80))
    .d3Force('y', d3.forceY(node => 300).strength(0.1))
    .d3Force('x', d3.forceX(node => width / 2).strength(0.1))
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
          // Set the global debug log flag
          (window as any).linkDebugLogged = true;
        }
      }
    })
    .onNodeHover(node => {
      if (containerRef.current) {
        containerRef.current.style.cursor = node ? 'grab' : 'default';
      }
    })
    .nodeRelSize(12)
    .enableNodeDrag(true)
    .onNodeDragEnd(node => {
      // Pin the node in place after dragging
      node.fx = node.x;
      node.fy = node.y;
    })
    .nodeCanvasObject(renderNodes);

  return graph;
};

// Initialize tree layout for the graph
export const initializeTreeLayout = (graph: any, width: number, height: number) => {
  // Get current data - looking for Category nodes only
  const data = graph.graphData();
  
  // Generic approach to identify Category nodes
  const categoryNodes = data.nodes.filter((node: GraphNode) => 
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
  categoryNodes.forEach((node: GraphNode, i: number) => {
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

// Apply tree layout to the graph for reset functionality
export const applyTreeLayout = (graphRef: React.RefObject<any>, dimensions: { width: number, height: number }) => {
  if (!graphRef.current) return;
  
  const graphData = graphRef.current.graphData();
  
  // Generic approach to identify Category nodes
  const categoryNodes = graphData.nodes.filter((node: GraphNode) => 
    // Check if node has Category type
    node.type === 'Category' ||
    // Check if node has Category in properties
    (node.properties && node.properties.category === true)
  );
  
  // If we found none, just use some other fallback
  if (categoryNodes.length === 0) {
    console.log("No Category nodes found in resetLayout, checking for subcategories");
    // Try to use subcategories as a fallback
    const fallbackNodes = graphData.nodes.filter((node: GraphNode) => 
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
  graphData.nodes.forEach((node: GraphNode) => nodeMap.set(node.id, node));
  
  // Create a map of parent -> children relationships
  const childrenMap = new Map();
  graphData.links.forEach((link: GraphLink) => {
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
  graphData.nodes.forEach((node: GraphNode) => {
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
  categoryNodes.forEach((node: GraphNode, i: number) => {
    const col = i % gridColumns;
    const row = Math.floor(i / gridColumns);
    
    // Fix position in grid layout
    node.fx = horizontalSpacing * (col + 1);
    node.fy = verticalSpacing * (row + 1);
  });
  
  // Function to position children recursively in a tree
  const positionChildren = (parentId: string, level = 1, horizontalOffset = 0) => {
    const children = childrenMap.get(parentId) || [];
    const parent = nodeMap.get(parentId);
    
    if (!parent || children.length === 0) return;
    
    const parentX = parent.fx || parent.x || 0;
    const parentY = parent.fy || parent.y || 0;
    
    // Calculate width needed for all children
    const childSpacing = 120;
    const totalWidth = (children.length - 1) * childSpacing;
    
    // Position each child
    children.forEach((childId: string, i: number) => {
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
  categoryNodes.forEach((category: GraphNode) => {
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
};
