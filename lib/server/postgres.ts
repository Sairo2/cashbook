import { Pool } from 'pg';

if (typeof window !== 'undefined') {
    throw new Error('lib/server/postgres.ts must not be imported from the browser');
}

export const postgres = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    },
    max: 5,
});
