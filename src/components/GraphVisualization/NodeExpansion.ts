"use client";

import { GraphNode } from "./types";

// Handle node expansion functionality
export const handleNodeExpansion = async (
  node: GraphNode,
  graphRef: React.RefObject<any>,
  addNodesToGraph: (data: any) => void
) => {
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
      
      // Position child nodes directly below parent in a strict tree structure
      const parentX = node.x || 0;
      const parentY = node.y || 0;
      
      positionExpandedNodes(expandedData, graphRef, parentX, parentY);
      
      // Add nodes to the graph
      addNodesToGraph(expandedData);
      
      // After adding new nodes, arrange them in tree layout
      setTimeout(() => {
        repositionExpandedNodes(expandedData, graphRef, node, parentX, parentY);
      }, 100);
    } else {
      console.log("No additional connections found for node:", node.id);
    }
  } catch (error) {
    console.error("Error expanding node:", error);
  }
};

// Position the expanded nodes during expansion
const positionExpandedNodes = (
  expandedData: any, 
  graphRef: React.RefObject<any>, 
  parentX: number, 
  parentY: number
) => {
  expandedData.nodes.forEach((childNode: GraphNode, i: number) => {
    // If this is a new node (not already in the graph), position it
    if (graphRef.current && !graphRef.current.graphData().nodes.find((n: GraphNode) => n.id === childNode.id)) {
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
};

// Reposition expanded nodes after they've been added to the graph
const repositionExpandedNodes = (
  expandedData: any, 
  graphRef: React.RefObject<any>, 
  node: GraphNode, 
  parentX: number, 
  parentY: number
) => {
  if (graphRef.current) {
    // Get the current graph data
    const currentData = graphRef.current.graphData();
    
    // Find newly added nodes (children of the expanded node)
    const childNodes = currentData.nodes.filter((n: GraphNode) => 
      expandedData.nodes.some(newNode => newNode.id === n.id)
    );
    
    // Position children in a clear row below parent, FIXED positions
    const totalChildren = childNodes.length;
    const childSpacing = totalChildren <= 3 ? 150 : 100; // More space if fewer children
    const rowWidth = childSpacing * (totalChildren - 1);
    const startX = parentX - (rowWidth / 2);
    
    // Position each child with fixed coordinates
    childNodes.forEach((childNode: GraphNode, i: number) => {
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
};
