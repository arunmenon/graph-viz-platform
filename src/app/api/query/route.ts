import { NextResponse } from 'next/server';

// Very simple, direct proxy for the Graph RAG API
export async function POST(request: Request) {
  try {
    // Extract the query from the request
    const body = await request.json();
    console.log('Received query:', body.query);
    
    // Create a simple request with the query
    const apiRequest = { question: body.query.trim() };
    
    // Use the known working endpoint with environment variables if available
    const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:8010/query';
    
    // Get API credentials from environment if available
    const apiAuth = process.env.API_PASSWORD ? {
      username: process.env.API_USERNAME || '',
      password: process.env.API_PASSWORD || ''
    } : null;
    
    console.log(`Sending request to ${API_ENDPOINT}${apiAuth ? ' with authentication' : ''}:`, apiRequest);
    
    try {
      // Make the API request
      // Build headers with optional authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authentication if provided
      if (apiAuth) {
        // Basic auth header (Base64 encoded username:password)
        const credentials = Buffer.from(`${apiAuth.username}:${apiAuth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(apiRequest),
      });
      
      console.log('API response status:', response.status);
      
      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      console.log('API response fields:', Object.keys(data));
      
      // Return the API response to the frontend
      return NextResponse.json(data);
      
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('API proxy error:', error);
    
    // Use a simple error response
    return NextResponse.json(
      { 
        error: `Failed to process query: ${error.message}`,
        answer: "I'm unable to process this query right now. Please check the API server logs for more information.",
        // Add these fields so our UI can still render something
        reasoning: "There was an error connecting to the backend API service.",
        evidence: [],
        confidence: 0
      },
      { status: 500 }
    );
  }
}