import { NextRequest, NextResponse } from 'next/server';
import { getSites, createSite } from '@/lib/db';

export async function GET() {
  try {
    const sites = getSites();
    return NextResponse.json({ success: true, sites });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.domain) {
      return NextResponse.json(
        { success: false, error: 'Site name and domain are required' },
        { status: 400 }
      );
    }

    const site = createSite(body.name, body.domain, body.colorTag || 'teal');
    return NextResponse.json({ success: true, site }, { status: 201 });
  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json({ success: false, error: 'Failed to create site' }, { status: 500 });
  }
}
