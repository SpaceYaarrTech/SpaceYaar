import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const isOwnerRoute = request.nextUrl.pathname === "/owner" || request.nextUrl.pathname.startsWith("/owner/");
  const isAdminRoute = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const previewAuthBypass = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
  if (isOwnerRoute && previewAuthBypass) return NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return isOwnerRoute || isAdminRoute
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if ((isOwnerRoute || isAdminRoute) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
