import { AuthForm } from "@/components/auth/AuthForm";
import { signUp } from "../actions";

export const metadata = { title: "Sign up | PortWatch" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <AuthForm mode="signup" action={signUp} />
    </main>
  );
}