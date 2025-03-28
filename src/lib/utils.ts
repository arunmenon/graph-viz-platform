import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to safely access environment variables on the client
export const clientEnv = {
  // Neo4j connection details
  neo4j: {
    uri: process.env.NEXT_PUBLIC_NEO4J_URI || 'neo4j://localhost:7687',
    user: process.env.NEXT_PUBLIC_NEO4J_USER || 'neo4j',
    password: process.env.NEXT_PUBLIC_NEO4J_PASSWORD || 'Rathum12!',
  },
  
  // API connection details
  api: {
    endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8010/query',
  }
};
