import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type Role = "user" | "admin";

/**
 * Returns the authenticated user, or null.
 * Uses getUser(), which verifies the token with Supabase Auth
 * (getSession() only reads the cookie and must not be trusted on the server).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

/** Redirects to /login if nobody is logged in. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Requires a logged-in user whose profiles.role is 'admin'.
 * The role is read from the database, never from user_metadata or client input.
 * Fails closed: a missing profile or any query error counts as "not admin".
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || profile?.role !== "admin") redirect("/trips");
  return user;
}