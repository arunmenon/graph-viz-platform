"use client";

import neo4j from 'neo4j-driver';
import { generateSampleData } from "./sampleData";

// Try different Neo4j connection options
const CONNECTION_OPTIONS = [
  { uri: 'neo4j://localhost:7687', user: 'neo4j', password: 'Rathum12!' },
  { uri: 'bolt://localhost:7687', user: 'neo4j', password: 'Rathum12!' },
  { uri: 'neo4j://127.0.0.1:7687', user: 'neo4j', password: 'Rathum12!' },
  { uri: 'bolt://127.0.0.1:7687', user: 'neo4j', password: 'Rathum12!' }
];

// Default connection to start with
let currentConnectionIndex = 0;
let URI = CONNECTION_OPTIONS[currentConnectionIndex].uri;
let USER = CONNECTION_OPTIONS[currentConnectionIndex].user;
let PASSWORD = CONNECTION_OPTIONS[currentConnectionIndex].password;

// For debugging
console.log('Initial Neo4j connection settings:', { URI, USER, PASSWORD: '********' });

// Initialize the driver
let driver: neo4j.Driver | null = null;

export function initDriver() {
  try {
    if (!driver) {
      console.log("Connecting to Neo4j at", URI);
      driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
        connectionTimeout: 10000, // 10 seconds
      });
    }
    return driver;
  } catch (error) {
    console.error("Error initializing Neo4j driver:", error);
    throw error;
  }
}

// Test the connection to Neo4j with fallback options
export async function testConnection() {
  for (let i = 0; i < CONNECTION_OPTIONS.length; i++) {
    currentConnectionIndex = i;
    URI = CONNECTION_OPTIONS[i].uri;
    USER = CONNECTION_OPTIONS[i].user;
    PASSWORD = CONNECTION_OPTIONS[i].password;
    
    console.log(`Trying Neo4j connection ${i+1}/${CONNECTION_OPTIONS.length}:`, 
      { URI, USER, PASSWORD: '********' });
    
    // Close any existing driver
    if (driver) {
      await driver.close();
      driver = null;
    }
    
    try {
      // Create a new driver with these settings
      driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
        connectionTimeout: 5000,  // 5 seconds timeout for faster testing
      });
      
      const serverInfo = await driver.verifyConnectivity();
      console.log(`Successfully connected to Neo4j with option ${i+1}:`, serverInfo);
      return { success: true, serverInfo, connectionDetails: { URI, USER } };
    } catch (error) {
      console.error(`Failed to connect with option ${i+1}:`, error);
      // Continue to next option
    }
  }
  
  // If we reach here, all connection attempts failed
  return { 
    success: false, 
    error: new Error("Failed to connect to Neo4j with all connection options"),
    triedOptions: CONNECTION_OPTIONS.map(opt => opt.uri)
  };
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export async function runQuery(cypher: string, params = {}) {
  const session = initDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } catch (error) {
    console.error("Error running Neo4j query:", error);
    throw error;
  } finally {
    await session.close();
  }
}

// Transform Neo4j data to the graph visualization format
export function transformNeo4jToGraph(records: neo4j.Record[]): {
  nodes: Array<{
    id: string;
    label: string;
    color?: string;
    type?: string;
    description?: string;
    properties?: Record<string, any>;
  }>;
  links: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
} {
  const nodes = new Map();
  const links = new Map(); // Changed to Map for deduplication with proper keys

  // Color mapping for different node types
  const colorMap: Record<string, string> = {
    Regulation: '#2980b9',
    Standard: '#3498db',
    Organization: '#e67e22',
    Concept: '#3498db',
    Entity: '#3498db',
    Compliance: '#16a085',
    'Legal Case': '#8e44ad',
    Legislation: '#c0392b',
    default: '#95a5a6',
  };

  try {
    records.forEach(record => {
      // Debug the record structure
      console.log("Processing record:", record.keys);
      
      record.forEach((value, key) => {
        console.log(`Processing record field: ${key}, type:`, typeof value, value ? value.constructor.name : 'null');
        
        // Skip null values
        if (!value) {
          console.log(`Skipping null/undefined value for key: ${key}`);
          return;
        }
        
        if (neo4j.isNode(value)) {
          console.log("Found Node:", value.labels, value.properties);
          const node = value as neo4j.Node;
          const nodeId = node.identity.toString();
          const labels = node.labels;
          const properties = node.properties as Record<string, any>;
          
          // Get the type from labels or default to the first label
          const type = properties.type || (labels.length > 0 ? labels[0] : 'Unknown');
          
          // Create a more human-readable label for the node
          let nodeLabel = '';
          
          // First try to get an explicit name property
          if (properties.name) {
            nodeLabel = properties.name;
          } else if (properties.title) {
            nodeLabel = properties.title;
          } else if (properties.label) {
            nodeLabel = properties.label;
          } else if (properties.id && typeof properties.id === 'string') {
            // Use ID if it's a string that looks like a name
            const idStr = properties.id.toString();
            // Check if the ID is not just a number
            if (!/^\d+$/.test(idStr)) {
              nodeLabel = idStr
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .trim();
            }
          }
          
          // If we still don't have a good label, use the node type plus a short ID
          if (!nodeLabel && labels.length > 0) {
            const labelName = labels[0]
              .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
              .trim();
              
            const shortId = nodeId.substring(0, 3);
            nodeLabel = `${labelName} ${shortId}`;
          } else if (!nodeLabel) {
            // Last resort - just use Node plus ID
            nodeLabel = `Node ${nodeId.substring(0, 3)}`;
          }

          // Create node if it doesn't exist
          if (!nodes.has(nodeId)) {
            nodes.set(nodeId, {
              id: nodeId,
              label: nodeLabel,
              type,
              color: colorMap[type] || colorMap.default,
              description: properties.description || '',
              properties: { ...properties },
            });
          }
        } else if (neo4j.isRelationship(value)) {
          console.log("Found Relationship:", value.type);
          const rel = value as neo4j.Relationship;
          try {
            // Look for the source and target nodes in the record
            const sourceNode = record.get('n');
            const targetNode = record.get('m');
            
            if (sourceNode && targetNode && sourceNode.identity && targetNode.identity) {
              const startId = sourceNode.identity.toString();
              const endId = targetNode.identity.toString();
              
              console.log("Creating link from record nodes:", { 
                startId, 
                endId, 
                type: rel.type 
              });
              
              // Create a unique key for this link that ignores direction to prevent duplicates
              // Sort the IDs to ensure the same link doesn't appear twice regardless of direction
              const [nodeA, nodeB] = [startId, endId].sort();
              const linkKey = `${nodeA}-${nodeB}-${rel.type || 'RELATED_TO'}`;
              
              // Only add if we don't already have this link (regardless of direction)
              if (!links.has(linkKey)) {
                links.set(linkKey, {
                  source: startId,
                  target: endId,
                  label: rel.type || 'RELATED_TO',
                });
              }
            } else {
              console.warn("Failed to create relationship - cannot find node identities in record");
            }
          } catch (e) {
            console.error("Error processing relationship:", e);
          }
        } else if (neo4j.isPath(value)) {
          console.log("Found Path with segments:", value.segments.length);
          const path = value as neo4j.Path;
          
          // Add all nodes from the path
          path.segments.forEach(segment => {
            try {
              const startNode = segment.start;
              const endNode = segment.end;
              const relationship = segment.relationship;
              
              if (!startNode || !endNode || !relationship) {
                console.warn("Incomplete path segment:", segment);
                return;
              }
              
              // Process start node with careful null checking
              if (!startNode.identity) {
                console.warn("Start node missing identity:", startNode);
                return;
              }
              
              const startNodeId = startNode.identity.toString();
              const startNodeLabels = startNode.labels || [];
              const startNodeProperties = (startNode.properties || {}) as Record<string, any>;
              const startNodeType = (startNodeProperties.type || 
                                (startNodeLabels.length > 0 ? startNodeLabels[0] : 'Unknown'));
              
              if (!nodes.has(startNodeId)) {
                nodes.set(startNodeId, {
                  id: startNodeId,
                  label: startNodeProperties.name || startNodeProperties.title || `Node ${startNodeId}`,
                  type: startNodeType,
                  color: colorMap[startNodeType] || colorMap.default,
                  description: startNodeProperties.description || '',
                  properties: { ...startNodeProperties },
                });
              }
              
              // Process end node with careful null checking
              if (!endNode.identity) {
                console.warn("End node missing identity:", endNode);
                return;
              }
              
              const endNodeId = endNode.identity.toString();
              const endNodeLabels = endNode.labels || [];
              const endNodeProperties = (endNode.properties || {}) as Record<string, any>;
              const endNodeType = (endNodeProperties.type || 
                                (endNodeLabels.length > 0 ? endNodeLabels[0] : 'Unknown'));
              
              // Create a more human-readable label for the end node
              let endNodeLabel = '';
              
              // First try to get an explicit name property
              if (endNodeProperties.name) {
                endNodeLabel = endNodeProperties.name;
              } else if (endNodeProperties.title) {
                endNodeLabel = endNodeProperties.title;
              } else if (endNodeProperties.label) {
                endNodeLabel = endNodeProperties.label;
              } else if (endNodeProperties.id && typeof endNodeProperties.id === 'string') {
                // Use ID if it's a string that looks like a name
                const idStr = endNodeProperties.id.toString();
                // Check if the ID is not just a number
                if (!/^\d+$/.test(idStr)) {
                  endNodeLabel = idStr
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .trim();
                }
              }
              
              // If we still don't have a good label, use the node type plus a short ID
              if (!endNodeLabel && endNodeLabels.length > 0) {
                const labelName = endNodeLabels[0]
                  .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
                  .trim();
                  
                const shortId = endNodeId.substring(0, 3);
                endNodeLabel = `${labelName} ${shortId}`;
              } else if (!endNodeLabel) {
                // Last resort - just use Node plus ID
                endNodeLabel = `Node ${endNodeId.substring(0, 3)}`;
              }
              
              if (!nodes.has(endNodeId)) {
                nodes.set(endNodeId, {
                  id: endNodeId,
                  label: endNodeLabel,
                  type: endNodeType,
                  color: colorMap[endNodeType] || colorMap.default,
                  description: endNodeProperties.description || '',
                  properties: { ...endNodeProperties },
                });
              }
              
              // Process relationship 
              // Make sure we have valid node identities for both ends
              if (startNodeId && endNodeId) {
                console.log("Creating path segment link:", {
                  from: startNodeId,
                  to: endNodeId,
                  type: relationship.type
                });
                
                // Create a unique key for this link that ignores direction to prevent duplicates
                // Sort the IDs to ensure the same link doesn't appear twice regardless of direction
                const [nodeA, nodeB] = [startNodeId, endNodeId].sort();
                const linkKey = `${nodeA}-${nodeB}-${relationship.type}`;
                
                // Only add if we don't already have this link (regardless of direction)
                if (!links.has(linkKey)) {
                  links.set(linkKey, {
                    source: startNodeId,
                    target: endNodeId,
                    label: relationship.type,
                  });
                }
              } else {
                console.warn("Skipping path segment - missing node IDs");
              }
            } catch (e) {
              console.error("Error processing path segment:", e);
            }
          });
        } else {
          // For non-graph types, just log what we received
          console.log(`Unknown value type for key ${key}:`, value);
        }
      });
    });
  } catch (error) {
    console.error("Error transforming Neo4j data:", error);
    // Return empty data structure on error
    return { nodes: [], links: [] };
  }

  return {
    nodes: Array.from(nodes.values()),
    links: Array.from(links.values()),
  };
}

// Fetch the compliance taxonomy graph
// Function to expand a specific node by fetching its neighbors
export async function expandNode(nodeId: string) {
  try {
    // Convert string ID to integer if needed (Neo4j often uses integers for IDs)
    let idParam = nodeId;
    if (/^\d+$/.test(nodeId)) {
      idParam = parseInt(nodeId, 10);
    }
    
    console.log(`Expanding node: ${nodeId}`);
    
    // More specific query that explicitly returns the complete path
    const query = `
      // Get all relationships for this node (both directions)
      // Use DISTINCT to avoid duplicate relationships
      MATCH path = (n)-[r]-(m)
      WHERE id(n) = $nodeId
      RETURN DISTINCT n, r, m, path
      LIMIT 20
    `;
    
    const records = await runQuery(query, { nodeId: idParam });
    console.log(`Found ${records.length} connections for node ${nodeId}`);
    
    if (records.length === 0) {
      console.log(`No connections found for node ${nodeId}, trying alternate query`);
      
      // Try a more permissive query if the first one returns nothing
      const altQuery = `
        MATCH (n)
        WHERE id(n) = $nodeId
        WITH n
        MATCH (n)-[r]-(m)
        RETURN n, r, m
        LIMIT 20
      `;
      
      const altRecords = await runQuery(altQuery, { nodeId: idParam });
      console.log(`Alternate query found ${altRecords.length} connections`);
      
      if (altRecords.length > 0) {
        return transformNeo4jToGraph(altRecords);
      }
    }
    
    // Transform and validate the graph data
    const graphData = transformNeo4jToGraph(records);
    
    // Add debugging to verify data structure
    console.log(`Transformation results - Nodes: ${graphData.nodes.length}, Links: ${graphData.links.length}`);
    
    // Validate that all link sources and targets exist in the nodes
    const nodeIds = new Set(graphData.nodes.map(n => n.id));
    
    // Filter out any links with invalid source/target
    const validLinks = graphData.links.filter(link => {
      const sourceExists = nodeIds.has(link.source);
      const targetExists = nodeIds.has(link.target);
      
      if (!sourceExists || !targetExists) {
        console.warn(`Invalid link found: ${link.source} -> ${link.target}. Source exists: ${sourceExists}, Target exists: ${targetExists}`);
      }
      
      return sourceExists && targetExists;
    });
    
    // Return the validated graph data
    return {
      nodes: graphData.nodes,
      links: validLinks
    };
  } catch (error) {
    console.error(`Error expanding node ${nodeId}:`, error);
    throw error;
  }
}

export async function fetchComplianceGraph() {
  try {
    // Use a direct path-based query that explicitly returns complete paths
    const query = `
      // Find the most connected node as a starting point
      MATCH (n)-[r]-()
      WITH n, count(r) as rel_count
      ORDER BY rel_count DESC
      LIMIT 1
      
      // Get its immediate neighborhood (1-hop) as complete paths
      // Use DISTINCT to avoid duplicate relationships
      MATCH path = (n)-[r]-(m)
      RETURN DISTINCT n, r, m, path
      LIMIT 20
    `;
    
    console.log("Executing Neo4j query:", query);
    const records = await runQuery(query);
    console.log(`Query returned ${records.length} records`);
    
    // If that returns no data, try to fetch nodes and create relationships manually
    if (records.length === 0 || !records[0] || !records[0].get('r')) {
      console.log("No relationships found, trying to find any nodes");
      
      // Just get all nodes
      const nodeQuery = `MATCH (n) RETURN n LIMIT 50`;
      const nodeRecords = await runQuery(nodeQuery);
      console.log(`Found ${nodeRecords.length} nodes in database`);
      
      // Safely check for node records
      if (nodeRecords && nodeRecords.length > 0) {
        try {
          // If we have nodes, let's try to find relationships between them
          const nodeIds = [];
          for (const rec of nodeRecords) {
            const node = rec.get('n');
            if (node && node.identity) {
              nodeIds.push(node.identity);
            }
          }
          
          if (nodeIds.length > 0) {
            const relationshipQuery = `
              MATCH (n)-[r]->(m) 
              WHERE id(n) IN [${nodeIds.join(',')}]
              RETURN n, r, m
            `;
            console.log("Looking for relationships between found nodes");
            const relRecords = await runQuery(relationshipQuery);
            
            if (relRecords && relRecords.length > 0) {
              console.log(`Found ${relRecords.length} relationships`);
              return transformNeo4jToGraph(relRecords);
            }
          }
        } catch (err) {
          console.error("Error looking for relationships:", err);
        }
        
        // If still no relationships, try to manually create a simple graph
        console.log("No relationships found, creating a simple connected graph from nodes");
        const graphData = transformNeo4jToGraph(nodeRecords);
        
        // If we have more than one node, create some artificial connections
        // so we can at least see the nodes in the visualization
        if (graphData.nodes && graphData.nodes.length > 1) {
          const centerNode = graphData.nodes[0];
          
          // Connect each node to the center node
          for (let i = 1; i < Math.min(graphData.nodes.length, 10); i++) {
            graphData.links.push({
              source: centerNode.id,
              target: graphData.nodes[i].id,
              label: 'CONNECTED_TO'
            });
          }
        }
        
        return graphData;
      }
      
      // As a last resort, return the sample data
      console.log("No nodes found, using sample data instead");
      return generateSampleData();
    }
    
    return transformNeo4jToGraph(records);
  } catch (error) {
    console.error("Error in fetchComplianceGraph:", error);
    throw error;
  }
}