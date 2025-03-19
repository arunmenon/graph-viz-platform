"use client";

import { GraphVisualization } from "@/components/GraphVisualization";
import { QueryPanel } from "@/components/QueryPanel";
import { BrowsePanel } from "@/components/BrowsePanel";
import { NodeInfoPanel } from "@/components/NodeInfoPanel";
import { useState, useEffect, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";

interface NodeData {
  id: string;
  label: string;
  color?: string;
  type?: string;
  description?: string;
  properties?: Record<string, unknown>;
  synonyms?: string[];
  citations?: string[];
}

function ExploreContentInner() {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const { loadSampleData } = useStore();
  const searchParams = useSearchParams();
  const action = searchParams?.get("action");
  const [activeTab, setActiveTab] = useState("query");

  // Load sample data when the page loads
  useEffect(() => {
    loadSampleData();

    // Set the active tab based on the URL parameter
    if (action === "browse") {
      setActiveTab("browse");
    } else if (action === "query" || action === "export") {
      setActiveTab("query");
    }
  }, [loadSampleData, action]);

  const handleCloseNodePanel = () => {
    setSelectedNode(null);
  };

  return (
    <main className="flex-1 flex flex-col">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold mb-4">Explore Graph Data</h1>
        <Tabs defaultValue={activeTab}>
          <TabsList>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
          </TabsList>
          <TabsContent value="query" className="space-y-4">
            <QueryPanel />
          </TabsContent>
          <TabsContent value="browse" className="space-y-4">
            <BrowsePanel />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-1 flex">
        <div className={`flex-1 h-[calc(100vh-220px)] ${selectedNode ? 'w-[calc(100%-20rem)]' : 'w-full'}`}>
          <GraphVisualization onNodeClick={(node) => setSelectedNode(node as NodeData)} />
        </div>

        {selectedNode && (
          <div className="w-80 border-l p-4 overflow-y-auto">
            <NodeInfoPanel
              node={selectedNode}
              onClose={handleCloseNodePanel}
            />
          </div>
        )}
      </div>
    </main>
  );
}

export function ExploreContent() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <ExploreContentInner />
    </Suspense>
  );
}
