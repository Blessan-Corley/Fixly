// middleware.js
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes protection
    if (pathname.startsWith('/dashboard/admin')) {
      if (!token || token.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Fixer-only routes
    if (pathname.startsWith('/dashboard/browse-jobs') || 
        pathname.startsWith('/dashboard/applications') ||
        pathname.startsWith('/dashboard/earnings') ||
        pathname.startsWith('/dashboard/subscription')) {
      if (!token || token.role !== 'fixer') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Hirer-only routes
    if (pathname.startsWith('/dashboard/post-job') ||
        pathname.startsWith('/dashboard/find-fixers')) {
      if (!token || token.role !== 'hirer') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Job routes - accessible by both hirers and fixers, but with restrictions
    if (pathname.startsWith('/dashboard/jobs')) {
      // Fixers can access job details and apply pages
      if (token && token.role === 'fixer') {
        if (pathname.includes('/apply') || pathname.match(/^\/dashboard\/jobs\/[^\/]+$/)) {
          return NextResponse.next(); // Allow job details and apply pages
        } else {
          return NextResponse.redirect(new URL('/dashboard', req.url)); // Block job management pages
        }
      }
      // Hirers can access all job routes
      else if (token && token.role === 'hirer') {
        return NextResponse.next();
      }
      // Block everyone else
      else {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages for non-authenticated users
        if (pathname.startsWith('/auth/') || pathname === '/') {
          return true;
        }
        
        // Require authentication for dashboard routes
        if (pathname.startsWith('/dashboard')) {
          return !!token;
        }
        
        return true;
      }
    }
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*'
  ]
};