import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register']

// Routes that should redirect to home if already authenticated
const authRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('libt_session')
  const isAuthenticated = !!sessionCookie?.value
  
  // If accessing auth routes while authenticated, redirect to home
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  // If accessing protected routes while not authenticated, redirect to login
  if (!isAuthenticated && !publicRoutes.some(route => pathname.startsWith(route))) {
    // Allow API routes to handle their own auth
    if (pathname.startsWith('/api')) {
      return NextResponse.next()
    }
    
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
