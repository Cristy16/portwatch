export type AuthState = {
  /** Form-level error (wrong credentials, Supabase error, etc.). */
  error?: string;
  /** Non-error info, e.g. "check your email". */
  message?: string;
  /** Per-field validation errors from zod. */
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  /** Echoed back so the email field keeps its value after an error. */
  email?: string;
};