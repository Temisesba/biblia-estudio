import { getInviteCodes } from "@/lib/data/admin";
import { InviteCodesPanel } from "@/components/invite-codes-panel";

export default async function AdminInvitacionesPage() {
  const codes = await getInviteCodes();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Códigos de invitación</h1>
      <p className="text-sm text-foreground/60">
        Comparte un código con la persona que quieres invitar; lo usará en la pantalla de registro.
      </p>
      <InviteCodesPanel codes={codes} />
    </div>
  );
}
