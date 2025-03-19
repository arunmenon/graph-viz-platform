"use client";

import { GraphNode, GraphLink } from "./types";

// Global variable to avoid repetitive logging
let linkDebugLogged = false;

// Rendering function for link labels
export const renderLinkLabels = (link: any, ctx: CanvasRenderingContext2D) => {
  // Log only once using the global variable
  if (!linkDebugLogged) {
    console.log("First link structure in canvas object:", {
      link,
      sourceType: typeof link.source,
      targetType: typeof link.target,
      hasSourcePos: typeof link.source === 'object' && 'x' in link.source,
      hasTargetPos: typeof link.target === 'object' && 'x' in link.target
    });
    linkDebugLogged = true;
  }
  
  // Draw link label at the middle of the link
  if (link.label) {
    const start = link.source;
    const end = link.target;
    if (!start || !end) {
      console.warn("Missing link endpoint:", { link, start, end });
      return;
    }
    
    const textPos = Object.assign({}, ...['x', 'y'].map(c => ({
      [c]: start[c] + (end[c] - start[c]) / 2
    })));
    
    const label = link.label;
    
    // Background with border
    ctx.font = 'bold 10px Sans-Serif'; // Larger, bold font
    const textWidth = ctx.measureText(label).width;
    
    // Draw filled rectangle with border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    const labelBgX = textPos.x - textWidth/2 - 5;
    const labelBgY = textPos.y - 8;
    const labelBgWidth = textWidth + 10;
    const labelBgHeight = 16;
    
    // Rounded rectangle background
    const radius = 4;
    ctx.beginPath();
    ctx.moveTo(labelBgX + radius, labelBgY);
    ctx.lineTo(labelBgX + labelBgWidth - radius, labelBgY);
    ctx.quadraticCurveTo(labelBgX + labelBgWidth, labelBgY, labelBgX + labelBgWidth, labelBgY + radius);
    ctx.lineTo(labelBgX + labelBgWidth, labelBgY + labelBgHeight - radius);
    ctx.quadraticCurveTo(labelBgX + labelBgWidth, labelBgY + labelBgHeight, labelBgX + labelBgWidth - radius, labelBgY + labelBgHeight);
    ctx.lineTo(labelBgX + radius, labelBgY + labelBgHeight);
    ctx.quadraticCurveTo(labelBgX, labelBgY + labelBgHeight, labelBgX, labelBgY + labelBgHeight - radius);
    ctx.lineTo(labelBgX, labelBgY + radius);
    ctx.quadraticCurveTo(labelBgX, labelBgY, labelBgX + radius, labelBgY);
    ctx.fill();
    ctx.stroke();
    
    // Bold text in dark color
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(label, textPos.x, textPos.y);
  }
};

// Rendering function for nodes
export const renderNodes = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
  const label = node.label || "";
  const fontSize = 16/globalScale; // Larger font size
  ctx.font = `bold ${fontSize}px Sans-Serif`; // Bold font
  const textWidth = ctx.measureText(label).width;
  const bgDimensions = [textWidth, fontSize].map(n => n + 10/globalScale); // More padding

  // Node size varies by node type - root nodes are larger
  // Calculate size based on type - root nodes are larger
  const isRootNode = node.type === 'Root Category' || 
                    node.type === 'Category' || 
                    node.label?.toLowerCase().includes('root');
  const nodeSize = isRootNode ? 35 : 30; // Larger size for root nodes
  ctx.beginPath();
  ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
  ctx.fillStyle = node.color || "#1e88e5";
  ctx.fill();
  
  // Add special border styling based on node type
  if (isRootNode) {
    // Silver-white thick border for root nodes - makes them stand out
    ctx.strokeStyle = "#FFFFFF"; // Pure white
    ctx.lineWidth = 5;
    ctx.stroke();
    
    // Second border with a black outline for high contrast
    ctx.strokeStyle = "#000000"; // Black
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (node.type === 'Subcategory' || node.type === 'Sub Category') {
    // Dashed border for subcategories
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Apply a distinct pattern
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]); // Dashed effect
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
  } else {
    // Standard border for regular nodes
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Add second border for emphasis
    ctx.strokeStyle = node.color || "#1e88e5";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Always show labels for better visibility
  // Get vertical offset based on node size
  const vertOffset = nodeSize + 4;
  
  // Add background rectangle with improved visibility
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)"; // Nearly opaque background
  ctx.strokeStyle = "#000000"; // Black border for maximum contrast
  ctx.lineWidth = 2; // Thicker border
  
  // Position the background below the node
  const bgX = (node.x || 0) - textWidth/2 - 8/globalScale;
  const bgY = (node.y || 0) + vertOffset/globalScale;
  const bgWidth = bgDimensions[0];
  const bgHeight = bgDimensions[1];
  
  // Draw rounded rectangle for background
  const radius = 6/globalScale; // Larger radius for more rounded corners
  ctx.beginPath();
  ctx.moveTo(bgX + radius, bgY);
  ctx.lineTo(bgX + bgWidth - radius, bgY);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
  ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
  ctx.lineTo(bgX + radius, bgY + bgHeight);
  ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
  ctx.lineTo(bgX, bgY + radius);
  ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Add a connecting line from node to label
  ctx.beginPath();
  ctx.moveTo(node.x || 0, (node.y || 0) + nodeSize); // Start at bottom of node
  ctx.lineTo(node.x || 0, bgY); // Connect to top of label background
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text with improved positioning - use dark, bold text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000000"; // Black text for maximum contrast
  ctx.font = `bold ${fontSize}px Sans-Serif`; // Ensure font is bold
  // Draw text with slight shadow for better contrast
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 2;
  ctx.fillText(
    label, 
    node.x || 0, 
    (node.y || 0) + vertOffset/globalScale + fontSize/2
  );
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
};

export { linkDebugLogged };
