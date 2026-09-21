"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import type { AuthState } from "@/types/auth";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Development only: append the raw Supabase error to make debugging easier.
function withDevDetail(message: string, error: AuthError): string {
  if (process.env.NODE_ENV === "development") {
    return `${message} [dev: ${error.status} ${error.code ?? "no_code"} - ${error.message}]`;
  }
  return message;
}

function signUpErrorMessage(error: AuthError): string {
  let message: string;

  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      message =
        "We couldn't create your account. If you already have one, try logging in.";
      break;
    case "weak_password":
      message =
        "That password isn't accepted. Choose a longer or less common one.";
      break;
    case "email_address_invalid":
      message = "That email address isn't accepted. Try a different one.";
      break;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      message = "Too many attempts. Wait a few minutes and try again.";
      break;
    case "signup_disabled":
      message = "Sign-ups are currently disabled.";
      break;
    default:
      message = "We couldn't create your account. Please try again.";
  }

  return withDevDetail(message, error);
}

function signInErrorMessage(error: AuthError): string {
  let message: string;

  if (
    error.code === "invalid_credentials" ||
    error.message === "Invalid login credentials"
  ) {
    // Deliberately generic: don't reveal whether the email exists.
    message = "Invalid email or password.";
  } else if (error.code === "email_not_confirmed") {
    // Supabase only returns this when the password was correct,
    // so it doesn't leak whether an account exists.
    message =
      "Please confirm your email before logging in. Check your inbox for the link.";
  } else if (error.code === "over_request_rate_limit" || error.status === 429) {
    message = "Too many attempts. Wait a few minutes and try again.";
  } else {
    message = "We couldn't log you in. Please try again.";
  }

  return withDevDetail(message, error);
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawEmail = readField(formData, "email");

  const parsed = signUpSchema.safeParse({
    email: rawEmail,
    password: readField(formData, "password"),
  });

  if (!parsed.success) {
    return {
      email: rawEmail,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Server-side log only (terminal / server logs, never the browser).
    console.error("signUp failed:", error.status, error.code, error.message);
    return { email: rawEmail, error: signUpErrorMessage(error) };
  }

  // With email confirmation ON, Supabase returns no session until the
  // user clicks the link in their email.
  if (!data.session) {
    return {
      email: rawEmail,
      message: "Check your email for a confirmation link to finish signing up.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/trips");
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawEmail = readField(formData, "email");

  const parsed = signInSchema.safeParse({
    email: rawEmail,
    password: readField(formData, "password"),
  });

  if (!parsed.success) {
    return {
      email: rawEmail,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Server-side log only (terminal / server logs, never the browser).
    console.error("signIn failed:", error.status, error.code, error.message);
    return { email: rawEmail, error: signInErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect("/trips");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
