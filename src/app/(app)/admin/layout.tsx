import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/invitaciones", label: "Invitaciones" },
  { href: "/admin/actividad", label: "Actividad de lectura" },
  { href: "/admin/temas", label: "Temas" },
  { href: "/admin/planes", label: "Planes de lectura" },
  { href: "/admin/importar", label: "Importar contenido" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/leer");

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-48 sm:flex-col">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-muted">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
