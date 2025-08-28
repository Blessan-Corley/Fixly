// middleware.js
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ✅ CRITICAL: Check for incomplete profiles
    if (token && pathname.startsWith('/dashboard')) {
      const isIncompleteProfile = !token.isRegistered || 
                                !token.role || 
                                !token.username || 
                                token.username.startsWith('temp_');

      // Allow access to signup completion page
      if (pathname.startsWith('/auth/signup') && isIncompleteProfile) {
        return NextResponse.next();
      }

      // Redirect incomplete profiles to complete signup
      if (isIncompleteProfile && !pathname.startsWith('/auth/signup')) {
        console.log('🚫 Redirecting incomplete profile:', token.email);
        return NextResponse.redirect(new URL('/auth/signup?method=google', req.url));
      }
    }

    // Only allow complete profiles beyond this point
    if (!token || !token.isRegistered) {
      return NextResponse.next(); // Let auth handle it
    }

    // Admin routes protection
    if (pathname.startsWith('/dashboard/admin')) {
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Fixer-only routes
    if (pathname.startsWith('/dashboard/browse-jobs') || 
        pathname.startsWith('/dashboard/applications') ||
        pathname.startsWith('/dashboard/earnings') ||
        pathname.startsWith('/dashboard/subscription')) {
      if (token.role !== 'fixer') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Hirer-only routes
    if (pathname.startsWith('/dashboard/post-job') ||
        pathname.startsWith('/dashboard/find-fixers')) {
      if (token.role !== 'hirer') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Job routes - accessible by both hirers and fixers, but with restrictions
    if (pathname.startsWith('/dashboard/jobs')) {
      // Fixers can access job details and apply pages
      if (token.role === 'fixer') {
        if (pathname.includes('/apply') || pathname.match(/^\/dashboard\/jobs\/[^\/]+$/)) {
          return NextResponse.next(); // Allow job details and apply pages
        } else {
          return NextResponse.redirect(new URL('/dashboard', req.url)); // Block job management pages
        }
      }
      // Hirers can access all job routes
      else if (token.role === 'hirer') {
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
        
        // Always allow public pages
        if (pathname === '/' || 
            pathname.startsWith('/auth/') || 
            pathname.startsWith('/api/auth') ||
            pathname.startsWith('/about') ||
            pathname.startsWith('/help') ||
            pathname.startsWith('/contact')) {
          return true;
        }
        
        // Dashboard routes require authentication
        if (pathname.startsWith('/dashboard')) {
          if (!token) {
            console.log('🚫 No token, denying access to:', pathname);
            return false;
          }
          
          // Additional check for complete profiles will be done in main middleware
          return true;
        }
        
        return true;
      }
    }
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/'
  ]
};