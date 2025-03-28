"use client";

import neo4j from 'neo4j-driver';
import { generateSampleData } from "./sampleData";

// Get Neo4j credentials from environment variables if available, otherwise use defaults
const NEO4J_URI = typeof process !== 'undefined' && process.env.NEO4J_URI ? process.env.NEO4J_URI : 'neo4j://localhost:7687';
const NEO4J_USER = typeof process !== 'undefined' && process.env.NEO4J_USER ? process.env.NEO4J_USER : 'neo4j';
const NEO4J_PASSWORD = typeof process !== 'undefined' && process.env.NEO4J_PASSWORD ? process.env.NEO4J_PASSWORD : 'neo4j';

// Try different Neo4j connection options, prioritizing environment variables
const CONNECTION_OPTIONS = [
  // First try with env variables or defaults
  { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD },
  
  // Then try alternate connection methods if needed
  { uri: NEO4J_URI.replace('neo4j://', 'bolt://'), user: NEO4J_USER, password: NEO4J_PASSWORD },
  { uri: NEO4J_URI.replace('localhost', '127.0.0.1'), user: NEO4J_USER, password: NEO4J_PASSWORD },
  { uri: NEO4J_URI.replace('neo4j://localhost', 'bolt://127.0.0.1'), user: NEO4J_USER, password: NEO4J_PASSWORD }
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

  // Enhanced color mapping for domain graph visualization
  // Using a carefully designed palette for maximum distinguishability
  const colorMap: Record<string, string> = {
    // Database structure - Blue family
    // Using different blues to show database hierarchy
    Table: '#1565C0',         // Strong blue - makes tables stand out as primary entities
    View: '#1E88E5',          // Medium blue - similar to tables but visually distinct
    Schema: '#0D47A1',        // Dark blue - container relationship
    Database: '#0277BD',      // Deep blue - highest level container
    
    // Table components - Purple family
    // Related to tables but visually distinct
    Column: '#6A1B9A',        // Rich purple - strongly contrasts with blue tables
    PrimaryKey: '#8E24AA',    // Brighter purple - important column type  
    ForeignKey: '#9C27B0',    // Lighter purple - relationship indicator
    Index: '#AB47BC',         // Soft purple - auxiliary structure
    
    // Data types - Teal family
    // Technical metadata gets cool teal tones
    DataType: '#00695C',      // Deep teal - technical classification
    Constraint: '#00897B',    // Medium teal
    Trigger: '#00ACC1',       // Light teal
    Function: '#26C6DA',      // Bright teal
    
    // Semantic concepts - Orange/Yellow family
    // Warm colors for semantic/business concepts
    Concept: '#FF6F00',       // Deep orange - primary semantic concept
    Entity: '#F57C00',        // Orange - business entity
    Property: '#FF9800',      // Bright orange - entity property
    Class: '#FFB300',         // Amber - classification
    Attribute: '#FFC107',     // Yellow - descriptive element
    
    // Relationships - Green family
    // Connection types get green shades
    Relationship: '#2E7D32',  // Forest green - explicit relationships
    Association: '#388E3C',   // Medium green
    Mapping: '#43A047',       // Light green
    Inheritance: '#66BB6A',   // Pale green
    
    // Business domains - Red family  
    // Business areas in warm reds
    Domain: '#C62828',        // Deep red - business domain
    Subject: '#D32F2F',       // Bright red
    Area: '#E53935',          // Light red
    Topic: '#EF5350',         // Pale red
    
    // Special categories
    Root: '#5D4037',          // Brown - root nodes
    Metric: '#7B1FA2',        // Purple - metrics/KPIs
    Glossary: '#00BCD4',      // Cyan - terminology
    External: '#607D8B',      // Blue-grey - external references
    
    // Fallbacks
    Unknown: '#9E9E9E',       // Medium grey
    default: '#757575'        // Dark grey
  }
  };

  try {
    records.forEach(record => {
      // Debug the record structure
      console.log("Processing record:", record.keys);
      
      record.forEach((value, key) => {
        console.log(`Processing record field: ${key}, type:`, typeof value, value ? value.constructor.name : 'null');
        
        // Skip null values but make sure we process node fields even if relationship is null
        if (!value) {
          console.log(`Skipping null/undefined value for key: ${key}`);
          // Still continue if this is a node field (we'll want to process just the nodes for root-only view)
          // Only return and skip if it's not the node
          if (key !== 'n') {
            return;
          }
        }
        
        if (neo4j.isNode(value)) {
          console.log("Found Node:", value.labels, value.properties);
          const node = value as neo4j.Node;
          const nodeId = node.identity.toString();
          const labels = node.labels;
          const properties = node.properties as Record<string, any>;
          
          // Properly identify node type from labels and properties
          let type = properties.type;
          
          // If type is not explicitly set, check labels
          if (!type && labels.length > 0) {
            // Check for Category in labels array first
            if (labels.includes('Category')) {
              type = 'Category';
            } else {
              // Default to first label
              type = labels[0];
            }
          }
          
          // Always respect the Category label
          if (labels.includes('Category')) {
            type = 'Category';
          }
          
          // Create a more human-readable label for the node
          let nodeLabel = '';
          
          // First try to get an explicit name property
          if (properties.name) {
            nodeLabel = String(properties.name).replace(/\|/g, '-');
          } else if (properties.title) {
            nodeLabel = String(properties.title).replace(/\|/g, '-');
          } else if (properties.label) {
            nodeLabel = String(properties.label).replace(/\|/g, '-');
          } else if (properties.id && typeof properties.id === 'string') {
            // Use ID if it's a string that looks like a name
            const idStr = properties.id.toString();
            // Check if the ID is not just a number
            if (!/^\d+$/.test(idStr)) {
              nodeLabel = idStr
                .replace(/_/g, ' ')
                .replace(/\|/g, '-')
                .replace(/([A-Z])/g, ' $1')
                .trim();
            }
          }
          
          // If we still don't have a good label, use the node type plus a short ID
          if (!nodeLabel && labels.length > 0) {
            const labelName = labels[0]
              .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
              .replace(/\|/g, '-')        // Replace pipe with dash
              .trim();
              
            const shortId = nodeId.substring(0, 3);
            nodeLabel = `${labelName} ${shortId}`;
          } else if (!nodeLabel) {
            // Last resort - just use Node plus ID
            nodeLabel = `Node ${nodeId.substring(0, 3)}`;
          }
          
          // Final safety check to replace any remaining pipe characters
          nodeLabel = nodeLabel.replace(/\|/g, '-');

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
                // Sanitize relationship label to remove pipe characters
                const relationshipLabel = (rel.type || 'RELATED_TO').replace(/\|/g, '-');
                
                links.set(linkKey, {
                  source: startId,
                  target: endId,
                  label: relationshipLabel,
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
                endNodeLabel = String(endNodeProperties.name).replace(/\|/g, '-');
              } else if (endNodeProperties.title) {
                endNodeLabel = String(endNodeProperties.title).replace(/\|/g, '-');
              } else if (endNodeProperties.label) {
                endNodeLabel = String(endNodeProperties.label).replace(/\|/g, '-');
              } else if (endNodeProperties.id && typeof endNodeProperties.id === 'string') {
                // Use ID if it's a string that looks like a name
                const idStr = endNodeProperties.id.toString();
                // Check if the ID is not just a number
                if (!/^\d+$/.test(idStr)) {
                  endNodeLabel = idStr
                    .replace(/_/g, ' ')
                    .replace(/\|/g, '-')
                    .replace(/([A-Z])/g, ' $1')
                    .trim();
                }
              }
              
              // If we still don't have a good label, use the node type plus a short ID
              if (!endNodeLabel && endNodeLabels.length > 0) {
                const labelName = endNodeLabels[0]
                  .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
                  .replace(/\|/g, '-')        // Replace pipe with dash
                  .trim();
                  
                const shortId = endNodeId.substring(0, 3);
                endNodeLabel = `${labelName} ${shortId}`;
              } else if (!endNodeLabel) {
                // Last resort - just use Node plus ID
                endNodeLabel = `Node ${endNodeId.substring(0, 3)}`;
              }
              
              // Final safety check to replace any remaining pipe characters
              endNodeLabel = endNodeLabel.replace(/\|/g, '-');
              
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
                  // Sanitize relationship label to remove pipe characters
                  const relationshipLabel = relationship.type.replace(/\|/g, '-');
                  
                  links.set(linkKey, {
                    source: startNodeId,
                    target: endNodeId,
                    label: relationshipLabel,
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
  
  // If we get here, return the processed data
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
    
    // Simple and flexible query for expansion
    const query = `
      // Match any node we want to expand
      MATCH (n)
      WHERE id(n) = $nodeId
      
      // Get all direct relationships and connected nodes
      MATCH (n)-[r]->(child)
      
      // Return the expanded node and its direct connections
      RETURN DISTINCT n, r, child as m, null as path
      
      UNION
      
      // Also get relationships between children
      MATCH (n)-[r1]->(child1)
      MATCH (n)-[r2]->(child2)
      MATCH (child1)-[r3]-(child2)
      WHERE id(n) = $nodeId AND id(child1) <> id(child2)
      RETURN DISTINCT child1 as n, r3 as r, child2 as m, null as path
      
      LIMIT 30
    `;
    
    const records = await runQuery(query, { nodeId: idParam });
    console.log(`Found ${records.length} connections for node ${nodeId}`);
    
    if (records.length === 0) {
      console.log(`No connections found for node ${nodeId}, trying alternate query`);
      
      // Simple fallback query without pipe characters
      const altQuery = `
        MATCH (n)
        WHERE id(n) = $nodeId
        
        // Find all relationships in either direction
        MATCH (n)-[r]-(m)
        
        // Return them as-is
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
    // Find all tables and their relationships in the domain graph
    const query = `
      // Find all Table nodes
      MATCH (table)
      WHERE table.type = 'Table' OR ANY(label IN labels(table) WHERE label = 'Table')
      
      // Return all tables
      RETURN table as n, null as r, null as m, null as path
      
      UNION
      
      // Find relationships between tables
      MATCH (table1)-[rel]-(table2)
      WHERE (table1.type = 'Table' OR ANY(label IN labels(table1) WHERE label = 'Table'))
      AND (table2.type = 'Table' OR ANY(label IN labels(table2) WHERE label = 'Table'))
      
      // Return table relationships
      RETURN table1 as n, rel as r, table2 as m, null as path
      
      UNION
      
      // Include immediate column relationships with tables
      MATCH (table)-[rel]-(column)
      WHERE (table.type = 'Table' OR ANY(label IN labels(table) WHERE label = 'Table'))
      AND (column.type = 'Column' OR ANY(label IN labels(column) WHERE label = 'Column'))
      
      // Return table-column relationships
      RETURN table as n, rel as r, column as m, null as path
    `;
    
    console.log("Executing Neo4j query:", query);
    const records = await runQuery(query);
    console.log(`Query returned ${records.length} records`);
    
    // If no root nodes found, fall back to most connected nodes
    if (records.length === 0) {
      console.log("No root nodes found, falling back to most connected nodes");
      
      // Fall back to most connected nodes approach
      const fallbackQuery = `
        // Find the most connected node as a starting point
        MATCH (n)-[r]-()
        WITH n, count(r) as rel_count
        ORDER BY rel_count DESC
        LIMIT 1
        
        // Get its immediate neighborhood (1-hop) as complete paths
        MATCH path = (n)-[r]-(m)
        RETURN DISTINCT n, r, m, path
        LIMIT 20
      `;
      
      console.log("Executing fallback query");
      const fallbackRecords = await runQuery(fallbackQuery);
      
      if (fallbackRecords.length > 0) {
        console.log(`Fallback query found ${fallbackRecords.length} records`);
        return transformNeo4jToGraph(fallbackRecords);
      }
      
      console.log("No relationships found with fallback query, trying to find any nodes");
      
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