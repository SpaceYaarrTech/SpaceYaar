"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const STORAGE_KEY = "spaceyaar-selected-language";

type LanguageOption = {
  id: string;
  label: string;
  short: string;
};

const LANGUAGES: LanguageOption[] = [
  { id: "hindi", label: "Hindi", short: "अ" },
  { id: "english", label: "English", short: "En" },
  { id: "marathi", label: "Marathi", short: "ल" },
  { id: "punjabi", label: "Punjabi", short: "ਪ" },
  { id: "gujarati", label: "Gujarati", short: "ગુ" },
  { id: "malayalam", label: "Malayalam", short: "അ" },
];

export function LanguageSelection() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSelectedLanguage(saved);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, selectedLanguage);
  }, [selectedLanguage, hasHydrated]);

  const selectedLabel = useMemo(
    () => LANGUAGES.find((item) => item.label === selectedLanguage)?.label ?? "English",
    [selectedLanguage],
  );

  return (
    <main className="login-page" aria-label="Choose your language">
      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow auth-aside-eyebrow">Local language</span>
          <h1>Find the platform in the language you trust.</h1>
          <p>Choose your preferred language to personalize the SpaceYaar experience for listing, bookings, and support.</p>
        </div>

        <div className="login-aside-footer">
          <span>SpaceYaar</span>
          <span>Smart stay, local trust</span>
        </div>
      </aside>

      <section className="login-panel">
        <div className="login-form-wrap">
          <button
            type="button"
            className="icon-back-button"
            aria-label="Go back to onboarding"
            onClick={() => router.push("/onboarding")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <span className="eyebrow">Language</span>
          <h2>Choose your language</h2>
          <p className="login-subtitle">Please select your preferred language</p>

          <div className="language-list" role="list" aria-label="Language options">
            {LANGUAGES.map((language) => {
              const isSelected = selectedLanguage === language.label;

              return (
                <button
                  key={language.id}
                  type="button"
                  role="listitem"
                  className={`language-option ${isSelected ? "selected" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedLanguage(language.label)}
                >
                  <span className="language-badge" aria-hidden="true">
                    {language.short}
                  </span>
                  <span className="language-name">{language.label}</span>
                </button>
              );
            })}
          </div>

          <div className="auth-compact-footer auth-compact-footer--right">
            <PrimaryButton
              type="button"
              className="auth-next-button"
              disabled={!selectedLanguage}
              onClick={() => router.push("/login")}
            >
              <span>Next</span>
              <span aria-hidden="true">→</span>
            </PrimaryButton>
          </div>

          <div className="sr-only" aria-live="polite">
            {selectedLabel} selected
          </div>
        </div>
      </section>
    </main>
  );
}
