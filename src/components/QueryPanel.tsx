"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useStore } from "@/lib/store";
import { Search } from "lucide-react";
import { processQuery } from "@/lib/queryProcessor";
import { Loader2 } from "lucide-react";

export function QueryPanel() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setGraphData, setLastQuery } = useStore();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    try {
      // Process the query and get graph data
      const result = await processQuery(query);
      setGraphData(result);
      setLastQuery(query);
    } catch (error) {
      console.error("Error processing query:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    "Show me all connections to Content Guidelines",
    "What regulations are related to intellectual property?",
    "How does Media connect to 18 U.S.C. § 1464?",
  ];

  const runExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
    // Automatically run the query after a short delay
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Ask a question about the graph data..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!query.trim() || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Query Graph
              </>
            )}
          </Button>
        </div>
      </form>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Example queries:</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button
              key={example}
              variant="outline"
              size="sm"
              onClick={() => runExample(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
