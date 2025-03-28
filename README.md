# Graph Alchemy

A powerful web-based platform for visualizing and exploring domain graphs, built with Next.js. This application allows users to connect BigQuery schemas to semantic concepts through an interactive graph visualization and query interface.

![Graph Visualization Platform](https://example.com/screenshot.png)

## Features

- Interactive graph visualization with force-directed layout
- Neo4j database integration for real-time graph data
- Node expansion for progressive graph exploration
- Natural language query interface
- Filtering capabilities by node type
- Detailed node information panel
- Responsive design for various screen sizes

## Technology Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Graph Visualization**: force-graph (based on D3.js)
- **Database**: Neo4j (graph database)
- **State Management**: Zustand
- **Deployment**: Netlify (configured)

## Core Components

### Graph Visualization (`src/components/GraphVisualization.tsx`)

The heart of the application, responsible for rendering the interactive graph visualization.

**Key features:**
- Custom rendering of nodes and relationships with high visibility
- Zoom and pan controls for graph navigation
- Double-click to expand nodes
- Custom node styling with labels and colored borders
- Force simulation parameters for optimal graph layout
- Canvas-based rendering for performance

### Neo4j Connector (`src/lib/neo4jConnector.ts`)

Manages the connection to Neo4j database and transforms graph data for visualization.

**Key functions:**
- `initDriver()`: Establishes connection to Neo4j database
- `testConnection()`: Tests connectivity with fallback options
- `fetchComplianceGraph()`: Retrieves compliance taxonomy data
- `expandNode()`: Fetches additional nodes connected to a selected node
- `transformNeo4jToGraph()`: Converts Neo4j records to visualization format

### State Management (`src/lib/store.ts`)

Uses Zustand to manage application state consistently across components.

**State features:**
- Graph data storage and manipulation
- Tracking original/unfiltered data
- Query history
- Node expansion tracking
- Filter state management

### Query Processor (`src/lib/queryProcessor.ts`)

Handles natural language processing of user queries to generate graph data.

**Processing features:**
- Entity extraction from queries
- Graph filtering based on entity relationships
- Path finding between entities
- Fallback to sample data when needed

### Sample Data (`src/lib/sampleData.ts`)

Provides pre-defined sample data for demonstrating the platform without a database connection.

**Data features:**
- Compliance taxonomy examples
- Various node types (regulations, standards, organizations)
- Relationship types with semantic meaning

### Browse Panel (`src/components/BrowsePanel.tsx`)

Interface for loading and filtering compliance data from Neo4j.

**Panel features:**
- Load compliance data button
- Filter controls for node types
- Connection status indicators
- Error handling for Neo4j connection issues

### Node Info Panel (`src/components/NodeInfoPanel.tsx`)

Displays detailed information about selected nodes and provides expansion capability.

**Panel features:**
- Node metadata display (type, description)
- Property visualization with formatting
- Synonym and citation lists
- Node expansion functionality
- Connection details

### Query Panel (`src/components/QueryPanel.tsx`)

Allows users to enter natural language queries to explore the graph.

**Panel features:**
- Text input for queries
- Query history
- Loading state indicators
- Sample query suggestions

## How It Works

### Graph Data Flow

1. **Data Source**: 
   - Neo4j database storing compliance taxonomy data
   - Fallback to sample data when disconnected

2. **Data Retrieval**:
   - Neo4j driver executes Cypher queries
   - Results processed through the transformation pipeline

3. **Data Transformation**:
   - Neo4j records converted to normalized graph format (nodes and links)
   - Node properties extracted and formatted
   - Relationship data normalized

4. **Visualization**:
   - force-graph renders nodes and links using Canvas
   - Custom rendering for node labels, relationships, and arrows
   - Force simulation arranges nodes in optimal layout

### Node Expansion Process

1. User double-clicks a node in the visualization
2. Visual feedback shows the node in red during expansion
3. `expandNode()` function queries Neo4j for related nodes
4. New nodes and relationships are added to the existing graph
5. Force simulation repositions nodes for optimal layout
6. Graph is re-rendered with the expanded data

## Setup and Configuration

### Database Connections

The platform can connect to both Neo4j and a Graph RAG API. Configure both in your `.env.local` file:

#### Neo4j Connection

For the domain graph exploration features, the platform connects to Neo4j with these settings:

```
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

#### Graph RAG API (Optional)

For natural language querying capabilities, the platform can connect to a Graph RAG API:

```
API_ENDPOINT=http://localhost:8010/query
```

### Environment Variables

Create a `.env.local` file in the project root with:

```
# Neo4j Configuration
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password

# API Configuration (Optional)
API_ENDPOINT=http://localhost:8010/query
```

The `.env.local` file is git-ignored to keep credentials secure.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Troubleshooting

### Graph Visualization Issues

- **No relationships visible**: Check Neo4j connection and verify relationships exist
- **Nodes too small/large**: Adjust node size in GraphVisualization.tsx
- **Performance issues**: Reduce the number of nodes displayed at once

### Neo4j Connection Problems

- Verify Neo4j is running locally
- Check credentials in neo4jConnector.ts
- Ensure firewall allows connections on port 7687

## License

This project is licensed under the MIT License - see the LICENSE file for details.
