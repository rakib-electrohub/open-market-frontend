"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { useMemo } from "react";

export function Link({ to, href, ...props }) {
  return <NextLink href={href || to} {...props} />;
}

export function useNavigate() {
  const router = useRouter();
  return (to, options = {}) => {
    if (options.state !== undefined && typeof window !== "undefined") {
      window.sessionStorage.setItem("open-market-navigation-state", JSON.stringify(options.state));
    }
    router.push(to);
  };
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  return useMemo(() => ({ pathname, search: searchParams.toString() ? `?${searchParams.toString()}` : "", state: readNavigationState() }), [pathname, searchParams]);
}

export function useParams() {
  return useNextParams();
}

export function useSearchParams() {
  const router = useRouter();
  const searchParams = useNextSearchParams();
  const setSearchParams = (nextParams) => {
    const params = nextParams instanceof URLSearchParams ? nextParams : new URLSearchParams(nextParams);
    router.replace(`?${params.toString()}`);
  };
  return [searchParams, setSearchParams];
}

function readNavigationState() {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem("open-market-navigation-state");
  if (!value) return null;
  window.sessionStorage.removeItem("open-market-navigation-state");
  try { return JSON.parse(value); } catch { return null; }
}

export function Navigate({ to, replace = false }) {
  const router = useRouter();
  if (typeof window !== "undefined") {
    if (replace) router.replace(to); else router.push(to);
  }
  return null;
}

export function Outlet() { return null; }