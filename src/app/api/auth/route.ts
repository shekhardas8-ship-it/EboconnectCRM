import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'kuhelibusinessstudio@gmail.com';
const ADMIN_PASSWORD = 'B12welcome@';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (
      email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      password === ADMIN_PASSWORD
    ) {
      // In production, sign JWT or generate secure session token
      const sessionToken = `crm_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      return NextResponse.json({
        success: true,
        user: { email: ADMIN_EMAIL, name: 'Admin' },
        token: sessionToken,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid admin credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Authentication error' },
      { status: 500 }
    );
  }
}
