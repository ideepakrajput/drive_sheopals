import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth';

const protectedRoutes = ['/dashboard'];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    console.log(`Middleware checking path: ${path}`);

    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

    if (isProtectedRoute) {
        const session = await getSession();
        console.log(`Middleware session state:`, session);

        if (!session) {
            console.log(`No active session found, redirecting to /login...`);
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // If going to login while already logged in, redirect to dashboard
    if (path === '/login' || path === '/') {
        const session = await getSession();
        if (session) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
