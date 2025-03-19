"use client";

import { GraphNode, GraphData } from "./types";

// Find all descendant nodes of a given parent node
export const findDescendantNodes = (
  parentId: string,
  graphData: GraphData
): string[] => {
  // Map to track node connections (parent -> children)
  const connectionsMap = new Map<string, string[]>();
  
  // Build the connections map from links
  graphData.links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    if (!connectionsMap.has(sourceId)) {
      connectionsMap.set(sourceId, []);
    }
    connectionsMap.get(sourceId)!.push(targetId);
  });
  
  // Set to store all descendant node IDs (to avoid duplicates)
  const descendants = new Set<string>();
  
  // Recursive function to find all descendants
  const findChildren = (nodeId: string, visited = new Set<string>()) => {
    // Prevent cycles
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    // Get children of this node
    const children = connectionsMap.get(nodeId) || [];
    
    // Add each child to the descendants set
    children.forEach(childId => {
      descendants.add(childId);
      // Recursively find children of this child
      findChildren(childId, visited);
    });
  };
  
  // Start the recursive search from the parent node
  findChildren(parentId);
  
  return Array.from(descendants);
};

// Collapse a node (hide its descendants)
export const collapseNode = (
  node: GraphNode,
  graphRef: React.RefObject<any>,
  updateGraphData: (data: GraphData) => void
) => {
  if (!graphRef.current) return;
  
  const currentData = graphRef.current.graphData();
  const nodeId = node.id;
  
  // Visual feedback - blink the node
  const originalColor = node.color || "#1e88e5";
  node.color = "#ff8c00"; // Orange for collapse
  
  // Update the graph to show color change
  if (graphRef.current) {
    const zoom = graphRef.current.zoom();
    graphRef.current.zoom(zoom * 1.01, 10);
    setTimeout(() => graphRef.current.zoom(zoom, 10), 50);
  }
  
  // Find all descendants of this node
  const descendantIds = findDescendantNodes(nodeId, currentData);
  console.log(`Found ${descendantIds.length} descendants to collapse for node ${nodeId}`);
  
  if (descendantIds.length === 0) {
    console.log("No descendants to collapse for this node");
    // Restore original color after a delay
    setTimeout(() => {
      node.color = originalColor;
      if (graphRef.current) {
        const zoom = graphRef.current.zoom();
        graphRef.current.zoom(zoom * 1.01, 10);
        setTimeout(() => graphRef.current.zoom(zoom, 10), 50);
      }
    }, 300);
    return;
  }
  
  // Filter out the descendants from the node list
  const filteredNodes = currentData.nodes.filter(
    n => !descendantIds.includes(n.id)
  );
  
  // Filter out links connected to the removed nodes
  const filteredLinks = currentData.links.filter(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    return !descendantIds.includes(sourceId) && !descendantIds.includes(targetId);
  });
  
  // Restore original color
  node.color = originalColor;
  
  // Create updated graph data
  const updatedData = {
    nodes: filteredNodes,
    links: filteredLinks
  };
  
  // Update the graph with the filtered data
  updateGraphData(updatedData);
  
  // Reset the view to fit all remaining nodes
  setTimeout(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  }, 500);
};