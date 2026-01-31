import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const app = new Hono();

// Environment variables
const config = {
  clientId: process.env.TESLA_CLIENT_ID || "",
  clientSecret: process.env.TESLA_CLIENT_SECRET || "",
  appUrl: process.env.APP_URL || "http://localhost:8080",
  fleetApi: process.env.TESLA_FLEET_API || "https://fleet-api.prd.na.vn.cloud.tesla.com",
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",
};

const TESLA_AUTH_URL = "https://auth.tesla.com/oauth2/v3/authorize";
const TESLA_TOKEN_URL = "https://auth.tesla.com/oauth2/v3/token";
const SCOPES = "openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds";

// In-memory session store (use Redis in production)
const sessions = new Map<string, { accessToken: string; refreshToken: string }>();

// Pending OAuth states (fallback for when cookies don't work through proxy)
const pendingStates = new Set<string>();

// Serve public key for Tesla partner registration
app.get("/.well-known/appspecific/com.tesla.3p.public-key.pem", (c) => {
  try {
    const publicKey = readFileSync(
      join(process.cwd(), ".well-known/appspecific/com.tesla.3p.public-key.pem"),
      "utf-8"
    );
    return c.text(publicKey);
  } catch {
    return c.text("Public key not found", 404);
  }
});

// Auth: Start OAuth flow
app.get("/auth/login", (c) => {
  const state = crypto.randomUUID();

  // Store state in memory as backup (cookies can be unreliable through proxies)
  pendingStates.add(state);
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000); // 10 min expiry

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: false, // Allow non-HTTPS for local dev
    sameSite: "Lax",
    path: "/",
  });

  const redirectUri = `${config.appUrl}/auth/callback`;
  const authUrl = new URL(TESLA_AUTH_URL);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);

  console.log("Starting OAuth flow, redirect URI:", redirectUri);
  return c.redirect(authUrl.toString());
});

// Auth: OAuth callback
app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");

  console.log("OAuth callback received");
  console.log("State from URL:", state);
  console.log("State from cookie:", storedState);
  console.log("State in pending set:", state ? pendingStates.has(state) : false);

  // Check state from cookie OR from pending states set (fallback)
  const stateValid = state && (state === storedState || pendingStates.has(state));

  if (!code || !stateValid) {
    console.error("Invalid state or missing code");
    return c.redirect("/?error=invalid_state");
  }

  // Clean up the pending state
  if (state) pendingStates.delete(state);

  const redirectUri = `${config.appUrl}/auth/callback`;

  console.log("Exchanging code for tokens...");
  const tokenResponse = await fetch(TESLA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token error:", error);
    return c.redirect("/?error=token_error");
  }

  const tokens = (await tokenResponse.json()) as { access_token: string; refresh_token: string };
  console.log("Tokens received successfully");

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  });

  setCookie(c, "session", sessionId, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  deleteCookie(c, "oauth_state");
  return c.redirect("/");
});

// Auth: Check session
app.get("/auth/session", (c) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ authenticated: false });
  }
  return c.json({ authenticated: true });
});

// Auth: Logout
app.post("/auth/logout", (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) {
    sessions.delete(sessionId);
    deleteCookie(c, "session");
  }
  return c.json({ success: true });
});

// Middleware to check auth for API routes
const requireAuth = async (c: any, next: any) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", sessions.get(sessionId));
  await next();
};

// API: Get vehicles
app.get("/api/vehicles", requireAuth, async (c) => {
  const session = c.get("session");

  console.log("Fetching vehicles from Tesla API...");
  const response = await fetch(`${config.fleetApi}/api/1/vehicles`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  const data = await response.json();
  console.log("Tesla API response status:", response.status);
  console.log("Tesla API response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    return c.json({ error: "Failed to fetch vehicles", details: data }, response.status);
  }

  return c.json(data);
});

// API: Get vehicle data
app.get("/api/vehicles/:id", requireAuth, async (c) => {
  const session = c.get("session");
  const vehicleId = c.req.param("id");

  const response = await fetch(`${config.fleetApi}/api/1/vehicles/${vehicleId}/vehicle_data`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return c.json({ error: "Failed to fetch vehicle data" }, response.status);
  }

  const data = await response.json();
  return c.json(data);
});

// API: Get vehicle location
app.get("/api/vehicles/:id/location", requireAuth, async (c) => {
  const session = c.get("session");
  const vehicleId = c.req.param("id");

  const url = new URL(`${config.fleetApi}/api/1/vehicles/${vehicleId}/vehicle_data`);
  url.searchParams.set("endpoints", "drive_state");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return c.json({ error: "Failed to fetch location" }, response.status);
  }

  const data = await response.json();
  return c.json(data);
});

// API: Get charge state
app.get("/api/vehicles/:id/charge", requireAuth, async (c) => {
  const session = c.get("session");
  const vehicleId = c.req.param("id");

  const url = new URL(`${config.fleetApi}/api/1/vehicles/${vehicleId}/vehicle_data`);
  url.searchParams.set("endpoints", "charge_state");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return c.json({ error: "Failed to fetch charge state" }, response.status);
  }

  const data = await response.json();
  return c.json(data);
});

// Serve static files in production (only if build exists)
const distPath = join(process.cwd(), "dist/client");
if (existsSync(distPath)) {
  app.use("/*", serveStatic({ root: "./dist/client" }));
}

const port = 8080;
console.log(`\n${"=".repeat(60)}`);
console.log("Tesla Strava - Fleet API Demo");
console.log("=".repeat(60));
console.log(`\nServer running at http://localhost:${port}`);
if (!existsSync(distPath)) {
  console.log(`\nDev mode: Run 'bun run dev:client' in another terminal for the frontend`);
}
console.log(`\nMake sure ngrok is running: ngrok http ${port}`);
console.log("=".repeat(60) + "\n");

serve({ fetch: app.fetch, port });
