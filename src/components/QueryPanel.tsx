"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useStore } from "@/lib/store";
import { Search } from "lucide-react";
import { processQuery } from "@/lib/queryProcessor";
import { Loader2 } from "lucide-react";
import { Card } from "./ui/card";

export function QueryPanel() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [showGraph, setShowGraph] = useState(false);
  const { setGraphData, setLastQuery } = useStore();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Add debug log
      console.log("Submitting query:", query);
      
      // Process the query and get graph data
      const result = await processQuery(query);
      
      console.log("Query result:", result);
      
      // Check if the result was from the API or a fallback
      if (result.fromApi) {
        setApiResponse(result.rawResponse || "API connected successfully");
        setError(null);
        console.log("Using API data");
        
        // Only update graph data if user wants to see visualization
        if (showGraph) {
          setGraphData(result);
        } else {
          // Provide minimal data to avoid empty graph error
          setGraphData({
            nodes: [],
            links: [],
            fromApi: true
          });
        }
      } else {
        // If using fallback data, show a gentle notification
        setError("Using sample data because API is unavailable");
        setApiResponse(null);
        console.log("Using fallback sample data");
        
        // For fallback data, still show the graph
        setGraphData(result);
      }
      
      setLastQuery(query);
    } catch (error: any) {
      console.error("Error processing query:", error);
      setError(error?.message || "Failed to process query. The API may be unavailable.");
      setApiResponse(null);
      
      // Still show sample data when there's an error
      try {
        const sampleResult = await processQuery(query);
        setGraphData(sampleResult);
        setLastQuery(query);
      } catch (fallbackError) {
        console.error("Failed to load fallback data:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    "What database tables are available?",
    "Show me all columns in the customers table",
    "How are orders related to products?",
    "List all tables with customer information",
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
          placeholder="Ask a question about your data schema and semantic concepts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="resize-none"
        />
        
        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm mb-2">
            <details className="cursor-pointer">
              <summary className="font-medium">API Error: Using fallback sample data</summary>
              <p className="mt-2 text-xs whitespace-pre-wrap">{error}</p>
              <div className="mt-2 text-xs">
                <p>Troubleshooting tips:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>Verify the API is running: <code>python scripts/run_api.py --port=8010</code></li>
                  <li><strong>Check the terminal where your API is running for error messages</strong></li>
                  <li>Make sure your API responds to POST requests at /query endpoint</li>
                  <li>Verify the API expects a 'question' field in JSON requests</li>
                  <li>If the API uses a different format, you may need to modify the API proxy code</li>
                </ul>
              </div>
            </details>
          </div>
        )}
        
        {apiResponse && !error && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm mb-2">
            <p>✓ Connected to Graph RAG API</p>
            <p className="text-xs mt-1">Showing real data from the semantic domain graph.</p>
          </div>
        )}
        
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

      {/* API Response Display */}
      {apiResponse && !error && (
        <Card className="p-4 mt-4 bg-white">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">API Response</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowGraph(!showGraph)}
            >
              {showGraph ? "Hide Graph" : "Show Graph"}
            </Button>
          </div>
          
          {/* Main card content with enhanced styling */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-sm p-5 mb-6 border border-blue-100">
            {/* Answer section with improved styling */}
            {apiResponse.answer && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 000-2H9z" clipRule="evenodd" />
                  </svg>
                  Response
                </h4>
                <div className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap bg-white bg-opacity-70 p-4 rounded-md border border-blue-100 shadow-inner">
                  {typeof apiResponse.answer === 'string' 
                    ? apiResponse.answer 
                    : JSON.stringify(apiResponse.answer, null, 2)}
                </div>
              </div>
            )}
            
            {/* Confidence indicator with better visual representation */}
            {apiResponse.confidence && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">Confidence</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                    apiResponse.confidence > 0.8 ? 'bg-green-100 text-green-800' : 
                    apiResponse.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {Math.round(apiResponse.confidence * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      apiResponse.confidence > 0.8 ? 'bg-green-500' : 
                      apiResponse.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(apiResponse.confidence * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Expandable sections for additional details */}
          <div className="space-y-3">
            {/* Reasoning section in collapsible panel */}
            {apiResponse.reasoning && (
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:bg-gray-50">
                  <span className="font-medium text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Reasoning
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 bg-white border-t-0 border border-gray-200 rounded-b-md mt-[-1px]">
                  <div className="text-gray-700 text-sm whitespace-pre-wrap">
                    {typeof apiResponse.reasoning === 'string' 
                      ? apiResponse.reasoning 
                      : JSON.stringify(apiResponse.reasoning, null, 2)}
                  </div>
                </div>
              </details>
            )}
            
            {/* Evidence section in collapsible panel */}
            {apiResponse.evidence && apiResponse.evidence.length > 0 && (
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:bg-gray-50">
                  <span className="font-medium text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Evidence ({apiResponse.evidence.length} {apiResponse.evidence.length === 1 ? 'item' : 'items'})
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 bg-white border-t-0 border border-gray-200 rounded-b-md mt-[-1px] divide-y divide-gray-100">
                  {apiResponse.evidence.map((item: any, index: number) => (
                    <div key={index} className="py-3 first:pt-0 last:pb-0">
                      <h5 className="font-medium text-blue-700 text-sm mb-1">Source {index + 1}</h5>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {typeof item === 'string' 
                          ? item 
                          : JSON.stringify(item, null, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </Card>
      )}
      
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
