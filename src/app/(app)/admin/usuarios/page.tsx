import { getAllProfiles } from "@/lib/data/admin";
import { UserTable } from "@/components/user-table";

export default async function AdminUsuariosPage() {
  const profiles = await getAllProfiles();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <UserTable profiles={profiles} />
    </div>
  );
}
