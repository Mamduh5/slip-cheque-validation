export type HeaderNavItem = "dashboard" | "review" | "upload" | "login" | "register";

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

export function isHeaderNavItemActive(item: HeaderNavItem, pathname: string) {
  const normalized = normalizePathname(pathname);

  switch (item) {
    case "dashboard":
      return normalized === "/dashboard" || normalized.startsWith("/documents/");
    case "review":
      return normalized === "/review" || normalized.startsWith("/review/");
    case "upload":
      return normalized === "/upload";
    case "login":
      return normalized === "/login" || normalized === "/forgot-password";
    case "register":
      return normalized === "/register";
    default:
      return false;
  }
}
