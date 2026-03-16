import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth';

const protectedRoutes = ['/dashboard'];
const adminRoutes = ['/admin'];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    console.log(`Middleware checking path: ${path}`);

    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
    const isAdminRoute = adminRoutes.some(route => path.startsWith(route));
    const session = await getSession();

    if (isProtectedRoute) {
        console.log(`Middleware session state:`, session);

        if (!session) {
            console.log(`No active session found, redirecting to /login...`);
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (session.user?.isAdmin) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
    }

    if (isAdminRoute) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (!session.user?.isAdmin) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // If going to login while already logged in, redirect to dashboard
    if (path === '/login' || path === '/') {
        if (session) {
            return NextResponse.redirect(
                new URL(session.user?.isAdmin ? '/admin/dashboard' : '/dashboard', request.url)
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
