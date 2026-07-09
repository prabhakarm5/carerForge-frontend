// functions/api/[[path]].js

export async function onRequest(context) {
  const backendOrigin = context.env.BACKEND_ORIGIN;

  if (!backendOrigin) {
    return new Response("BACKEND_ORIGIN missing", { status: 500 });
  }

  const incomingUrl = new URL(context.request.url);
  const backendUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    backendOrigin.replace(/\/+$/, "")
  );

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", "https");

  const init = {
    method: context.request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(context.request.method)) {
    init.body = context.request.body;
  }

  const backendResponse = await fetch(backendUrl.toString(), init);
  const responseHeaders = new Headers(backendResponse.headers);

  // Same-origin call hai, phir bhi safe CORS headers rakh rahe hain.
  responseHeaders.set("access-control-allow-origin", incomingUrl.origin);
  responseHeaders.set("access-control-allow-credentials", "true");

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}