import { betterAuth } from "better-auth";
import { Pool } from "pg";

function withHttps(url: string | undefined): string | null {
    if (!url) {
        return null;
    }

    return url.startsWith("http") ? url : `https://${url}`;
}

function getAuthBaseURL(): string {
    return (
        withHttps(process.env.BETTER_AUTH_URL) ||
        withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
        withHttps(process.env.VERCEL_URL) ||
        "http://localhost:3000"
    );
}

const authBaseURL = getAuthBaseURL();
const trustedOrigins = Array.from(new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    "https://cashbook-jade.vercel.app",
    authBaseURL,
].filter(Boolean)));

// Create pool only on server side
let pool: Pool | null = null;

function getPool() {
    if (!pool) {
        const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized,
            },
            max: 5,
        });
    }
    return pool;
}

export const auth = betterAuth({
    database: getPool(),
    trustedOrigins,
    baseURL: authBaseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: false,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes
        },
    },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
