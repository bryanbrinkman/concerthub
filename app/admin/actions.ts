"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_COOKIE,
  adminEnabled,
  adminToken,
  verifyAdminPassword,
} from "@/lib/admin";

export async function adminLoginAction(formData: FormData) {
  if (!adminEnabled()) redirect("/admin");
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) redirect("/admin?error=1");

  const store = await cookies();
  store.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect("/admin");
}

export async function adminLogoutAction() {
  const store = await cookies();
  store.delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin");
}
