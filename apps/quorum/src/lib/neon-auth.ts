import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const neonAuthConfigured = () => Boolean(process.env.NEON_AUTH_BASE_URL && (process.env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) >= 32);

let singleton: ReturnType<typeof createNeonAuth> | undefined;

export function neonAuth() {
  if (!neonAuthConfigured()) return null;
  singleton ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return singleton;
}

export async function organizerUserId() {
  const client = neonAuth();
  if (!client) return undefined;
  const { data: session } = await client.getSession();
  return session?.user?.id;
}
