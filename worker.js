// worker.js

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================
    // API PROXY
    // Frontend call:
    // https://carerforge-frontend.prabhakarm7255.workers.dev/api/auth/login
    //
    // Backend forward:
    // http://careerforge-ai-env.eba-mp5s8gpr.ap-south-1.elasticbeanstalk.com/api/auth/login
    // =====================================================
    if (url.pathname.startsWith("/api/")) {
      return proxyToBackend(request, env, url);
    }

    // =====================================================
    // STATIC FRONTEND ASSETS
    // Agar /api nahi hai, to React/Vite static app serve karo.
    // =====================================================
    return env.ASSETS.fetch(request);
  },
};

async function proxyToBackend(request, env, incomingUrl) {
  const backendOrigin = env.BACKEND_ORIGIN;

  if (!backendOrigin) {
    return new Response("BACKEND_ORIGIN missing in Cloudflare environment", {
      status: 500,
    });
  }

  const backendBase = backendOrigin.replace(/\/+$/, "");

  const backendUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    backendBase
  );

  // OPTIONS preflight ko safe response
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(incomingUrl.origin),
    });
  }

  const headers = new Headers(request.headers);

  // Cloudflare/Browser specific host header backend ko mat bhejo
  headers.delete("host");

  // Backend ko batane ke liye ki original request HTTPS se aayi thi
  headers.set("x-forwarded-proto", "https");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-origin", incomingUrl.origin);

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  // GET/HEAD request mein body allowed nahi hoti
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
  }

  const backendResponse = await fetch(backendUrl.toString(), init);

  const responseHeaders = new Headers(backendResponse.headers);

  // Same-origin proxy hai, phir bhi safe headers rakh rahe hain
  const corsHeaders = getCorsHeaders(incomingUrl.origin);
  for (const [key, value] of corsHeaders.entries()) {
    responseHeaders.set(key, value);
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

function getCorsHeaders(origin) {
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":
      "Authorization,Content-Type,Accept,Origin,X-Requested-With",
  });
}