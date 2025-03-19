"use client";

import { create } from "zustand";
import { generateSampleData } from "./sampleData";

// Define the store types
interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    color?: string;
    type?: string;
    description?: string;
    properties?: Record<string, any>;
    synonyms?: string[];
    citations?: string[];
    connections?: Array<{
      type: string;
      target: string;
    }>;
  }>;
  links: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

interface StoreState {
  graphData: GraphData | null;
  originalGraphData: GraphData | null; // Store original data for filter resets
  lastQuery: string | null;
  setGraphData: (data: GraphData) => void;
  updateOriginalGraphData: (data: GraphData) => void;
  addNodesToGraph: (newData: GraphData) => void; // Add new nodes to existing graph
  setLastQuery: (query: string) => void;
  clearGraph: () => void;
  loadSampleData: () => void;
  resetToOriginalData: () => void; // Reset to unfiltered data
}

// Create the store
export const useStore = create<StoreState>((set, get) => ({
  graphData: null,
  originalGraphData: null,
  lastQuery: null,

  setGraphData: (data) => set({ graphData: data }),
  
  updateOriginalGraphData: (data) => set({ originalGraphData: data }),
  
  addNodesToGraph: (newData) => {
    const currentData = get().graphData;
    if (!currentData) {
      set({ graphData: newData, originalGraphData: newData });
      return;
    }
    
    console.log("Adding new nodes to graph:", {
      currentNodes: currentData.nodes.length,
      currentLinks: currentData.links.length,
      newNodes: newData.nodes.length,
      newLinks: newData.links.length
    });
    
    // Create maps for quick lookup
    const existingNodeIds = new Set(currentData.nodes.map(n => n.id));
    
    // Add only new nodes (filter out duplicates by id)
    const updatedNodes = [
      ...currentData.nodes,
      ...newData.nodes.filter(node => !existingNodeIds.has(node.id))
    ];
    
    // Get node IDs in the new combined graph
    const allNodeIds = new Set(updatedNodes.map(node => node.id));
    
    // Handle links - need to standardize the format of source/target first
    const normalizeLink = (link: any) => {
      // Extract source/target ids regardless of whether they're objects or strings
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      return {
        source: sourceId,
        target: targetId,
        label: link.label || ''
      };
    };
    
    // Create a Map of existing links for faster lookup
    const existingLinks = new Map();
    currentData.links.forEach(link => {
      const normalizedLink = normalizeLink(link);
      const linkKey = `${normalizedLink.source}-${normalizedLink.target}-${normalizedLink.label}`;
      existingLinks.set(linkKey, link);
    });
    
    // Add only new links, and ensure they reference nodes that exist
    const newLinks = [];
    
    newData.links.forEach(link => {
      const normalizedLink = normalizeLink(link);
      const sourceId = normalizedLink.source;
      const targetId = normalizedLink.target;
      
      // Skip links that reference non-existent nodes
      if (!allNodeIds.has(sourceId) || !allNodeIds.has(targetId)) {
        console.warn(`Skipping link ${sourceId} -> ${targetId}: nodes don't exist`);
        return;
      }
      
      // Check if this link already exists
      const linkKey = `${sourceId}-${targetId}-${normalizedLink.label}`;
      if (!existingLinks.has(linkKey)) {
        // Add the original link, it will be processed to object references later
        newLinks.push(link);
      }
    });
    
    const updatedLinks = [...currentData.links, ...newLinks];
    
    console.log("Updated graph data:", {
      updatedNodes: updatedNodes.length,
      updatedLinks: updatedLinks.length,
      newNodesAdded: updatedNodes.length - currentData.nodes.length,
      newLinksAdded: updatedLinks.length - currentData.links.length
    });
    
    const updatedGraph = {
      nodes: updatedNodes,
      links: updatedLinks
    };
    
    set({ 
      graphData: updatedGraph,
      originalGraphData: updatedGraph
    });
  },
  
  setLastQuery: (query) => set({ lastQuery: query }),
  
  clearGraph: () => set({ 
    graphData: null, 
    originalGraphData: null,
    lastQuery: null 
  }),
  
  loadSampleData: () => {
    const sampleData = generateSampleData();
    set({ 
      graphData: sampleData,
      originalGraphData: sampleData
    });
  },
  
  resetToOriginalData: () => {
    const { originalGraphData } = get();
    if (originalGraphData) {
      set({ graphData: originalGraphData });
    }
  },
}));
