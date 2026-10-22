/** Enforce the byte limit while streaming, before allocating the whole request. */
export async function readBoundedJson(request: Request, limit = 20_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("Send this request as application/json.");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error("Request is too large or has an invalid length.");
  if (!request.body) throw new Error("A JSON request body is required.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error("Request is too large."); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try { return JSON.parse(text) as unknown; }
    catch { throw new Error("The request body must contain valid JSON."); }
  } finally { reader.releaseLock(); }
}
