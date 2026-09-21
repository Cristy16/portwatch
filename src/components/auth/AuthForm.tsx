"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/types/auth";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (prevState: AuthState, formData: FormData) => Promise<AuthState>;
  /** Optional info banner shown above the form (e.g. from a redirect). */
  notice?: string;
};

const initialState: AuthState = {};

export function AuthForm({ mode, action, notice }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  const emailErrors = state.fieldErrors?.email;
  const passwordErrors = state.fieldErrors?.password;

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">
        {isSignup ? "Create your account" : "Log in"}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        {isSignup
          ? "Sign up to follow sea-travel announcements at Pilar Port."
          : "Welcome back to PortWatch."}
      </p>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
        >
          {notice}
        </p>
      )}

      {state.message && (
        <p
          role="status"
          className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {state.message}
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={emailErrors ? true : undefined}
            aria-describedby={emailErrors ? "email-error" : undefined}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
          {emailErrors && (
            <p id="email-error" className="mt-1 text-sm text-red-700">
              {emailErrors[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-900"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
            aria-invalid={passwordErrors ? true : undefined}
            aria-describedby={
              passwordErrors
                ? "password-error"
                : isSignup
                  ? "password-hint"
                  : undefined
            }
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
          {isSignup && !passwordErrors && (
            <p id="password-hint" className="mt-1 text-sm text-gray-600">
              At least 8 characters.
            </p>
          )}
          {passwordErrors && (
            <p id="password-error" className="mt-1 text-sm text-red-700">
              {passwordErrors[0]}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? isSignup
              ? "Creating account..."
              : "Logging in..."
            : isSignup
              ? "Sign up"
              : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-700 underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to PortWatch?{" "}
            <Link href="/signup" className="font-medium text-blue-700 underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}