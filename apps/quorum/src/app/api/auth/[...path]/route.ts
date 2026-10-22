import { neonAuthConfigured, neonAuth } from "@/lib/neon-auth";

function notConfigured() {
  return new Response("Neon Auth is not configured on this deployment.", { status: 501 });
}

const handlers = neonAuthConfigured() ? neonAuth()!.handler() : null;

export const GET = handlers?.GET ?? (() => Promise.resolve(notConfigured()));
export const POST = handlers?.POST ?? GET;
export const PUT = handlers?.PUT ?? GET;
export const DELETE = handlers?.DELETE ?? GET;
export const PATCH = handlers?.PATCH ?? GET;
