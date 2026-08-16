import type { Metadata } from "next";
import AuthPage from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Create account · SkyGrid" };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}