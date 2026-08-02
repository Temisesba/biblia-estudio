import Link from "next/link";
import { getAllReadingActivity } from "@/lib/data/admin";

export default async function AdminActividadPage() {
  const activity = await getAllReadingActivity();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Actividad de lectura</h1>
      <p className="text-sm text-foreground/60">
        Qué capítulo leyó cada usuario y cuándo (los 500 registros más recientes).
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Pasaje</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Última lectura</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((a, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3">{a.user_name}</td>
                <td className="p-3">
                  <Link href={a.href} className="text-primary hover:underline">
                    {a.book_name} {a.chapter_number}
                  </Link>
                </td>
                <td className="p-3">{a.status}</td>
                <td className="p-3 text-foreground/50">
                  {a.last_read_at ? new Date(a.last_read_at).toLocaleString("es-MX") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
