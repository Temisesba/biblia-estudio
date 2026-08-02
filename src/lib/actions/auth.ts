"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthFormState {
  error?: string;
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }
  redirect("/leer");
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  if (!fullName || !email || !password || !inviteCode) {
    return { error: "Completa todos los campos, incluyendo el código de invitación." };
  }

  const supabase = await createClient();

  const { data: isValid, error: validateError } = await supabase.rpc("validate_invite_code", {
    p_code: inviteCode,
  });
  if (validateError || !isValid) {
    return { error: "El código de invitación no es válido, ya expiró o alcanzó su límite de usos." };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (signUpError) {
    return { error: signUpError.message };
  }

  await supabase.rpc("redeem_invite_code", { p_code: inviteCode });

  redirect("/leer");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
