const SESSION_COOKIE = "__yumi_session";
const SIGN_IN_PATH = "/login";
const SIGN_OUT_PATH = "/logout";
const LEGACY_SIGN_IN_PATH = "/signin-with-chatgpt";
const LEGACY_SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const AUTH_HEADER_PREFIX = "oai-authenticated-user-";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type StandaloneAuthResult = {
  response?: Response;
  request: Request;
};

type SessionPayload = {
  uid: string;
  email: string;
  name: string;
  exp: number;
};

function readNonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (
      url.pathname === SIGN_IN_PATH ||
      url.pathname === SIGN_OUT_PATH ||
      url.pathname === LEGACY_SIGN_IN_PATH ||
      url.pathname === LEGACY_SIGN_OUT_PATH ||
      url.pathname === CALLBACK_PATH
    ) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(input: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;
  const padded = input.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (input.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signHmac(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

function constantTimeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function constantTimeVerifySecret(secret: string, candidate: string, expected: string): Promise<boolean> {
  const [candidateDigest, expectedDigest] = await Promise.all([
    signHmac(secret, `cmp:${candidate}`),
    signHmac(secret, `cmp:${expected}`),
  ]);
  return constantTimeEqualStrings(candidateDigest, expectedDigest);
}

function parseCookies(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const rawValue = part.slice(eq + 1).trim();
    if (!name || cookies.has(name)) continue;
    cookies.set(name, rawValue);
  }
  return cookies;
}

function buildCookieString(value: string, maxAgeSeconds: number, secure: boolean): string {
  const attributes = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function sanitizeHeaders(source: Headers): { headers: Headers; stripped: boolean } {
  const headers = new Headers();
  let stripped = false;
  source.forEach((value, key) => {
    if (key.toLowerCase().startsWith(AUTH_HEADER_PREFIX)) {
      stripped = true;
      return;
    }
    headers.append(key, value);
  });
  return { headers, stripped };
}

async function issueSessionToken(secret: string, payload: SessionPayload): Promise<string> {
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signHmac(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

async function verifySessionToken(secret: string, token: string): Promise<SessionPayload | null> {
  const dotIndex = token.indexOf(".");
  if (dotIndex <= 0 || token.indexOf(".", dotIndex + 1) !== -1) return null;
  const encodedPayload = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);
  const expectedSig = await signHmac(secret, encodedPayload);
  if (!constantTimeEqualStrings(providedSig, expectedSig)) return null;

  const payloadBytes = fromBase64Url(encodedPayload);
  if (!payloadBytes) return null;

  try {
    const parsed = JSON.parse(decoder.decode(payloadBytes)) as Partial<SessionPayload>;
    if (
      typeof parsed.uid !== "string" ||
      !parsed.uid ||
      typeof parsed.email !== "string" ||
      !parsed.email ||
      typeof parsed.name !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }
    return {
      uid: parsed.uid,
      email: parsed.email,
      name: parsed.name,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

function renderSignInHtml(options: {
  returnTo: string;
  error?: string;
  name?: string;
  email?: string;
}): string {
  const safeReturnTo = escapeHtml(options.returnTo);
  const safeName = escapeHtml(options.name ?? "");
  const safeEmail = escapeHtml(options.email ?? "");
  const errorBlock = options.error
    ? `<div class="notice" role="alert">${escapeHtml(options.error)}</div>`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>登录学习 · 玉米老师</title>
  <style>
    :root { --ink:#111827; --muted:#667085; --line:#e4e9f1; --blue:#245fe8; --blue-dark:#194fc8; --bg:#f7f9fc; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px; background:var(--bg); color:var(--ink); font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
    .card { width:100%; max-width:440px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:34px 30px; box-shadow:0 14px 40px #1722380c; }
    .badge { display:inline-flex; align-items:center; gap:8px; font-size:11px; font-weight:600; color:#3f5b99; background:#f3f6ff; border:1px solid #dce5fc; border-radius:20px; padding:4px 12px; margin-bottom:18px; }
    .badge i { width:6px; height:6px; border-radius:50%; background:#3569ee; display:inline-block; }
    h1 { margin:0 0 8px; font-size:24px; line-height:1.35; letter-spacing:-.03em; }
    .lead { margin:0 0 22px; font-size:13px; color:var(--muted); }
    .notice { margin-bottom:18px; padding:12px 14px; border-radius:7px; background:#fff0f0; color:#9e4545; font-size:13px; border:1px solid #f7d6d6; }
    label { display:block; font-size:12px; font-weight:600; color:#3b547c; margin-bottom:15px; }
    input { width:100%; margin-top:6px; padding:10px 12px; border:1px solid #d7dfed; border-radius:6px; font:inherit; font-size:14px; color:var(--ink); background:#fff; }
    input:focus { outline:2px solid #557ff0; outline-offset:1px; border-color:var(--blue); }
    .hint { margin:6px 0 22px; font-size:12px; color:var(--muted); line-height:1.6; }
    .btn { width:100%; border:0; border-radius:7px; padding:12px 18px; font:inherit; font-weight:600; font-size:14px; color:#fff; background:var(--blue); cursor:pointer; }
    .btn:hover { background:var(--blue-dark); }
    .back { display:inline-block; margin-top:16px; font-size:13px; color:var(--muted); text-decoration:none; }
    .back:hover { color:var(--blue); }
  </style>
</head>
<body>
  <main class="card">
    <span class="badge"><i></i>玉米老师 · 高中数学</span>
    <h1>登录学习中心</h1>
    <p class="lead">登录后可保存练习成绩、错题复盘记录与课程预约。</p>
    ${errorBlock}
    <form method="post" action="${SIGN_IN_PATH}">
      <input type="hidden" name="return_to" value="${safeReturnTo}" />
      <label>学习称呼
        <input type="text" name="name" required maxlength="40" placeholder="例如：高二小明" value="${safeName}" />
      </label>
      <label>邮箱
        <input type="email" name="email" required maxlength="120" autocomplete="email" placeholder="student@example.com" value="${safeEmail}" />
      </label>
      <label>学习口令（至少 6 位）
        <input type="password" name="passcode" required minlength="6" maxlength="128" autocomplete="current-password" placeholder="用于区分个人记录与管理员核验" />
      </label>
      <p class="hint">使用相同邮箱与学习口令登录，即可跨设备找回自己的练习记录与课程预约；管理员账号需填写服务端预设口令。</p>
      <button class="btn" type="submit">进入学习</button>
    </form>
    <a class="back" href="${safeReturnTo}">暂不登录，返回上一页</a>
  </main>
</body>
</html>`;
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function redirectResponse(location: string, status: 302 | 303, setCookie?: string): Response {
  const headers = new Headers({
    location,
    "cache-control": "private, no-store",
  });
  if (setCookie) headers.set("set-cookie", setCookie);
  return new Response(null, { status, headers });
}

function isSameOriginMutation(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  return true;
}

export async function handleStandaloneAuth(
  request: Request,
  env: Record<string, unknown>,
): Promise<StandaloneAuthResult> {
  const url = new URL(request.url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol === "http:" && !loopback) {
    url.protocol = "https:";
    return {
      request,
      response: new Response(null, {
        status: 308,
        headers: { location: url.href, "cache-control": "no-store" },
      }),
    };
  }
  const isSecure = url.protocol === "https:";
  const secret = readNonEmpty(env.STANDALONE_AUTH_SECRET);

  if (url.pathname === CALLBACK_PATH) {
    return {
      request,
      response: new Response("Not implemented in standalone mode.", {
        status: 501,
        headers: { "cache-control": "private, no-store" },
      }),
    };
  }

  if (url.pathname === LEGACY_SIGN_IN_PATH && request.method === "GET") {
    const returnTo = safeReturnPath(url.searchParams.get("return_to"));
    return {
      request,
      response: redirectResponse(`${SIGN_IN_PATH}?${new URLSearchParams({ return_to: returnTo })}`, 302),
    };
  }

  if (url.pathname === SIGN_OUT_PATH || url.pathname === LEGACY_SIGN_OUT_PATH) {
    if (request.method !== "GET" && request.method !== "POST") {
      return {
        request,
        response: new Response("Method Not Allowed", {
          status: 405,
          headers: { allow: "GET, POST", "cache-control": "private, no-store" },
        }),
      };
    }
    if (!isSameOriginMutation(request, url)) {
      return { request, response: new Response("Forbidden", { status: 403 }) };
    }
    const returnTo = safeReturnPath(url.searchParams.get("return_to"));
    return {
      request,
      response: redirectResponse(
        returnTo,
        request.method === "POST" ? 303 : 302,
        buildCookieString("", 0, isSecure),
      ),
    };
  }

  if (url.pathname === SIGN_IN_PATH || url.pathname === LEGACY_SIGN_IN_PATH) {
    if (request.method === "GET") {
      const returnTo = safeReturnPath(url.searchParams.get("return_to"));
      return {
        request,
        response: htmlResponse(renderSignInHtml({ returnTo })),
      };
    }

    if (request.method !== "POST") {
      return {
        request,
        response: new Response("Method Not Allowed", {
          status: 405,
          headers: { allow: "GET, POST", "cache-control": "private, no-store" },
        }),
      };
    }

    if (!isSameOriginMutation(request, url)) {
      return { request, response: new Response("Forbidden", { status: 403 }) };
    }

    const rawBody = await request.text();
    const form = new URLSearchParams(rawBody);
    const returnTo = safeReturnPath(form.get("return_to") ?? url.searchParams.get("return_to"));
    const name = (form.get("name") ?? "").trim();
    const email = (form.get("email") ?? "").trim().toLowerCase();
    const passcode = form.get("passcode") ?? "";

    if (!secret) {
      return {
        request,
        response: htmlResponse(
          renderSignInHtml({
            returnTo,
            name,
            email,
            error: "站点尚未配置会话签名密钥（STANDALONE_AUTH_SECRET），暂时无法登录。",
          }),
          503,
        ),
      };
    }

    if (!name || name.length > 40) {
      return {
        request,
        response: htmlResponse(
          renderSignInHtml({ returnTo, name, email, error: "请填写 1 至 40 字以内的学习称呼。" }),
          400,
        ),
      };
    }

    if (!email || email.length > 120 || !EMAIL_PATTERN.test(email)) {
      return {
        request,
        response: htmlResponse(
          renderSignInHtml({ returnTo, name, email, error: "请填写有效的邮箱地址。" }),
          400,
        ),
      };
    }

    if (passcode.length < 6 || passcode.length > 128) {
      return {
        request,
        response: htmlResponse(
          renderSignInHtml({ returnTo, name, email, error: "学习口令需至少 6 位字符。" }),
          400,
        ),
      };
    }

    const adminEmail = readNonEmpty(env.SITE_ADMIN_EMAIL)?.toLowerCase() ?? null;
    let userId: string;
    if (adminEmail && email === adminEmail) {
      const adminPassword = readNonEmpty(env.SITE_ADMIN_PASSWORD);
      const ok = adminPassword ? await constantTimeVerifySecret(secret, passcode, adminPassword) : false;
      if (!ok) {
        return {
          request,
          response: htmlResponse(
            renderSignInHtml({
              returnTo,
              name,
              email,
              error: "管理员口令不正确，或服务端尚未设置管理员口令（SITE_ADMIN_PASSWORD）。",
            }),
            401,
          ),
        };
      }
      userId = `sa_${await signHmac(secret, `admin:${email}`)}`;
    } else {
      userId = `st_${await signHmac(secret, `student:${email}:${passcode}`)}`;
    }

    const token = await issueSessionToken(secret, {
      uid: userId,
      email,
      name,
      exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    });

    return {
      request,
      response: redirectResponse(returnTo, 303, buildCookieString(token, SESSION_TTL_SECONDS, isSecure)),
    };
  }

  const { headers, stripped } = sanitizeHeaders(request.headers);
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies.get(SESSION_COOKIE);
  const session = secret && token ? await verifySessionToken(secret, token) : null;

  if (session) {
    headers.set("oai-authenticated-user-id", session.uid);
    headers.set("oai-authenticated-user-email", session.email);
    headers.set("oai-authenticated-user-full-name", encodeURIComponent(session.name));
    headers.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
    return { request: new Request(request, { headers }) };
  }

  if (stripped) {
    return { request: new Request(request, { headers }) };
  }
  return { request };
}
