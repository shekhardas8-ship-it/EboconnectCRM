import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey, createLead, getLeads } from '@/lib/db';

// Helper for CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-site-api-key',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Ingest a new lead from any connected website
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Site API Key
    const apiKey =
      req.headers.get('x-site-api-key') ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      '';

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const keyToTest = apiKey || body.apiKey;
    if (!keyToTest) {
      return NextResponse.json(
        { success: false, error: 'Missing x-site-api-key header or apiKey in body' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const site = getSiteByApiKey(keyToTest);
    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid site API key' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // 2. Extract Lead Data
    const customerName = body.name || body.customerName || body.founderName || body.investorName || 'Anonymous';
    const email = body.email || body.founderEmail || '';
    const phone = body.phone || body.mobileNumber || body.founderPhone || '';
    const type = body.type || body.submissionType || 'Form Submission';
    const sourceUrl = body.sourceUrl || body.sourcePage || req.headers.get('referer') || '';

    // Separate payload details
    const { apiKey: _, name: __, customerName: ___, email: ____, phone: _____, ...restPayload } = body;

    // 3. Save Lead into Central CRM DB
    const lead = createLead({
      siteId: site.id,
      customerName,
      email,
      phone,
      type,
      sourceUrl,
      payload: body.details || body.payload || restPayload,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Lead ingested successfully into Central CRM',
        leadId: lead.id,
        siteName: site.name,
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('API Ingestion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Retrieve leads for the dashboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const leads = getLeads({ siteId, status, search });
    return NextResponse.json({ success: true, leads }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}
