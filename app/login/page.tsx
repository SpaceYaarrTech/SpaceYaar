import { AuthShell } from "@/components/auth/AuthShell";
import { PhoneOtpLogin } from "@/components/auth/PhoneOtpLogin";

export default function LoginPage() {
  return <AuthShell eyebrow="OTP Login" title="" description="" showAside={false}><PhoneOtpLogin /></AuthShell>;
}
