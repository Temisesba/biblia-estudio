import Link from "next/link";
import { NavLink } from "@/components/nav-link";
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
          <NavLink href="/leer">Leer</NavLink>
          <NavLink href="/mi-estudio">Mi estudio</NavLink>
          <NavLink href="/progreso">Progreso</NavLink>
          <NavLink href="/temas">Temas</NavLink>
          {profile.role === "admin" && <NavLink href="/admin">Admin</NavLink>}
        </nav>
        <SearchBar />
        <div className="ml-auto flex items-center gap-2">
          <FontSizeControl />
          <ThemeToggle />
          <div id="selection-toolbar-slot" className="flex items-center" />
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
