// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSupabaseServer() {
  const cookieStore = await cookies() // Next.js: cookies() is async here (Edge runtime)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In Server Components, cookies are read-only; ignore safely and let middleware/route handlers set [try/catch]
          try {
            const anyStore = cookieStore as any
            if (typeof anyStore?.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }) => {
                anyStore.set(name, value, options)
              })
            }
          } catch {
            // No-op in Server Components; recommended pattern in Supabase SSR docs
          }
        },
      },
    }
  )
}


