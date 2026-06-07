// middleware.ts — protection /food/dashboard/*
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/food/dashboard') &&
    !pathname.startsWith('/food/dashboard/login')
  ) {
    let res = NextResponse.next({ request: req })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set(name, value)
              res = NextResponse.next({ request: req })
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/food/dashboard/login', req.url))
    }

    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/food/dashboard/:path*'],
}
