import Link from "next/link";
import { signInAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Biblia Estudio</h1>
        <p className="text-sm text-foreground/60">Inicia sesión para continuar tu lectura</p>
      </div>
      <AuthForm
        action={signInAction}
        submitLabel="Iniciar sesión"
        fields={[
          { name: "email", label: "Correo electrónico", type: "email", placeholder: "tu@correo.com" },
          { name: "password", label: "Contraseña", type: "password" },
        ]}
      />
      <p className="text-sm text-foreground/60">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary underline">
          Regístrate con tu código de invitación
        </Link>
      </p>
    </main>
  );
}
