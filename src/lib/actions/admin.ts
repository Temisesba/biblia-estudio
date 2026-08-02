"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UserRole, UserStatus } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("No autorizado");
  return supabase;
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}

export async function createInviteCode(maxUses: number, expiresInDays: number | null) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expires_at = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("invite_codes").insert({
    code: generateCode(),
    max_uses: maxUses,
    created_by: user!.id,
    expires_at,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/invitaciones");
}

export async function toggleInviteActive(id: string, active: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("invite_codes").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/invitaciones");
}
