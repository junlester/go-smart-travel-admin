import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('authToken')?.value;
  const path = request.nextUrl.pathname;
  const forceLogout = request.nextUrl.searchParams.get('logout') === 'true';
  const freshSession = request.nextUrl.searchParams.get('fresh') === 'true';
  
  console.log(`Middleware processing path: ${path}`);
  
  // For direct browser access to base site path or specific paths, force login page
  const isDirectAccess = !request.headers.get('referer') || 
                        request.headers.get('referer')?.endsWith('/') ||
                        request.headers.get('sec-fetch-mode') === 'navigate';

  // Public routes (no authentication needed)
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(path);
  
  // Handle root path - redirect to login
  if (path === '/') {
    console.log('Root path accessed, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Clear auth token at login page but do NOT redirect (avoid infinite loop)
  if (path === '/login') {
    console.log('Login page accessed, clearing auth token');
    const response = NextResponse.next();
    response.cookies.delete('authToken');
    return response;
  }

  // Check for logout flag
  if (forceLogout || freshSession) {
    console.log('Logout/fresh flag detected, redirecting to login');
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('authToken');
    return response;
  }

  // Check if token is properly formed
  const isValidToken = authToken && authToken.length > 20;

  // If no valid auth token and accessing protected route, redirect to login
  if (!isValidToken && !isPublicRoute) {
    console.log('No valid auth token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Match all routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 