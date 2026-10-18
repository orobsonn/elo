export const DAY = 86400000;
export const id = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
export const now = () => Date.now();
export class SafeError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function addressFingerprint(address: string, key: string) {
  const secret = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      secret,
      new TextEncoder().encode("elo:forgotten-address:" + address),
    ),
  );
  return Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
}
export async function equal(a: string, b: string) {
  const aa = new TextEncoder().encode(await hash(a)),
    bb = new TextEncoder().encode(await hash(b));
  return crypto.subtle.timingSafeEqual(aa, bb);
}
export async function seal(value: unknown, key: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(key.match(/../g) ?? [], (x) => parseInt(x, 16)),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    k,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(data)));
}
export async function unseal<T>(value: string, key: string): Promise<T> {
  const data = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(key.match(/../g) ?? [], (x) => parseInt(x, 16)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: data.slice(0, 12) },
        k,
        data.slice(12),
      ),
    ),
  );
}
export async function body(request: Request | Response, limit = 65536) {
  const reader = request.body?.getReader();
  if (!reader) throw new SafeError("corpo_ausente");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    length += r.value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new SafeError("limite_de_entrada", 413);
    }
    chunks.push(r.value);
  }
  const all = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(all);
}
export async function jsonBody(
  request: Request,
  limit = 65536,
): Promise<unknown> {
  try {
    return JSON.parse(await body(request, limit));
  } catch (e) {
    if (e instanceof SafeError) throw e;
    throw new SafeError("json_invalido");
  }
}
export const privatePattern =
  /(?:\d{6,}|@|https?:|\b(?:cpf|email|e-mail|jid|lid|telefone|sobrenome)\b)/iu;
export function safeAlias(value: string) {
  if (
    privatePattern.test(value) ||
    /(?:\d[\s.()+-]*){6,}/.test(value) ||
    value.trim().split(/\s+/).length > 4
  )
    throw new SafeError("use_alias_curto_sem_identificadores");
  return value.trim();
}
export function sql(
  db: D1Database,
  query: string,
  ...params: (string | number | null)[]
) {
  return db.prepare(query).bind(...params);
}
export async function diagnostic(db: D1Database, code: string) {
  await sql(db, "UPDATE settings SET last_error=? WHERE id=1", code).run();
}
