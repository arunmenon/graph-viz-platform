export interface GraphNode {
  id: string;
  label: string;
  color?: string;
  type?: string;
  description?: string;
  properties?: Record<string, any>;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphVisualizationProps {
  onNodeClick?: (node: GraphNode) => void;
}

export interface ForceGraphProps {
  graphData: GraphData;
  width: number;
  height: number;
  onNodeClick?: (node: GraphNode, event?: MouseEvent) => void;
  onRef?: (ref: any) => void;
}
