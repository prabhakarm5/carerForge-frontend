// // worker.js

// const FALLBACK_BACKEND_ORIGIN =
//   "http://careerforge-ai-env.eba-mp5s8gpr.ap-south-1.elasticbeanstalk.com";

// export default {
//   async fetch(request, env) {
//     const url = new URL(request.url);

//     // ✅ Debug endpoint
//     // Open this in browser:
//     // https://carerforge-frontend.prabhakarm7255.workers.dev/api/__proxy-health
//     if (url.pathname === "/api/__proxy-health") {
//       return handleProxyHealth(env);
//     }

//     // ✅ API proxy
//     if (url.pathname.startsWith("/api/")) {
//       return proxyToBackend(request, env, url);
//     }

//     // ✅ React/Vite static app
//     return env.ASSETS.fetch(request);
//   },
// };

// async function handleProxyHealth(env) {
//   const backendOrigin =
//     env.BACKEND_ORIGIN || FALLBACK_BACKEND_ORIGIN;

//   return jsonResponse(
//     {
//       ok: true,
//       source: "cloudflare-worker",
//       backendOrigin,
//       message: "Cloudflare API proxy is active",
//     },
//     200
//   );
// }

// async function proxyToBackend(request, env, incomingUrl) {
//   const backendOrigin =
//     env.BACKEND_ORIGIN || FALLBACK_BACKEND_ORIGIN;

//   try {
//     const backendBase = backendOrigin.replace(/\/+$/, "");

//     const backendUrl = new URL(
//       incomingUrl.pathname + incomingUrl.search,
//       backendBase
//     );

//     // ✅ OPTIONS preflight
//     if (request.method === "OPTIONS") {
//       return new Response(null, {
//         status: 204,
//         headers: getCorsHeaders(incomingUrl.origin),
//       });
//     }

//     const headers = new Headers(request.headers);

//     // ✅ Important: backend ko Cloudflare/frontend origin forward mat karo
//     // warna Spring CORS filter confuse/block kar sakta hai.
//     headers.delete("host");
//     headers.delete("origin");
//     headers.delete("referer");

//     headers.set("x-forwarded-proto", "https");
//     headers.set("x-forwarded-host", incomingUrl.host);

//     const init = {
//       method: request.method,
//       headers,
//       redirect: "manual",
//     };

//     if (!["GET", "HEAD"].includes(request.method)) {
//       init.body = await request.arrayBuffer();
//     }

//     const backendResponse = await fetch(backendUrl.toString(), init);

//     const responseHeaders = new Headers(backendResponse.headers);

//     const corsHeaders = getCorsHeaders(incomingUrl.origin);
//     for (const [key, value] of corsHeaders.entries()) {
//       responseHeaders.set(key, value);
//     }

//     return new Response(backendResponse.body, {
//       status: backendResponse.status,
//       statusText: backendResponse.statusText,
//       headers: responseHeaders,
//     });
//   } catch (error) {
//     return jsonResponse(
//       {
//         ok: false,
//         source: "cloudflare-worker",
//         message: "Proxy failed before reaching backend or while forwarding request",
//         error: String(error?.message || error),
//       },
//       500
//     );
//   }
// }

// function getCorsHeaders(origin) {
//   return new Headers({
//     "access-control-allow-origin": origin,
//     "access-control-allow-credentials": "true",
//     "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
//     "access-control-allow-headers":
//       "Authorization,Content-Type,Accept,Origin,X-Requested-With",
//   });
// }

// function jsonResponse(data, status = 200) {
//   return new Response(JSON.stringify(data, null, 2), {
//     status,
//     headers: {
//       "content-type": "application/json",
//       "cache-control": "no-store",
//     },
//   });
// }