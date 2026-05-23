import { NextRequest, NextResponse } from 'next/server';
import { executeHybridSearch } from '@/lib/search/search';
import { getCostReport } from '@/lib/ai/openai';

export async function POST(req: NextRequest) {
  const reqStart = Date.now();
  console.log('[API Search] Incoming search request received.');

  try {
    const body = await req.json();
    const { query } = body;

    // Validate request parameter
    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.warn('[API Search] Rejected: Empty or invalid query parameter.');
      return NextResponse.json(
        { error: 'Query parameter "query" must be a non-empty string.' },
        { status: 400 }
      );
    }

    const sanitizedQuery = query.trim();
    console.log(`[API Search] Executing hybrid search for: "${sanitizedQuery}"`);

    // Execute the hybrid search orchestrator
    const searchResponse = await executeHybridSearch(sanitizedQuery, { limit: 12 });

    const reqElapsed = Date.now() - reqStart;
    const costReport = getCostReport();

    // Log complete API execution summary (protecting credentials)
    console.log(
      `[API Search] Success: "${sanitizedQuery}" | Overall req duration: ${reqElapsed}ms | OpenAI Total Est. Cost: $${costReport.costs.total}`
    );

    // Return search data, timing telemetry, and API cost telemetry
    return NextResponse.json({
      ...searchResponse,
      apiTelemetry: {
        apiDurationMs: reqElapsed,
        estimatedCostUsd: costReport.costs.total,
        formattedReport: costReport.formatted
      }
    });

  } catch (error: any) {
    console.error('[API Search Error] Encountered exception in POST search route:', error);
    
    // Graceful error recovery: Return user-friendly response rather than throwing internal Server 500 crashes
    return NextResponse.json(
      { 
        error: 'An internal error occurred while executing your search. Please verify your query format and try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}
