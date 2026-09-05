"use client";

import { useId, useState } from "react";

type PasswordInputProps = { label: string; name: string; placeholder: string; value: string; error?: string; autoComplete: string; onChange: (value: string) => void };

export function PasswordInput({ label, name, placeholder, value, error, autoComplete, onChange }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return <div className="auth-field"><label htmlFor={inputId}>{label}</label><div className="password-control"><input id={inputId} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(event.target.value)} /><button type="button" className="password-toggle focus-ring" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? "Hide" : "Show"}</button></div>{error && <span className="auth-error" id={errorId} role="alert">{error}</span>}</div>;
}