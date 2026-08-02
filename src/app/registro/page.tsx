import Link from "next/link";
import { signUpAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";

export default function RegistroPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="text-sm text-foreground/60">
          El registro requiere un código de invitación proporcionado por tu administrador
        </p>
      </div>
      <AuthForm
        action={signUpAction}
        submitLabel="Registrarme"
        fields={[
          { name: "full_name", label: "Nombre completo", placeholder: "Juan Pérez" },
          { name: "email", label: "Correo electrónico", type: "email", placeholder: "tu@correo.com" },
          { name: "password", label: "Contraseña", type: "password" },
          { name: "invite_code", label: "Código de invitación", placeholder: "XXXX-XXXX" },
        ]}
      />
      <p className="text-sm text-foreground/60">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
