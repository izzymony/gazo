import { NextRequest, NextResponse } from 'next/server';

// Define protected routes that require authentication.
// The whole seller experience lives under /dashboard EXCEPT the store-setup
// flow at /setup — both must always require login (guests never reach the
// seller side). Buyer routes (/shop, /cart, storefronts) stay public on purpose.
const protectedPaths = ['/dashboard', '/setup', '/api/secure-data'];

export function middleware(request: NextRequest) {
  // Check if the request is for a protected path
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );
  
  // Check for authentication token
  const isAuthenticated = Boolean(request.cookies.get('accessToken'));

  // Redirect unauthenticated users to the login page if on a protected path
  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/signin?step=1', request.url));
  }

  return NextResponse.next();
}

// Define the paths this middleware should apply to
export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/setup', '/setup/:path*'],
};
