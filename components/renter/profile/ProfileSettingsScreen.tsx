"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";

const STORAGE_KEY = "spaceyaar:renter-preferences";

type Preferences = {
  bookingUpdates: boolean;
  offers: boolean;
  language: string;
};

const DEFAULT_PREFERENCES: Preferences = { bookingUpdates: true, offers: false, language: "English" };
const LANGUAGES = ["English", "हिन्दी"];

const FAQS = [
  { q: "How do I book a space?", a: "Find a space from Home or Search, open the listing, choose your dates, and confirm the booking. The owner is notified instantly." },
  { q: "How do payments work?", a: "Payments are processed securely through Razorpay. You can pay with UPI, cards, or netbanking at checkout." },
  { q: "Can I cancel a booking?", a: "You can cancel an upcoming booking from the Bookings tab. Any refund follows the space's refund policy." },
  { q: "How do I contact a space owner?", a: "Open your booking and use the contact option to reveal the owner's phone number." },
  { q: "How do I save a space?", a: "Tap the heart icon on any listing to save it. Saved spaces appear under the Saved tab." },
];

function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) as Partial<Preferences> });
    } catch { /* fall back to defaults */ }
  }, []);
  const update = (patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage unavailable */ }
      return next;
    });
  };
  return { prefs, update };
}

type ProfileSettingsScreenProps = { section: string };

export function ProfileSettingsScreen({ section }: ProfileSettingsScreenProps) {
  const router = useRouter();
  const { prefs, update } = usePreferences();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const supportEmail = "support@spaceyaar.com";

  const titles: Record<string, string> = {
    notifications: "Notifications",
    language: "Language & Region",
    "payment-methods": "Payment Methods",
    contact: "Contact Us & Help",
    faqs: "Help & FAQs",
  };

  const back = () => router.push("/profile");

  return (
    <main className="renter-flow-page renter-profile-subpage">
      <header className="renter-subpage-header">
        <button type="button" className="renter-back-button" aria-label="Back to profile" onClick={back}>
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="renter-subpage-title">{titles[section] ?? "Settings"}</h1>
      </header>

      {section === "notifications" && (
        <div className="renter-form">
          <div className="renter-default-toggle">
            <span>Booking updates</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.bookingUpdates}
              aria-label="Booking updates"
              className={`renter-toggle${prefs.bookingUpdates ? " is-on" : ""}`}
              onClick={() => update({ bookingUpdates: !prefs.bookingUpdates })}
            >
              <span aria-hidden />
            </button>
          </div>
          <div className="renter-default-toggle">
            <span>Offers &amp; promotions</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.offers}
              aria-label="Offers and promotions"
              className={`renter-toggle${prefs.offers ? " is-on" : ""}`}
              onClick={() => update({ offers: !prefs.offers })}
            >
              <span aria-hidden />
            </button>
          </div>
          <p className="renter-settings-note">Notification preferences are saved on this device.</p>
        </div>
      )}

      {section === "language" && (
        <div className="renter-form">
          <div className="renter-form-field">
            <label htmlFor="lang-select">Language</label>
            <select
              id="lang-select"
              className="renter-form-input"
              value={prefs.language}
              onChange={(event) => update({ language: event.target.value })}
            >
              {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </div>
          <div className="renter-form-field">
            <label htmlFor="region-input">Region</label>
            <input id="region-input" className="renter-form-input" value="India" readOnly />
          </div>
        </div>
      )}

      {section === "payment-methods" && (
        <div className="renter-form">
          <div className="renter-settings-card">
            <h2>Razorpay Secure Checkout</h2>
            <p>Payment methods are added at checkout and handled securely by Razorpay. SpaceYaar never stores your card details.</p>
            <p className="renter-settings-note">Supported: UPI, Credit/Debit Cards, NetBanking, Wallets.</p>
          </div>
        </div>
      )}

      {section === "contact" && (
        <div className="renter-form">
          <div className="renter-settings-card">
            <h2>Email support</h2>
            <p>
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </p>
            <p className="renter-settings-note">We usually reply within one business day.</p>
          </div>
          <div className="renter-settings-card">
            <h2>Booking help</h2>
            <p>For issues with a specific booking, open the Bookings tab and use the booking&apos;s contact option so we can trace it quickly.</p>
          </div>
        </div>
      )}

      {section === "faqs" && (
        <div className="renter-faq-list">
          {FAQS.map((faq, index) => (
            <div key={faq.q} className="renter-faq-item">
              <button
                type="button"
                className="renter-faq-question"
                aria-expanded={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                {faq.q}
              </button>
              {openFaq === index && <p className="renter-faq-answer">{faq.a}</p>}
            </div>
          ))}
        </div>
      )}

      {!titles[section] && <p className="renter-flow-error" role="alert">This settings page does not exist.</p>}

      <RenterBottomNavigation />
    </main>
  );
}
