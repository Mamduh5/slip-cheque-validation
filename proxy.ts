import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { getE2eTestAuthUserId } from "@/lib/e2e-auth";

const authProxy = withAuth({
  pages: {
    signIn: "/login"
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (getE2eTestAuthUserId()) {
    return NextResponse.next();
  }

  return authProxy(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/documents/:path*"]
};
