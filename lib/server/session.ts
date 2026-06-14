import { headers } from 'next/headers';
import { auth } from '../auth';

/**
 * Resolve the authenticated user id from the Better Auth session, or null.
 * This is the single trusted source of identity for all data API routes —
 * the client is never allowed to supply its own user id.
 */
export async function getSessionUserId(): Promise<string | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    return session?.user?.id ?? null;
}
