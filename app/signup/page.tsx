import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return <AuthShell eyebrow="Join SpaceYaar" title="Create your account." description="Join SpaceYaar and find the experience that fits you."><SignupForm /></AuthShell>;
}