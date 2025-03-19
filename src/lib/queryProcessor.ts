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

// In a real application, this would connect to a graph database
// or knowledge graph service. For this demo, we'll use simple string matching
// against our sample data.
export async function processQuery(query: string): Promise<GraphData> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get the complete sample data
  const fullData = generateSampleData();

  // Convert query to lowercase for case-insensitive matching
  const lowercaseQuery = query.toLowerCase();

  // Process different types of queries
  if (lowercaseQuery.includes("all connections") || lowercaseQuery.includes("show all")) {
    // Extract entity name from query
    const entityMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

    if (entityMatches.length > 0) {
      return filterGraphByEntity(fullData, entityMatches[0], 1);
    }
  } else if (lowercaseQuery.includes("related to")) {
    // Find relationships matching a specific type
    const conceptMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

    if (conceptMatches.length > 0) {
      return filterGraphByRelationship(fullData, "RELATED_TO", conceptMatches[0]);
    }
  } else if (lowercaseQuery.includes("connect") || lowercaseQuery.includes("connection")) {
    // Find connections between two entities
    const entityMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

    if (entityMatches.length >= 2) {
      return findPathBetweenEntities(fullData, entityMatches[0], entityMatches[1]);
    } else if (entityMatches.length === 1) {
      return filterGraphByEntity(fullData, entityMatches[0], 1);
    }
  }

  // Default: return a subset of the data centered around a matching entity
  // or the central node if no matches
  const entityMatches = extractEntityFromQuery(lowercaseQuery, fullData.nodes);

  if (entityMatches.length > 0) {
    return filterGraphByEntity(fullData, entityMatches[0], 1);
  }

  // Default to returning Content Guidelines as the central node if no matches
  return filterGraphByEntity(fullData, "content_guidelines", 1);
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
