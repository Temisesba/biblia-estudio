import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeControl } from "@/components/font-size-control";
import { SearchBar } from "@/components/search-bar";
import { signOutAction } from "@/lib/actions/auth";
import type { Profile } from "@/types/database";

export function TopNav({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5">
        <Link href="/leer" className="mr-2 shrink-0 text-lg font-semibold text-primary">
          📖 Biblia Estudio
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm">
          <Link href="/leer" className="rounded-md px-2.5 py-1.5 hover:bg-muted">
            Leer
          </Link>
          <Link href="/mi-estudio" className="rounded-md px-2.5 py-1.5 hover:bg-muted">
            Mi estudio
          </Link>
          <Link href="/progreso" className="rounded-md px-2.5 py-1.5 hover:bg-muted">
            Progreso
          </Link>
          {profile.role === "admin" && (
            <Link href="/admin" className="rounded-md px-2.5 py-1.5 hover:bg-muted">
              Admin
            </Link>
          )}
        </nav>
        <SearchBar />
        <div className="ml-auto flex items-center gap-2">
          <FontSizeControl />
          <ThemeToggle />
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              title={profile.full_name}
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
