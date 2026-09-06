import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` — same mechanics, new file/export name.
// A fresh nonce per request is required for CSP's script-src/style-src to allow
// Next's own inline runtime scripts while still blocking anything an attacker injects.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // No 'strict-dynamic': it explicitly revokes 'self' for scripts per spec, and at
  // least one Turbopack-emitted production chunk doesn't carry Next's auto-applied
  // nonce (confirmed by hand: script-src 'self' 'nonce-x' 'strict-dynamic' blocked
  // it, dropping 'strict-dynamic' fixed it). 'self' + nonce still blocks injected
  // inline scripts and cross-origin script loads — this app has no third-party
  // scripts that would need strict-dynamic's dynamic-trust propagation anyway.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
