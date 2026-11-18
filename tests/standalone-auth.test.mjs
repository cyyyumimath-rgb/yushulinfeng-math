import test from "node:test";
import assert from "node:assert/strict";
import { handleStandaloneAuth } from "../lib/standalone-auth.ts";
import { isVerifiedTeacher } from "../lib/teacher-identity.ts";

const SECRET = "test-standalone-secret-for-yumi-math";
const BASE_ENV = {
  STANDALONE_AUTH_SECRET: SECRET,
  SITE_ADMIN_EMAIL: "teacher@school.example.test",
  SITE_ADMIN_PASSWORD: "admin-pass-strong-123",
};

function extractCookiePair(setCookieHeader) {
  assert.ok(setCookieHeader, "Expected Set-Cookie header");
  return setCookieHeader.split(";")[0];
}

test("a previously issued student session remains a student after its email is made the teacher address", async () => {
  const email="new-teacher@example.test";
  const original={STANDALONE_AUTH_SECRET:SECRET};
  const signed=await handleStandaloneAuth(new Request("https://school.example.test/login",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({name:"Student",email,passcode:"student-test-passphrase"}),
  }),original);
  assert.equal(signed.response?.status,303);
  const settings={...original,SITE_ADMIN_EMAIL:email,SITE_ADMIN_PASSWORD:"teacher-test-passphrase"};
  const readIdentity=async response=>{
    const auth=await handleStandaloneAuth(new Request("https://school.example.test/api/bootstrap",{
      headers:{cookie:extractCookiePair(response.headers.get("set-cookie"))},
    }),settings);
    return {userId:auth.request.headers.get("oai-authenticated-user-id"),email:auth.request.headers.get("oai-authenticated-user-email")};
  };
  const priorStudent=await readIdentity(signed.response);
  assert.match(priorStudent.userId,/^st_/);
  assert.equal(isVerifiedTeacher(priorStudent,settings.SITE_ADMIN_EMAIL),false);
  const verified=await handleStandaloneAuth(new Request("https://school.example.test/login",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({name:"Teacher",email,passcode:settings.SITE_ADMIN_PASSWORD}),
  }),settings);
  assert.equal(verified.response?.status,303);
  const teacher=await readIdentity(verified.response);
  assert.equal(isVerifiedTeacher(teacher,settings.SITE_ADMIN_EMAIL),true);
  assert.equal(isVerifiedTeacher(teacher,"different@example.test"),false);
});

test("an unconfigured standalone instance discards inbound identity headers", async () => {
  const request = new Request("https://school.example.test/api/bootstrap", {
    headers: { "oai-authenticated-user-id": "sample" },
  });
  const result = await handleStandaloneAuth(request, {});
  assert.equal(result.request.headers.get("oai-authenticated-user-id"), null);
});

test("redirect public hosts to HTTPS and preserve local HTTP previews", async () => {
  for (const url of ["http://school.example.test/api/bootstrap?q=1", "http://other.example.test/home"]) {
    const result = await handleStandaloneAuth(new Request(url), {});
    assert.equal(result.response.status, 308);
    assert.equal(result.response.headers.get("location"), url.replace("http:", "https:"));
  }
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const result = await handleStandaloneAuth(new Request("http://" + host + ":5173/api/bootstrap"), {});
    assert.equal(result.response, undefined);
  }
});

test("spoofed oai-authenticated-user headers are stripped when standalone auth is enabled", async () => {
  const req = new Request("https://school.example.test/api/bootstrap", {
    headers: {
      "oai-authenticated-user-id": "forged-admin",
      "oai-authenticated-user-email": "teacher@school.example.test",
    },
  });
  const result = await handleStandaloneAuth(req, BASE_ENV);
  assert.equal(result.response, undefined);
  assert.equal(result.request.headers.get("oai-authenticated-user-id"), null);
  assert.equal(result.request.headers.get("oai-authenticated-user-email"), null);
});

test("student sign-in sets signed cookie, preserves return_to safely, and injects user headers", async () => {
  const getPage = await handleStandaloneAuth(
    new Request("https://school.example.test/login?return_to=%2F%3Fview%3Ddashboard"),
    BASE_ENV,
  );
  assert.equal(getPage.response?.status, 200);
  const html = await getPage.response.text();
  assert.match(html, /登录学习中心/);
  assert.match(html, /name="return_to" value="\/\?view=dashboard"/);

  const form = new URLSearchParams({
    name: "高二小林",
    email: "Student@Example.com",
    passcode: "math2026",
    return_to: "/?view=dashboard",
  });
  const signInRes = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://school.example.test",
      },
      body: form.toString(),
    }),
    BASE_ENV,
  );
  assert.equal(signInRes.response?.status, 303);
  assert.equal(signInRes.response.headers.get("location"), "/?view=dashboard");
  const setCookie = signInRes.response.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  const cookie = extractCookiePair(setCookie);

  const apiReq = new Request("https://school.example.test/api/attempts", {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json",
      "oai-authenticated-user-id": "spoofed",
    },
    body: JSON.stringify({ answers: [{ id: "fn-01", answer: 0 }] }),
  });
  const authed = await handleStandaloneAuth(apiReq, BASE_ENV);
  assert.equal(authed.response, undefined);
  const uid1 = authed.request.headers.get("oai-authenticated-user-id");
  assert.ok(uid1?.startsWith("st_"));
  assert.notEqual(uid1, "spoofed");
  assert.equal(authed.request.headers.get("oai-authenticated-user-email"), "student@example.com");
  assert.equal(authed.request.headers.get("oai-authenticated-user-full-name"), encodeURIComponent("高二小林"));
  assert.equal(authed.request.headers.get("oai-authenticated-user-full-name-encoding"), "percent-encoded-utf-8");
  assert.deepEqual(await authed.request.json(), { answers: [{ id: "fn-01", answer: 0 }] });

  // Different passcode for the same email derives a distinct student userId.
  const otherPass = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: "高二小林",
        email: "student@example.com",
        passcode: "different99",
      }).toString(),
    }),
    BASE_ENV,
  );
  const authedOther = await handleStandaloneAuth(
    new Request("https://school.example.test/api/bootstrap", {
      headers: { cookie: extractCookiePair(otherPass.response.headers.get("set-cookie")) },
    }),
    BASE_ENV,
  );
  assert.notEqual(authedOther.request.headers.get("oai-authenticated-user-id"), uid1);
});

test("tampered cookie signature is rejected and does not populate user headers", async () => {
  const signInRes = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: "学生A",
        email: "a@example.com",
        passcode: "pass1234",
      }).toString(),
    }),
    BASE_ENV,
  );
  const cookie = extractCookiePair(signInRes.response.headers.get("set-cookie"));
  const tampered = cookie.slice(0, -1) + (cookie.endsWith("a") ? "b" : "a");

  const result = await handleStandaloneAuth(
    new Request("https://school.example.test/api/bootstrap", {
      headers: { cookie: tampered },
    }),
    BASE_ENV,
  );
  assert.equal(result.response, undefined);
  assert.equal(result.request.headers.get("oai-authenticated-user-id"), null);
});

test("admin email requires matching SITE_ADMIN_PASSWORD", async () => {
  const wrongRes = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: "玉米老师",
        email: "TEACHER@school.example.test",
        passcode: "wrong-password",
      }).toString(),
    }),
    BASE_ENV,
  );
  assert.equal(wrongRes.response?.status, 401);
  assert.equal(wrongRes.response.headers.get("set-cookie"), null);

  const missingAdminPasswordRes = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: "玉米老师",
        email: "teacher@school.example.test",
        passcode: "admin-pass-strong-123",
      }).toString(),
    }),
    { STANDALONE_AUTH_SECRET: SECRET, SITE_ADMIN_EMAIL: "teacher@school.example.test" },
  );
  assert.equal(missingAdminPasswordRes.response?.status, 401);

  const okRes = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: "玉米老师",
        email: "teacher@school.example.test",
        passcode: "admin-pass-strong-123",
      }).toString(),
    }),
    BASE_ENV,
  );
  assert.equal(okRes.response?.status, 303);
  const authed = await handleStandaloneAuth(
    new Request("https://school.example.test/api/admin", {
      headers: { cookie: extractCookiePair(okRes.response.headers.get("set-cookie")) },
    }),
    BASE_ENV,
  );
  assert.ok(authed.request.headers.get("oai-authenticated-user-id")?.startsWith("sa_"));
  assert.equal(authed.request.headers.get("oai-authenticated-user-email"), "teacher@school.example.test");
});

test("open redirect targets are neutralized and sign-out clears cookie", async () => {
  const evilRedirect = await handleStandaloneAuth(
    new Request("https://school.example.test/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: "学生B",
        email: "b@example.com",
        passcode: "pass1234",
        return_to: "https://evil.invalid/phish",
      }).toString(),
    }),
    BASE_ENV,
  );
  assert.equal(evilRedirect.response?.headers.get("location"), "/");

  const signOut = await handleStandaloneAuth(
    new Request("https://school.example.test/logout?return_to=//evil.invalid"),
    BASE_ENV,
  );
  assert.equal(signOut.response?.status, 302);
  assert.equal(signOut.response.headers.get("location"), "/");
  assert.match(signOut.response.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("native login is local and legacy bookmarks redirect to it safely", async () => {
  const canonical = await handleStandaloneAuth(
    new Request("https://school.example.test/login?return_to=%2F%3Fview%3Ddashboard"),
    BASE_ENV,
  );
  assert.equal(canonical.response.status, 200);
  const html = await canonical.response.text();
  assert.match(html, /action="\/login"/);
  assert.doesNotMatch(html, /ChatGPT|signin-with-chatgpt|openai\.com/);

  const legacy = await handleStandaloneAuth(
    new Request("https://school.example.test/signin-with-chatgpt?return_to=%2F%3Fview%3Ddashboard"),
    BASE_ENV,
  );
  assert.equal(legacy.response.status, 302);
  assert.equal(legacy.response.headers.get("location"), "/login?return_to=%2F%3Fview%3Ddashboard");

  for (const returnTo of ["/login", "/logout?return_to=/", "/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"]) {
    const response = await handleStandaloneAuth(
      new Request(`https://school.example.test/signin-with-chatgpt?${new URLSearchParams({ return_to: returnTo })}`),
      BASE_ENV,
    );
    assert.equal(response.response.headers.get("location"), "/login?return_to=%2F");
  }
});

test("legacy forms and cookies keep the same learning identity at the native paths", async () => {
  const form = new URLSearchParams({ name: "兼容测试学生", email: "existing@example.com", passcode: "math2026", return_to: "/?view=dashboard" });
  const userIds = [];
  for (const path of ["/signin-with-chatgpt", "/login"]) {
    const signIn = await handleStandaloneAuth(new Request(`https://school.example.test${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://school.example.test" },
      body: form.toString(),
    }), BASE_ENV);
    assert.equal(signIn.response.status, 303);
    const cookie = extractCookiePair(signIn.response.headers.get("set-cookie"));
    assert.match(cookie, /^__yumi_session=/);
    const authenticated = await handleStandaloneAuth(new Request("https://school.example.test/api/bootstrap", { headers: { cookie } }), BASE_ENV);
    userIds.push(authenticated.request.headers.get("oai-authenticated-user-id"));
  }
  assert.ok(userIds[0]);
  assert.equal(userIds[0], userIds[1]);

  const legacySignOut = await handleStandaloneAuth(new Request("https://school.example.test/signout-with-chatgpt?return_to=/login"), BASE_ENV);
  assert.equal(legacySignOut.response.status, 302);
  assert.equal(legacySignOut.response.headers.get("location"), "/");
  assert.match(legacySignOut.response.headers.get("set-cookie"), /Max-Age=0/);
});
