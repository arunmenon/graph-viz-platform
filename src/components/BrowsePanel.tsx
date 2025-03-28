"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useStore } from "@/lib/store";
import { Database, RefreshCw, ListFilter, AlertTriangle } from "lucide-react";
import { fetchComplianceGraph, testConnection } from "@/lib/neo4jConnector";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { generateSampleData } from "@/lib/sampleData";

export function BrowsePanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setGraphData } = useStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [nodeTypes, setNodeTypes] = useState<string[]>([]);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<Set<string>>(new Set());

  const [noData, setNoData] = useState(false);
  
  // Auto-load domain graph data when component mounts
  useEffect(() => {
    handleLoadDomainGraph();
  }, []);
  
  const handleLoadDomainGraph = async () => {
    setIsLoading(true);
    setError(null);
    setNoData(false);
    
    try {
      // First test the connection
      const connectionTest = await testConnection();
      
      if (!connectionTest.success) {
        throw new Error(`Neo4j connection failed: ${connectionTest.error}`);
      }
      
      // Load domain graph data from Neo4j
      const graphData = await fetchComplianceGraph();
      
      // Check if we got empty data
      if (!graphData || graphData.nodes.length === 0) {
        console.warn("Connected to Neo4j but no data was returned");
        setNoData(true);
        
        // Load sample data for demonstration
        const sampleData = generateSampleData();
        
        // Get store actions
        const { setGraphData, updateOriginalGraphData } = useStore.getState();
        
        // Update both current and original data
        setGraphData(sampleData);
        updateOriginalGraphData(sampleData);
        
        // Collect sample data node types
        const types = new Set<string>();
        sampleData.nodes.forEach(node => {
          if (node.type) {
            types.add(node.type);
          }
        });
        
        setNodeTypes(Array.from(types));
        setSelectedNodeTypes(new Set(Array.from(types)));
        
        return;
      }
      
      // Get store actions
      const { setGraphData, updateOriginalGraphData } = useStore.getState();
      
      // Update both current and original graph data
      setGraphData(graphData);
      updateOriginalGraphData(graphData);
      
      // Collect all unique node types for filtering
      const types = new Set<string>();
      graphData.nodes.forEach(node => {
        if (node.type) {
          types.add(node.type);
        }
      });
      
      setNodeTypes(Array.from(types));
      setSelectedNodeTypes(new Set(Array.from(types))); // Select all by default
      
      console.log("Successfully loaded domain graph:", {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        nodeTypes: Array.from(types)
      });
      
    } catch (err) {
      console.error("Error loading domain graph:", err);
      
      // Extract and format error details
      let errorMessage = err.message || "Unknown error";
      
      // Display a more user-friendly error message
      if (errorMessage.includes("Failed to connect to Neo4j with all connection options")) {
        errorMessage = "Could not connect to Neo4j database. Please check your connection settings.";
      }
      
      setError(errorMessage);
      
      // Log the full error to console for debugging
      console.error("Detailed connection error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNodeType = (type: string) => {
    const newSelected = new Set(selectedNodeTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedNodeTypes(newSelected);
  };

  const applyFilters = () => {
    setFilterOpen(false);
    
    try {
      // Get current graph data
      const { originalGraphData, resetToOriginalData } = useStore.getState();
      
      // First, reset to original data to ensure we're filtering from complete dataset
      resetToOriginalData();
      
      // Now get the reset data
      const { graphData } = useStore.getState();
      
      if (!graphData) return;
      
      // If all types are selected, no need to filter
      if (selectedNodeTypes.size === nodeTypes.length) {
        return;
      }
      
      // Filter nodes based on selected types
      const filteredNodes = graphData.nodes.filter(node => 
        node.type && selectedNodeTypes.has(node.type)
      );
      
      // Get node IDs to filter links
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      
      // Filter links to only include connections between visible nodes
      const filteredLinks = graphData.links.filter(link => {
        // Handle both string and object references in links
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return nodeIds.has(sourceId as string) && nodeIds.has(targetId as string);
      });
      
      // Update graph with filtered data
      const { setGraphData } = useStore.getState();
      setGraphData({
        nodes: filteredNodes,
        links: filteredLinks
      });
    } catch (err) {
      console.error("Error applying filters:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={handleLoadDomainGraph}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Domain Graph
              </>
            )}
          </Button>
          
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={nodeTypes.length === 0}
              >
                <ListFilter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Graph by Node Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {nodeTypes.map(type => (
                    <Button 
                      key={type}
                      variant={selectedNodeTypes.has(type) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleNodeType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                {nodeTypes.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={applyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            <div className="font-medium mb-1">Connection Error:</div>
            <div className="mb-2">{error}</div>
            <div className="mt-2 border-t border-red-200 pt-2">
              <p className="font-medium text-sm">Troubleshooting steps:</p>
              <ul className="list-disc pl-5 mt-1 text-xs space-y-1">
                <li>Make sure Neo4j is running at <code className="bg-red-100 px-1 rounded">{process.env.NEXT_PUBLIC_NEO4J_URI || 'neo4j://localhost:7687'}</code></li>
                <li>Verify the username is <code className="bg-red-100 px-1 rounded">{process.env.NEXT_PUBLIC_NEO4J_USER || 'neo4j'}</code> in your .env.local file</li>
                <li>Check that your password in .env.local is correct</li>
                <li>Ensure Neo4j is reachable from your browser (no firewall blocks)</li>
              </ul>
            </div>
          </div>
        )}
        
        {noData && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Connected, but no data was found</p>
              <p className="mt-1">
                The database appears to be empty or doesn't contain domain graph data.
                Showing sample data for demonstration purposes.
              </p>
              <p className="mt-1 text-xs">
                To populate your domain graph, you can create tables, columns and semantic concept relationships.
                Example:
              </p>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
{`CREATE (tbl:Table {name: 'customers', type: 'Table'})
CREATE (col:Column {name: 'customer_id', type: 'Column'})
CREATE (concept:Concept {name: 'Person', type: 'Concept'})
CREATE (tbl)-[:CONTAINS]->(col)
CREATE (col)-[:MAPS_TO]->(concept)`}
              </pre>
            </div>
          </div>
        )}
        
        <div className="border rounded-md p-3 bg-muted/30">
          <h3 className="font-medium mb-2">About the Domain Graph</h3>
          <p className="text-sm text-muted-foreground mb-3">
            The Domain Graph is a knowledge graph connecting BigQuery schemas (tables/columns) to semantic concepts.
            You can explore connections between your data structures and domain concepts to better understand
            the semantic meaning of your data elements.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#1565C0]"></div>
              <span className="text-xs">Tables</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#6A1B9A]"></div>
              <span className="text-xs">Columns</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#9C27B0]"></div>
              <span className="text-xs">Foreign Keys</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#FF6F00]"></div>
              <span className="text-xs">Concepts</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#00695C]"></div>
              <span className="text-xs">Data Types</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}