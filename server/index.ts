import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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

const app = new Elysia()
  // Serve public key for Tesla partner registration
  .get("/.well-known/appspecific/com.tesla.3p.public-key.pem", () => {
    try {
      const publicKey = readFileSync(
        join(process.cwd(), ".well-known/appspecific/com.tesla.3p.public-key.pem"),
        "utf-8"
      );
      return new Response(publicKey, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch {
      return new Response("Public key not found", { status: 404 });
    }
  })

  // Auth: Start OAuth flow
  .get("/auth/login", ({ cookie, redirect }) => {
    const state = crypto.randomUUID();

    // Store state in memory as backup (cookies can be unreliable through proxies)
    pendingStates.add(state);
    setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000); // 10 min expiry

    cookie.oauth_state.set({
      value: state,
      httpOnly: true,
      secure: false, // Allow non-HTTPS for local dev
      sameSite: "lax",
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
    return redirect(authUrl.toString());
  })

  // Auth: OAuth callback
  .get("/auth/callback", async ({ query, cookie, redirect }) => {
    const code = query.code;
    const state = query.state;
    const storedState = cookie.oauth_state.value;

    console.log("OAuth callback received");
    console.log("State from URL:", state);
    console.log("State from cookie:", storedState);
    console.log("State in pending set:", state ? pendingStates.has(state) : false);

    // Check state from cookie OR from pending states set (fallback)
    const stateValid = state && (state === storedState || pendingStates.has(state));

    if (!code || !stateValid) {
      console.error("Invalid state or missing code");
      return redirect("/?error=invalid_state");
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
      return redirect("/?error=token_error");
    }

    const tokens = (await tokenResponse.json()) as { access_token: string; refresh_token: string };
    console.log("Tokens received successfully");

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    cookie.session.set({
      value: sessionId,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    cookie.oauth_state.remove();
    return redirect("/");
  })

  // Auth: Check session
  .get("/auth/session", ({ cookie }) => {
    const sessionId = cookie.session.value;
    if (!sessionId || !sessions.has(sessionId)) {
      return { authenticated: false };
    }
    return { authenticated: true };
  })

  // Auth: Logout
  .post("/auth/logout", ({ cookie }) => {
    const sessionId = cookie.session.value;
    if (sessionId) {
      sessions.delete(sessionId);
      cookie.session.remove();
    }
    return { success: true };
  })

  // API routes with auth guard
  .group("/api", (app) =>
    app
      // Derive session for all API routes
      .derive(({ cookie, set }) => {
        const sessionId = cookie.session.value;
        if (!sessionId || !sessions.has(sessionId)) {
          set.status = 401;
          return { session: null, authError: true };
        }
        return { session: sessions.get(sessionId)!, authError: false };
      })
      // Guard to check auth before all API routes
      .onBeforeHandle(({ authError }) => {
        if (authError) {
          return { error: "Unauthorized" };
        }
      })

      // API: Get vehicles
      .get("/vehicles", async ({ session }) => {
        console.log("Fetching vehicles from Tesla API...");
        const response = await fetch(`${config.fleetApi}/api/1/vehicles`, {
          headers: { Authorization: `Bearer ${session!.accessToken}` },
        });

        const data = await response.json();
        console.log("Tesla API response status:", response.status);
        console.log("Tesla API response:", JSON.stringify(data, null, 2));

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch vehicles", details: data }),
            { status: response.status, headers: { "Content-Type": "application/json" } }
          );
        }

        return data;
      })

      // API: Get vehicle data
      .get("/vehicles/:id", async ({ session, params }) => {
        const vehicleId = params.id;

        const response = await fetch(`${config.fleetApi}/api/1/vehicles/${vehicleId}/vehicle_data`, {
          headers: { Authorization: `Bearer ${session!.accessToken}` },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch vehicle data" }),
            { status: response.status, headers: { "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return data;
      })

      // API: Get vehicle location
      .get("/vehicles/:id/location", async ({ session, params }) => {
        const vehicleId = params.id;

        const url = new URL(`${config.fleetApi}/api/1/vehicles/${vehicleId}/vehicle_data`);
        url.searchParams.set("endpoints", "drive_state");

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session!.accessToken}` },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch location" }),
            { status: response.status, headers: { "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return data;
      })

      // API: Get charge state
      .get("/vehicles/:id/charge", async ({ session, params }) => {
        const vehicleId = params.id;

        const url = new URL(`${config.fleetApi}/api/1/vehicles/${vehicleId}/vehicle_data`);
        url.searchParams.set("endpoints", "charge_state");

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session!.accessToken}` },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch charge state" }),
            { status: response.status, headers: { "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return data;
      })
  );

// Serve static files in production (only if build exists)
const distPath = join(process.cwd(), "dist/client");
if (existsSync(distPath)) {
  app.use(staticPlugin({ assets: distPath, prefix: "/" }));
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

app.listen(port);
