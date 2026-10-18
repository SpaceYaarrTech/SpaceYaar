"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { requestOtp, verifyOtp, signInWithGoogle } from "@/lib/auth/auth-client";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { validatePhone } from "@/lib/auth/validation";

const OTP_LENGTH = 6;

export function PhoneOtpLogin() {
  const router = useRouter();
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateOtpDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    if (!nextValue && otpDigits[index] === "") return;

    const nextDigits = [...otpDigits];
    nextDigits[index] = nextValue;
    setOtpDigits(nextDigits);
    setOtpError(null);

    if (nextValue && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const nextDigits = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((digit, index) => {
      if (index < OTP_LENGTH) nextDigits[index] = digit;
    });
    setOtpDigits(nextDigits);
    setOtpError(null);
    const nextFocusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[nextFocusIndex]?.focus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const error = validatePhone(phone);
    setPhoneError(error);
    if (error) return;

    setIsSubmitting(true);
    if (!isOtpRequested) {
      const result = await requestOtp(`+91${phone}`);
      if (!result.ok) {
        setMessage(result.message);
      } else {
        setIsOtpRequested(true);
        setMessage("A verification code was sent to your phone.");
      }
      setIsSubmitting(false);
      return;
    }

    const otpValue = otpDigits.join("");
    if (otpValue.length !== OTP_LENGTH) {
      setOtpError("Please enter the 6 digit OTP.");
      setIsSubmitting(false);
      return;
    }

    const result = await verifyOtp(`+91${phone}`, otpValue);
    if (!result.ok) {
      setOtpError(result.message);
    } else {
      router.push("/role-selection");
    }
    setIsSubmitting(false);
  };

  const handleResendOtp = async () => {
    if (!phone || isResending) return;
    const error = validatePhone(phone);
    setPhoneError(error);
    if (error) return;

    setIsResending(true);
    setMessage("");
    const result = await requestOtp(`+91${phone}`);
    if (!result.ok) {
      setMessage(result.message);
    } else {
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(null);
      setIsOtpRequested(true);
    }
    setIsResending(false);
  };

  const handleGoogleLogin = async () => {
    setMessage("");
    const result = await signInWithGoogle();
    if (!result.ok) setMessage(result.message);
  };

  const handleTestLogin = () => {
    router.push("/role-selection");
  };

  return (
    <main className="login-page" aria-label="SpaceYaar login">
      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow auth-aside-eyebrow">Welcome back</span>
          <h1>Access trusted spaces in a few taps.</h1>
          <p>Use your mobile number or Google account to continue securely and find or list the right space for your next move.</p>
        </div>

        <div className="login-aside-footer">
          <span>SpaceYaar</span>
          <span>Local. Verified. Simple.</span>
        </div>
      </aside>

      <section className="login-panel">
        <div className="login-form-wrap">
          <button
            type="button"
            className="icon-back-button"
            aria-label="Go back"
            onClick={() => router.push("/language")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <span className="eyebrow">Login</span>
          <h2>Apna Number daliya.</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-block">
              <label htmlFor="otp-phone" className="auth-field-label">Mobile Number*</label>
              <div className="phone-input-shell" aria-invalid={Boolean(phoneError)}>
                <span className="phone-code">+91</span>
                <span className="phone-divider" aria-hidden="true" />
                <input
                  id="otp-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="Enter Your 10 Digit Mobile Number"
                  value={phone}
                  aria-invalid={Boolean(phoneError)}
                  aria-describedby={phoneError ? "otp-phone-error" : undefined}
                  onChange={(event) => {
                    const nextPhone = event.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(nextPhone);
                    setPhoneError(null);
                    if (message) setMessage("");
                  }}
                />
              </div>
              {phoneError && (
                <span className="auth-error" id="otp-phone-error" role="alert">
                  {phoneError}
                </span>
              )}
            </div>

            {isOtpRequested && (
              <div className="auth-form-block">
                <label className="auth-field-label">Enter 6 Digit OTP</label>
                <div className="otp-input-grid" role="group" aria-label="One time password input">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(node) => {
                        otpRefs.current[index] = node;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      aria-label={`OTP digit ${index + 1}`}
                      onChange={(event) => updateOtpDigit(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      className="otp-input"
                    />
                  ))}
                </div>
                {otpError && <span className="auth-error" role="alert">{otpError}</span>}
                <div className="otp-meta-row">
                  <span>Didn&apos;t receive OTP?</span>
                  <button type="button" className="text-link-button" onClick={handleResendOtp} disabled={isResending}>
                    {isResending ? "Resending..." : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}

            <PrimaryButton type="submit" className="verify-button" disabled={isSubmitting}>
              {isSubmitting ? (isOtpRequested ? "Verifying..." : "Sending...") : (isOtpRequested ? "Verify & Login" : "Send OTP")}
            </PrimaryButton>
          </form>

          <div className="auth-divider auth-divider--compact" role="separator" aria-label="Alternative login">
            <span />
            <span>OR</span>
            <span />
          </div>

          <button type="button" className="google-button" onClick={handleGoogleLogin}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.95h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.39Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.38l-3.22-2.51c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.62-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.38 13.94A6 6 0 0 1 6.07 12c0-.67.12-1.32.31-1.94V7.47H3.05A10 10 0 0 0 2 12c0 1.63.39 3.17 1.05 4.53l3.33-2.59Z" />
              <path fill="#EA4335" d="M12 5.93c1.47 0 2.8.5 3.84 1.5l2.88-2.88C16.96 2.91 14.7 2 12 2a10 10 0 0 0-8.95 5.47l3.33 2.59C7.18 7.69 9.39 5.93 12 5.93Z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {isAuthBypassEnabled() && (
            <button type="button" className="text-link-button" onClick={handleTestLogin}>
              Continue without signing in (local testing)
            </button>
          )}

          {message && <p className="otp-message" role="status">{message}</p>}

          <p className="otp-terms">
            By continuing, you agree to our <span>Terms &amp; Privacy Policy</span>
          </p>
        </div>
      </section>
    </main>
  );
}
