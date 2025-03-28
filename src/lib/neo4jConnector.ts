"use client";

import neo4j from 'neo4j-driver';
import { generateSampleData } from "./sampleData";

import { clientEnv } from "./utils";

// Get Neo4j credentials from clientEnv utility that handles environment variables
const NEO4J_URI = clientEnv.neo4j.uri;
const NEO4J_USER = clientEnv.neo4j.user;
const NEO4J_PASSWORD = clientEnv.neo4j.password;

// For debugging
console.log('Neo4j connection settings:', { 
  uri: NEO4J_URI, 
  user: NEO4J_USER, 
  password: NEO4J_PASSWORD === 'neo4j' ? 'default_password' : '********'
});

// Connection management with rate limiting
let driver: neo4j.Driver | null = null;
let lastConnectionAttempt = 0;
const CONNECTION_THROTTLE_MS = 10000; // Minimum 10 seconds between connection attempts

export function initDriver() {
  try {
    // Check if we already have a valid driver
    if (driver) {
      return driver;
    }
    
    // Throttle connection attempts
    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_THROTTLE_MS) {
      console.log("Connection attempts throttled. Please wait before retrying.");
      throw new Error("Too many connection attempts. Please wait a few seconds before retrying.");
    }
    
    lastConnectionAttempt = now;
    
    console.log("Initializing Neo4j driver at", NEO4J_URI);
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      connectionTimeout: 10000, // 10 seconds
      maxConnectionLifetime: 60 * 60 * 1000, // 1 hour
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5000,
      disableLosslessIntegers: true,
    });
    
    return driver;
  } catch (error) {
    console.error("Error initializing Neo4j driver:", error);
    throw error;
  }
}

// Test the connection to Neo4j
export async function testConnection() {
  try {
    // Use any existing driver or create a new one
    const currentDriver = driver || initDriver();
    
    // Just verify connectivity without creating a new connection
    console.log("Testing Neo4j connection to:", NEO4J_URI);
    const serverInfo = await currentDriver.verifyConnectivity();
    
    console.log("Successfully connected to Neo4j:", serverInfo);
    return { 
      success: true, 
      serverInfo, 
      connectionDetails: { 
        uri: NEO4J_URI, 
        user: NEO4J_USER 
      } 
    };
  } catch (error) {
    console.error("Failed to connect to Neo4j:", error);
    
    // Clean up any failed driver
    if (driver) {
      try {
        await driver.close();
      } catch (e) {
        console.log("Error closing failed driver:", e);
      }
      driver = null;
    }
    
    // More helpful error message based on the error type
    let errorMessage = "Failed to connect to Neo4j database";
    
    if (error.code === 'ServiceUnavailable') {
      errorMessage = `Neo4j database is not available at ${NEO4J_URI}. Is the database running?`;
    } else if (error.message && error.message.includes('unauthorized')) {
      errorMessage = `Authentication failed for user '${NEO4J_USER}'. Check your credentials in .env.local file.`;
    } else if (error.message && error.message.includes('Pool is closed')) {
      errorMessage = `Connection pool is closed. The application will create a new connection on next attempt.`;
    }
    
    return { 
      success: false, 
      error: new Error(errorMessage),
      originalError: error
    };
  }
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export async function runQuery(cypher: string, params = {}) {
  let session = null;
  
  try {
    // Initialize driver and create a session
    const currentDriver = initDriver();
    session = currentDriver.session();
    
    // Run the query
    console.log("Running Neo4j query:", cypher.substring(0, 100) + (cypher.length > 100 ? "..." : ""));
    const result = await session.run(cypher, params);
    return result.records;
  } catch (error) {
    // Handle different types of errors
    console.error("Error running Neo4j query:", error);
    
    // If it's a connection error, clear the driver for next attempt
    if (error.message && (
        error.message.includes('Pool is closed') || 
        error.message.includes('connection') ||
        error.message.includes('Connection')
      )) {
      if (driver) {
        try {
          await driver.close();
        } catch (e) {
          console.log("Error closing failed driver:", e);
        }
        driver = null;
      }
    }
    
    throw error;
  } finally {
    // Always close the session to release resources
    if (session) {
      try {
        await session.close();
      } catch (e) {
        console.log("Error closing session:", e);
      }
    }
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
  // Create maps to store unique nodes and links
  const nodes = new Map();
  const links = new Map();

  // Enhanced color mapping for domain graph visualization
  const colorMap: Record<string, string> = {
    // Database structure - Blue family
    Table: '#1565C0',         // Strong blue - makes tables stand out as primary entities
    View: '#1E88E5',          // Medium blue - similar to tables but visually distinct
    Schema: '#0D47A1',        // Dark blue - container relationship
    Database: '#0277BD',      // Deep blue - highest level container
    
    // Table components - Purple family
    Column: '#6A1B9A',        // Rich purple - strongly contrasts with blue tables
    PrimaryKey: '#8E24AA',    // Brighter purple - important column type  
    ForeignKey: '#9C27B0',    // Lighter purple - relationship indicator
    Index: '#AB47BC',         // Soft purple - auxiliary structure
    
    // Data types - Teal family
    DataType: '#00695C',      // Deep teal - technical classification
    Constraint: '#00897B',    // Medium teal
    Trigger: '#00ACC1',       // Light teal
    Function: '#26C6DA',      // Bright teal
    
    // Semantic concepts - Orange/Yellow family
    Concept: '#FF6F00',       // Deep orange - primary semantic concept
    Entity: '#F57C00',        // Orange - business entity
    Property: '#FF9800',      // Bright orange - entity property
    Class: '#FFB300',         // Amber - classification
    Attribute: '#FFC107',     // Yellow - descriptive element
    
    // Relationships - Green family
    Relationship: '#2E7D32',  // Forest green - explicit relationships
    Association: '#388E3C',   // Medium green
    Mapping: '#43A047',       // Light green
    Inheritance: '#66BB6A',   // Pale green
    
    // Business domains - Red family  
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
  };

  try {
    // Process each record from Neo4j
    records.forEach(record => {
      console.log("Processing record:", record.keys);
      
      record.forEach((value, key) => {
        // Handle null values
        if (!value) {
          console.log(`Skipping null value for key: ${key}`);
          if (key !== 'n') return; // Continue only for node fields
        }
        
        // Process Neo4j nodes
        if (neo4j.isNode(value)) {
          const node = value as neo4j.Node;
          const nodeId = node.identity.toString();
          const labels = node.labels;
          const properties = node.properties as Record<string, any>;
          
          // Determine node type
          let type = properties.type;
          if (!type && labels.length > 0) {
            type = labels.includes('Category') ? 'Category' : labels[0];
          }
          
          // Create node label
          let nodeLabel = '';
          if (properties.name) {
            nodeLabel = String(properties.name).replace(/\|/g, '-');
          } else if (properties.title) {
            nodeLabel = String(properties.title).replace(/\|/g, '-');
          } else if (properties.label) {
            nodeLabel = String(properties.label).replace(/\|/g, '-');
          } else if (properties.id && typeof properties.id === 'string') {
            const idStr = properties.id.toString();
            if (!/^\d+$/.test(idStr)) {
              nodeLabel = idStr
                .replace(/_/g, ' ')
                .replace(/\|/g, '-')
                .replace(/([A-Z])/g, ' $1')
                .trim();
            }
          }
          
          // Fallback label
          if (!nodeLabel) {
            if (labels.length > 0) {
              const labelName = labels[0]
                .replace(/([A-Z])/g, ' $1')
                .replace(/\|/g, '-')
                .trim();
              nodeLabel = `${labelName} ${nodeId.substring(0, 3)}`;
            } else {
              nodeLabel = `Node ${nodeId.substring(0, 3)}`;
            }
          }
          
          // Add node to collection
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
        } 
        // Process Neo4j relationships
        else if (neo4j.isRelationship(value)) {
          const rel = value as neo4j.Relationship;
          try {
            const sourceNode = record.get('n');
            const targetNode = record.get('m');
            
            if (sourceNode && targetNode && sourceNode.identity && targetNode.identity) {
              const startId = sourceNode.identity.toString();
              const endId = targetNode.identity.toString();
              
              // Create unique key for relationship to avoid duplicates
              const [nodeA, nodeB] = [startId, endId].sort();
              const linkKey = `${nodeA}-${nodeB}-${rel.type || 'RELATED_TO'}`;
              
              if (!links.has(linkKey)) {
                links.set(linkKey, {
                  source: startId,
                  target: endId,
                  label: (rel.type || 'RELATED_TO').replace(/\|/g, '-'),
                });
              }
            }
          } catch (e) {
            console.error("Error processing relationship:", e);
          }
        } 
        // Process Neo4j paths
        else if (neo4j.isPath(value)) {
          const path = value as neo4j.Path;
          
          path.segments.forEach(segment => {
            try {
              if (!segment.start || !segment.end || !segment.relationship) return;
              if (!segment.start.identity || !segment.end.identity) return;
              
              const startNodeId = segment.start.identity.toString();
              const endNodeId = segment.end.identity.toString();
              
              // Process start node
              if (!nodes.has(startNodeId)) {
                const startProps = segment.start.properties as Record<string, any>;
                const startType = startProps.type || 
                  (segment.start.labels?.length ? segment.start.labels[0] : 'Unknown');
                  
                nodes.set(startNodeId, {
                  id: startNodeId,
                  label: startProps.name || startProps.title || `Node ${startNodeId}`,
                  type: startType,
                  color: colorMap[startType] || colorMap.default,
                  description: startProps.description || '',
                  properties: { ...startProps },
                });
              }
              
              // Process end node
              if (!nodes.has(endNodeId)) {
                const endProps = segment.end.properties as Record<string, any>;
                const endType = endProps.type || 
                  (segment.end.labels?.length ? segment.end.labels[0] : 'Unknown');
                  
                nodes.set(endNodeId, {
                  id: endNodeId,
                  label: endProps.name || endProps.title || `Node ${endNodeId}`,
                  type: endType,
                  color: colorMap[endType] || colorMap.default,
                  description: endProps.description || '',
                  properties: { ...endProps },
                });
              }
              
              // Process relationship between nodes
              const [nodeA, nodeB] = [startNodeId, endNodeId].sort();
              const linkKey = `${nodeA}-${nodeB}-${segment.relationship.type}`;
              
              if (!links.has(linkKey)) {
                links.set(linkKey, {
                  source: startNodeId,
                  target: endNodeId,
                  label: segment.relationship.type.replace(/\|/g, '-'),
                });
              }
            } catch (e) {
              console.error("Error processing path segment:", e);
            }
          });
        }
      });
    });
    
    return {
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values()),
    };
  } catch (error) {
    console.error("Error transforming Neo4j data:", error);
    return { nodes: [], links: [] };
  }
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