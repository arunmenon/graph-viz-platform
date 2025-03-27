import { generateSampleData } from "./sampleData";

interface GraphNode {
  id: string;
  label: string;
  color?: string;
  type?: string;
  description?: string;
  properties?: Record<string, unknown>;
  synonyms?: string[];
  citations?: string[];
}

interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Connect to the Graph RAG API server
export async function processQuery(query: string): Promise<GraphData> {
  try {
    // Use our proxy API route instead of connecting directly to the Graph RAG API
    // This avoids CORS issues since we're making a same-origin request
    const apiUrl = "/api/query";
    console.log("Sending query to Graph RAG API via proxy:", query);
    
    try {
      // Use a simple fetch without abort controller to avoid browser issues
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query })
      });

    if (!response.ok) {
      console.error("API error:", response.status, response.statusText);
      
      // Try to parse the error response for more details
      try {
        const errorData = await response.json();
        console.error("API error details:", errorData);
        
        if (errorData && errorData.error) {
          throw new Error(`API error: ${errorData.error}`);
        } else if (errorData && errorData.detail) {
          throw new Error(`API error: ${errorData.detail}`);
        }
      } catch (parseError) {
        // If we can't parse JSON, try to get the text
        try {
          const errorText = await response.text();
          if (errorText && errorText.length > 0) {
            throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`);
          }
        } catch (textError) {
          // Ignore, fall back to status
        }
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Received response from API:", data);
    
    // Check if we have data from the API - look for expected fields
    // Based on the API response we've seen: answer, reasoning, evidence, confidence, processing_time
    if (data) {
      try {
        // Use this data to construct a graph visualization
        const graphData = constructGraphFromApiResponse(data, query);
        return {
          ...graphData,
          fromApi: true,
          rawResponse: data
        };
      } catch (parseError) {
        console.error("Error constructing graph from API response:", parseError);
        throw new Error("Could not construct graph from API response: " + 
          (parseError instanceof Error ? parseError.message : String(parseError)));
      }
    }
    
    throw new Error("Invalid API response format");
    
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      
      // Add detailed server error information to help with debugging
      if (fetchError.message.includes("500")) {
        console.error("This is likely a server-side error in your Graph RAG API.");
        console.error("Check your API server logs (in the terminal where you ran scripts/run_api.py) for details.");
        console.error("The API might be expecting a different request format or having internal errors.");
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error("Error querying Graph RAG API:", error);
    
    // Fallback to sample data
    console.warn("Falling back to sample data due to API error");
    const fullData = generateSampleData();
    
    // Convert query to lowercase for case-insensitive matching
    const lowercaseQuery = query.toLowerCase();

  // Process different types of queries
  if (lowercaseQuery.includes("all connections") || lowercaseQuery.includes("show all")) {
    // Extract entity name from query
    const entityMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

    if (entityMatches.length > 0) {
      const result = filterGraphByEntity(fullData, entityMatches[0], 1);
      return { ...result, fromApi: false };
    }
  } else if (lowercaseQuery.includes("related to")) {
    // Find relationships matching a specific type
    const conceptMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

    if (conceptMatches.length > 0) {
      const result = filterGraphByRelationship(fullData, "RELATED_TO", conceptMatches[0]);
      return { ...result, fromApi: false };
    }
  } else if (lowercaseQuery.includes("connect") || lowercaseQuery.includes("connection")) {
    // Find connections between two entities
    const entityMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

    if (entityMatches.length >= 2) {
      const result = findPathBetweenEntities(fullData, entityMatches[0], entityMatches[1]);
      return { ...result, fromApi: false };
    } else if (entityMatches.length === 1) {
      const result = filterGraphByEntity(fullData, entityMatches[0], 1);
      return { ...result, fromApi: false };
    }
  }

  // Default: return a subset of the data centered around a matching entity
  // or the central node if no matches
  const entityMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

  if (entityMatches.length > 0) {
    const result = filterGraphByEntity(fullData, entityMatches[0], 1);
    return { ...result, fromApi: false };
  }

    // Default to returning Customers table as the central node if no matches
    const result = filterGraphByEntity(fullData, "customers_table", 1);
    // Add metadata to indicate this is sample data
    return {
      ...result,
      fromApi: false
    };
  }
}

// Extract entity from query by matching node labels
function extractEntityFromQuery(query: string, nodes: GraphNode[]): string[] {
  const matches: string[] = [];

  // Check each node for a match in the query
  for (const node of nodes) {
    const normalizedLabel = node.label.toLowerCase();
    if (query.includes(normalizedLabel)) {
      matches.push(node.id);
    }

    // Also check synonyms
    if (node.synonyms) {
      for (const synonym of node.synonyms) {
        const normalizedSynonym = synonym.toLowerCase();
        if (query.includes(normalizedSynonym)) {
          matches.push(node.id);
          break;
        }
      }
    }
  }

  return matches;
}

// Filter graph data to only include nodes within a certain distance of a central node
function filterGraphByEntity(graphData: GraphData, centralNodeId: string, maxDistance = 1): GraphData {
  const includedNodeIds = new Set<string>([centralNodeId]);
  const nodesToProcess = [[centralNodeId, 0]]; // [nodeId, distance]
  const includedLinks: GraphLink[] = [];

  // Breadth-first traversal to find nodes within maxDistance
  while (nodesToProcess.length > 0) {
    const [currentNodeId, distance] = nodesToProcess.shift() as [string, number];

    if (distance < maxDistance) {
      // Find all links involving this node
      for (const link of graphData.links) {
        let connectedNodeId: string | null = null;

        if (link.source === currentNodeId) {
          connectedNodeId = link.target;
        } else if (link.target === currentNodeId) {
          connectedNodeId = link.source;
        }

        if (connectedNodeId && !includedNodeIds.has(connectedNodeId)) {
          includedNodeIds.add(connectedNodeId);
          nodesToProcess.push([connectedNodeId, distance + 1]);
          includedLinks.push(link);
        } else if (connectedNodeId && includedNodeIds.has(connectedNodeId)) {
          // Include links between already included nodes
          if (!includedLinks.some(l =>
            (l.source === link.source && l.target === link.target) ||
            (l.source === link.target && l.target === link.source)
          )) {
            includedLinks.push(link);
          }
        }
      }
    }
  }

  // Filter nodes and links
  const filteredNodes = graphData.nodes.filter(node => includedNodeIds.has(node.id));

  return {
    nodes: filteredNodes,
    links: includedLinks
  };
}

// Filter graph by relationship type and optionally a specific entity
function filterGraphByRelationship(graphData: GraphData, relationshipType: string, entityId?: string): GraphData {
  const includedLinks = graphData.links.filter(link => {
    const matchesRelationship = link.label === relationshipType;
    const matchesEntity = !entityId || link.source === entityId || link.target === entityId;
    return matchesRelationship && matchesEntity;
  });

  const includedNodeIds = new Set<string>();

  // Collect all node IDs involved in the filtered links
  for (const link of includedLinks) {
    includedNodeIds.add(link.source);
    includedNodeIds.add(link.target);
  }

  const filteredNodes = graphData.nodes.filter(node => includedNodeIds.has(node.id));

  return {
    nodes: filteredNodes,
    links: includedLinks
  };
}

// Transform API response to our graph data format
function transformApiResponseToGraphData(apiResponse: any): GraphData {
  try {
    console.log("Transforming API response:", JSON.stringify(apiResponse, null, 2).substring(0, 500) + '...');
    
    // The API might return the graph data in different formats
    // Try different possible locations for the graph data
    let graph;
    
    if (apiResponse.graph) {
      graph = apiResponse.graph;
    } else if (apiResponse.result && apiResponse.result.graph) {
      graph = apiResponse.result.graph;
    } else if (apiResponse.data && apiResponse.data.graph) {
      graph = apiResponse.data.graph;
    } else {
      // If we can't find the graph in expected locations, try to guess
      // by looking for nodes and relationships arrays
      for (const key in apiResponse) {
        if (apiResponse[key] && 
            Array.isArray(apiResponse[key].nodes) && 
            Array.isArray(apiResponse[key].relationships || apiResponse[key].links)) {
          graph = apiResponse[key];
          break;
        }
      }
      
      // Last resort - if we have arrays at the root
      if (!graph && Array.isArray(apiResponse.nodes) && Array.isArray(apiResponse.relationships || apiResponse.links)) {
        graph = apiResponse;
      }
    }
    
    if (!graph) {
      console.error("Could not find graph structure in API response");
      throw new Error("Invalid API response format: Could not find graph structure");
    }
    
    // Normalize the relationships field (some APIs use 'links' instead)
    const relationships = graph.relationships || graph.links || [];
    
    // Build nodes array
    const nodes: GraphNode[] = (graph.nodes || []).map((node: any) => ({
      id: node.id || node.nodeId || String(Math.random()).substring(2, 10), // Fallback to random ID
      label: node.label || node.name || node.title || node.id || "Unknown Node",
      type: node.type || node.category || node.labels?.[0] || "Unknown",
      description: node.description || node.desc || node.info || "",
      color: getNodeColor(node.type || node.category || node.labels?.[0]),
      properties: { ...node.properties }
    }));
    
    // Build links array
    const links: GraphLink[] = relationships.map((rel: any) => ({
      source: rel.source || rel.from || rel.sourceId || rel.fromId,
      target: rel.target || rel.to || rel.targetId || rel.toId,
      label: rel.type || rel.label || rel.relationship || "RELATED_TO"
    }));
    
    console.log(`Transformed ${nodes.length} nodes and ${links.length} relationships`);
    
    return { nodes, links };
  } catch (error) {
    console.error("Error transforming API response:", error);
    throw new Error("Failed to transform API response: " + (error instanceof Error ? error.message : String(error)));
  }
}

// Get color based on node type
function getNodeColor(type: string = "Unknown"): string {
  const colorMap: Record<string, string> = {
    Table: "#0047AB",      // Cobalt Blue
    Column: "#D32F2F",     // Bright red
    Schema: "#388E3C",     // Dark green
    Concept: "#FFC107",    // Amber yellow
    Entity: "#FFD54F",     // Light amber
    Property: "#26A69A",   // Medium teal
    Unknown: "#757575",    // Medium gray
    Default: "#757575"     // Medium gray
  };
  
  return colorMap[type] || colorMap.Default;
}

// Construct a graph visualization from the API response which may not have graph structure
function constructGraphFromApiResponse(apiResponse: any, originalQuery: string): GraphData {
  // Initialize empty graph structure
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  
  console.log("Constructing graph from API response:", apiResponse);
  
  try {
    // Extract data from the API response
    const { answer, reasoning, evidence, confidence } = apiResponse;
    
    // Create a central node for the query
    const queryNodeId = "query_node";
    nodes.push({
      id: queryNodeId,
      label: originalQuery,
      type: "Query",
      color: "#9C27B0", // Purple
      description: "Your original query"
    });
    
    // Create a node for the answer
    if (answer) {
      const answerNodeId = "answer_node";
      nodes.push({
        id: answerNodeId,
        label: typeof answer === 'string' 
          ? (answer.length > 50 ? answer.substring(0, 50) + '...' : answer)
          : "Answer",
        type: "Answer",
        color: "#4CAF50", // Green
        description: typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2)
      });
      
      // Link query to answer
      links.push({
        source: queryNodeId,
        target: answerNodeId,
        label: "ANSWERED_BY"
      });
    }
    
    // Add reasoning if available
    if (reasoning) {
      const reasoningNodeId = "reasoning_node";
      nodes.push({
        id: reasoningNodeId,
        label: "Reasoning",
        type: "Reasoning",
        color: "#FF9800", // Orange
        description: typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning, null, 2)
      });
      
      // Link answer to reasoning
      links.push({
        source: "answer_node",
        target: reasoningNodeId,
        label: "BECAUSE"
      });
    }
    
    // Add evidence items if available
    if (evidence && Array.isArray(evidence)) {
      evidence.forEach((item, index) => {
        const evidenceNodeId = `evidence_${index}`;
        
        // Get the content of the evidence
        let evidenceContent = "";
        let evidenceLabel = `Evidence ${index + 1}`;
        
        if (typeof item === 'string') {
          evidenceContent = item;
          evidenceLabel = item.length > 30 ? item.substring(0, 30) + '...' : item;
        } else if (item && typeof item === 'object') {
          // Try to extract text or content from the evidence object
          if (item.text || item.content) {
            evidenceContent = item.text || item.content;
            evidenceLabel = evidenceContent.length > 30 ? evidenceContent.substring(0, 30) + '...' : evidenceContent;
          } else {
            evidenceContent = JSON.stringify(item, null, 2);
          }
          
          // If there's a title, use that for the label
          if (item.title) {
            evidenceLabel = item.title;
          }
        }
        
        // Add the evidence node
        nodes.push({
          id: evidenceNodeId,
          label: evidenceLabel,
          type: "Evidence",
          color: "#2196F3", // Blue
          description: evidenceContent
        });
        
        // Link to reasoning or answer
        links.push({
          source: reasoning ? "reasoning_node" : "answer_node",
          target: evidenceNodeId,
          label: "SUPPORTED_BY"
        });
      });
    }
    
    // If we have confidence information, represent it visually
    if (confidence && typeof confidence === 'number') {
      const confidenceNodeId = "confidence_node";
      nodes.push({
        id: confidenceNodeId,
        label: `Confidence: ${Math.round(confidence * 100)}%`,
        type: "Confidence",
        color: confidence > 0.8 ? "#4CAF50" : confidence > 0.5 ? "#FF9800" : "#F44336", // Green, Orange, or Red
        description: `The system's confidence in this response is ${Math.round(confidence * 100)}%`
      });
      
      // Link answer to confidence
      links.push({
        source: "answer_node",
        target: confidenceNodeId,
        label: "HAS_CONFIDENCE"
      });
    }
    
    // If we have no nodes (unlikely), add a placeholder
    if (nodes.length === 0) {
      nodes.push({
        id: "placeholder",
        label: "No data available",
        type: "Unknown",
        color: "#757575", // Gray
        description: "The API response didn't contain visualizable data"
      });
    }
    
    return { nodes, links };
  } catch (error) {
    console.error("Error constructing graph from API response:", error);
    
    // Create a simple error graph
    return {
      nodes: [
        {
          id: "query_node",
          label: originalQuery,
          type: "Query",
          color: "#9C27B0", // Purple
          description: "Your original query"
        },
        {
          id: "error_node",
          label: "Error processing response",
          type: "Error",
          color: "#F44336", // Red
          description: error instanceof Error ? error.message : String(error)
        }
      ],
      links: [
        {
          source: "query_node",
          target: "error_node",
          label: "ERROR"
        }
      ]
    };
  }
}

// Find a path between two entities
function findPathBetweenEntities(graphData: GraphData, sourceId: string, targetId: string): GraphData {
  // Build an adjacency list for the graph
  const adjacencyList = new Map<string, string[]>();

  for (const link of graphData.links) {
    if (!adjacencyList.has(link.source)) {
      adjacencyList.set(link.source, []);
    }
    if (!adjacencyList.has(link.target)) {
      adjacencyList.set(link.target, []);
    }

    adjacencyList.get(link.source)!.push(link.target);
    adjacencyList.get(link.target)!.push(link.source); // Treat as undirected
  }

  // Use breadth-first search to find the shortest path
  const queue: string[][] = [[sourceId]];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentNode = path[path.length - 1];

    if (currentNode === targetId) {
      // Found the path
      const includedNodeIds = new Set<string>(path);
      const includedLinks: GraphLink[] = [];

      // Find links that connect nodes in the path
      for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];

        const link = graphData.links.find(l =>
          (l.source === source && l.target === target) ||
          (l.source === target && l.target === source)
        );

        if (link) {
          includedLinks.push(link);
        }
      }

      const filteredNodes = graphData.nodes.filter(node => includedNodeIds.has(node.id));

      return {
        nodes: filteredNodes,
        links: includedLinks
      };
    }

    const neighbors = adjacencyList.get(currentNode) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  // If no path found, return just the two nodes
  const includedNodeIds = new Set<string>([sourceId, targetId]);
  const filteredNodes = graphData.nodes.filter(node => includedNodeIds.has(node.id));

  return {
    nodes: filteredNodes,
    links: []
  };
}
