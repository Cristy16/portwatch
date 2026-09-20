import { AuthForm } from "@/components/auth/AuthForm";
import { signIn } from "../actions";

export const metadata = { title: "Log in | PortWatch" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const notice =
    error === "confirmation_failed"
      ? "That confirmation link is invalid or has expired. Try logging in, or sign up again."
      : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <AuthForm mode="login" action={signIn} notice={notice} />
    </main>
  );
}