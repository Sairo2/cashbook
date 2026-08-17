import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret) {
        return NextResponse.json(
            { error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron authentication is not configured.' } },
            { status: 503 }
        );
    }

    if (authorization !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'Valid cron authentication is required.' } },
            { status: 401 }
        );
    }

    // A real, minimal database read keeps the Supabase project active without
    // creating artificial records or changing user data.
    const { error } = await supabaseAdmin
        .from('ledgers')
        .select('id')
        .limit(1);

    if (error) {
        console.error('Supabase keep-alive query failed:', error);
        return NextResponse.json(
            { error: { code: 'KEEP_ALIVE_FAILED', message: 'Database keep-alive failed.' } },
            { status: 503 }
        );
    }

    return NextResponse.json({
        data: {
            ok: true,
            checkedAt: new Date().toISOString(),
        },
    });
}
