import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return <AuthShell eyebrow="Welcome back" title="Sign in to continue." description="Sign in to continue to SpaceYaar."><LoginForm /></AuthShell>;
}