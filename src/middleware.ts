import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check if it's an admin dashboard route (excluding login api and login page)
    if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login') && !request.nextUrl.pathname.startsWith('/api/admin')) {
        const adminToken = request.cookies.get('admin_token')?.value

        // Very simple secure cookie check
        if (!adminToken || adminToken !== process.env.ADMIN_TOKEN_SECRET) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*'],
}
