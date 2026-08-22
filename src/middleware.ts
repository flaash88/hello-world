import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/manifest.webmanifest', '/sw.js', '/offline']

/**
 * Grober Torwaechter: ohne Session-Cookie geht es zur Anmeldung. Die
 * eigentliche Pruefung passiert serverseitig in getCurrentUser() – hier geht es
 * nur darum, angemeldete Ansichten gar nicht erst zu rendern.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const hasSession = request.cookies.has('sp_session')

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|fonts|favicon.ico|api/health).*)'],
}
