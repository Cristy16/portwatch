import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

// Login only checks that a password was entered, so the form never
// reveals the password rules to someone guessing at an existing account.
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});