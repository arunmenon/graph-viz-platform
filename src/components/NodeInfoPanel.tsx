"use client";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { X, ZoomIn, Plus, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { expandNode } from "@/lib/neo4jConnector";
import { useState } from "react";

interface NodeData {
  id: string;
  label?: string;
  type?: string;
  description?: string;
  properties?: Record<string, unknown>;
  synonyms?: string[];
  citations?: string[];
  connections?: Array<{
    type: string;
    target: string;
  }>;
}

interface NodeInfoPanelProps {
  node: NodeData;
  onClose?: () => void;
}

export function NodeInfoPanel({ node, onClose }: NodeInfoPanelProps) {
  const [isExpanding, setIsExpanding] = useState(false);
  const { addNodesToGraph } = useStore();
  
  if (!node) return null;
  
  const handleExpandNode = async () => {
    try {
      setIsExpanding(true);
      const expandedData = await expandNode(node.id);
      if (expandedData) {
        addNodesToGraph(expandedData);
      }
    } catch (error) {
      console.error("Error expanding node:", error);
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Node Details</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{node.label || "Unnamed Node"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex gap-2 mb-3">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={handleExpandNode}
              disabled={isExpanding}
            >
              {isExpanding ? (
                <>
                  <span className="animate-spin mr-1">⟳</span> Loading...
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3 w-3" /> Expand Node
                </>
              )}
            </Button>
          </div>
          {node.type && (
            <div>
              <p className="text-muted-foreground">Type</p>
              <p>{node.type}</p>
            </div>
          )}

          {node.description && (
            <div>
              <p className="text-muted-foreground">Description</p>
              <p>{node.description}</p>
            </div>
          )}

          {node.properties && Object.keys(node.properties).length > 0 && (
            <div>
              <p className="text-muted-foreground font-medium mb-1">Properties</p>
              <div className="space-y-2 bg-muted/20 p-2 rounded border">
                {Object.entries(node.properties)
                  // Skip properties already displayed elsewhere
                  .filter(([key]) => !['name', 'label', 'type', 'description', 'synonyms', 'citations'].includes(key))
                  .map(([key, value]) => {
                    // Format the value based on its type
                    let displayValue = String(value);
                    let valueClassName = ""; 
                    
                    if (typeof value === 'boolean') {
                      displayValue = value ? 'Yes' : 'No';
                      valueClassName = value ? 'text-green-600' : 'text-red-600';
                    } else if (value === null || value === undefined) {
                      displayValue = '-';
                      valueClassName = 'text-gray-400 italic';
                    } else if (Array.isArray(value)) {
                      displayValue = value.join(', ');
                      valueClassName = 'text-indigo-600';
                    } else if (typeof value === 'object') {
                      try {
                        displayValue = JSON.stringify(value, null, 2);
                        valueClassName = 'text-indigo-600 font-mono text-xs';
                      } catch (e) {
                        displayValue = '[Complex Object]';
                      }
                    }
                    
                    // Format the key to be more readable
                    const formattedKey = key
                      .replace(/_/g, ' ')
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase());
                    
                    return (
                      <div key={key} className="grid grid-cols-3 gap-2 border-b border-muted-foreground/10 pb-1">
                        <span className="font-medium text-muted-foreground col-span-1">{formattedKey}:</span>
                        <span className={`col-span-2 ${valueClassName}`}>{displayValue}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {node.synonyms && node.synonyms.length > 0 && (
            <div>
              <p className="text-muted-foreground">Synonyms</p>
              <p>{node.synonyms.join(", ")}</p>
            </div>
          )}

          {node.citations && node.citations.length > 0 && (
            <div>
              <p className="text-muted-foreground">Citations</p>
              <ul className="list-disc list-inside">
                {node.citations.map((citation, index) => (
                  <li key={index}>{citation}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {node.connections && node.connections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connections</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-1">
              {node.connections.map((connection, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{connection.type || "related to"}</span>
                  <span className="font-medium">{connection.target}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
