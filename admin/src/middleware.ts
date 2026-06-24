// Middleware Next — protection des routes au niveau edge (défense en profondeur).
//
// Les couches d'autorisation principales restent : la garde client (layout
// dashboard) + l'API admin-gated (authenticate + authorize('admin')). Ce
// middleware ajoute un garde-fou serveur : toute route protégée sans cookie de
// session est redirigée vers /login AVANT même de servir la coquille du dashboard.
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_COOKIE = 'primeo_admin_token';

export function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/2fa');

  if (!token && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // S'applique à tout sauf : assets Next, favicon, et fichiers avec extension (.png, .ico…)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
