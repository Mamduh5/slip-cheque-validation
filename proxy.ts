import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const authProxy = withAuth({
  pages: {
    signIn: "/login"
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NODE_ENV !== "production" && process.env.E2E_TEST_AUTH_USER_ID) {
    return NextResponse.next();
  }

  return authProxy(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/documents/:path*"]
};
