"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
  ) : null;
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/leer" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-md px-2.5 py-1.5 transition-colors ${
        active ? "bg-muted font-medium text-primary" : "hover:bg-muted"
      }`}
    >
      {children}
      <PendingDot />
    </Link>
  );
}
