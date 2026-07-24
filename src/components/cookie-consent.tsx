"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Cookie, Fingerprint, LockKeyhole, ShieldCheck, X } from "lucide-react";

const consentStorageKey = "contextkit_cookie_preferences_v1";
const openPreferencesEvent = "contextkit:open-cookie-preferences";

type ConsentState = "loading" | "open" | "saved";

export function CookieConsent() {
  const [state, setState] = useState<ConsentState>("loading");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setState(window.localStorage.getItem(consentStorageKey) ? "saved" : "open");

    const openPreferences = () => {
      setShowDetails(true);
      setState("open");
    };
    window.addEventListener(openPreferencesEvent, openPreferences);
    return () => window.removeEventListener(openPreferencesEvent, openPreferences);
  }, []);

  function saveEssentialPreference() {
    window.localStorage.setItem(consentStorageKey, JSON.stringify({
      version: 1,
      necessary: true,
      analyticsCookies: false,
      advertisingCookies: false,
      savedAt: new Date().toISOString()
    }));
    setState("saved");
    setShowDetails(false);
  }

  if (state !== "open") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-3 sm:px-6 sm:pb-6" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="cookie-shell pointer-events-auto relative mx-auto max-h-[calc(100dvh-1.5rem)] max-w-[960px] overflow-x-hidden overflow-y-auto border border-white/[0.13] bg-[#070b09]/95 shadow-[0_32px_120px_rgba(0,0,0,0.82)] backdrop-blur-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="cookie-scan pointer-events-none absolute inset-0" />

        <div className="relative flex h-9 items-center justify-between border-b border-white/[0.09] px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="relative h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_12px_rgba(115,243,195,0.9)]">
              <span className="absolute inset-0 animate-ping rounded-full bg-mint opacity-50" />
            </span>
            <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/46">Privacy protocol / CK-01</p>
          </div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-mint/70">Essential only</p>
        </div>

        <div className="relative grid sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[132px_minmax(0,1fr)_252px]">
          <div className="cookie-signal hidden min-h-[184px] border-r border-white/[0.09] sm:grid sm:place-items-center">
            <div className="relative grid h-[72px] w-[72px] place-items-center">
              <span className="absolute inset-0 rounded-full border border-mint/20" />
              <span className="absolute inset-[10px] rounded-full border border-dashed border-aqua/25" />
              <span className="absolute inset-[21px] rounded-full border border-mint/30 bg-mint/[0.06] shadow-[0_0_40px_rgba(115,243,195,0.08)]" />
              <Fingerprint className="relative h-6 w-6 text-mint" />
            </div>
            <div className="absolute bottom-4 font-mono text-[7px] uppercase tracking-[0.2em] text-white/30">No tracking ID</div>
          </div>

          <div className="flex min-w-0 gap-4 p-5 sm:p-6">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border border-mint/25 bg-mint/[0.07] text-mint sm:hidden">
              <Cookie className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-mint">Session security active</p>
              <h2 id="cookie-consent-title" className="mt-2 max-w-xl text-[1.4rem] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[1.65rem]">
                Cookies, minus the surveillance.
              </h2>
              <p className="mt-3 max-w-xl text-[13px] leading-[1.65] text-white/52">
                One secure cookie keeps dashboard and OAuth sessions working. Metrics stay aggregate; advertising and cross-site tracking stay off.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[8px] uppercase tracking-[0.15em] text-white/34">
                <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-mint" /> Secure session</span>
                <span className="inline-flex items-center gap-1.5"><X className="h-3 w-3 text-coral" /> Ad profiles</span>
                <span className="inline-flex items-center gap-1.5"><X className="h-3 w-3 text-coral" /> Cross-site pixels</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2 border-t border-white/[0.09] bg-white/[0.018] p-4 sm:col-span-2 sm:flex-row lg:col-span-1 lg:flex-col lg:border-l lg:border-t-0">
            <button
              type="button"
              onClick={saveEssentialPreference}
              className="group inline-flex h-11 items-center justify-between gap-4 bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Continue securely
              <span className="grid h-6 w-6 place-items-center border border-ink/15 bg-ink/[0.07] transition group-hover:translate-x-0.5">
                <Check className="h-3.5 w-3.5" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowDetails((current) => !current)}
              aria-expanded={showDetails}
              className="inline-flex h-11 items-center justify-between border border-white/[0.12] bg-white/[0.025] px-4 text-xs font-medium text-white/58 transition hover:border-aqua/35 hover:bg-aqua/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua"
            >
              {showDetails ? "Close protocol" : "Inspect protocol"}
              <ChevronDown className={`h-3.5 w-3.5 text-aqua transition-transform duration-300 ${showDetails ? "rotate-180" : ""}`} />
            </button>
            <p className="mt-1 hidden font-mono text-[7px] uppercase leading-4 tracking-[0.14em] text-white/22 lg:block">
              Preference stored locally on this device
            </p>
          </div>
        </div>

        {showDetails ? (
          <div className="cookie-details relative grid gap-px border-t border-white/[0.09] bg-white/[0.09] sm:grid-cols-3">
            <CookieDetail
              icon={<LockKeyhole className="h-4 w-4" />}
              index="01"
              label="Essential"
              status="Always on"
              text="ck_session keeps authenticated dashboard and OAuth flows secure. It is not created for anonymous browsing."
              tone="mint"
            />
            <CookieDetail
              icon={<ShieldCheck className="h-4 w-4" />}
              index="02"
              label="Analytics cookies"
              status="Not used"
              text="Public request totals are aggregated on the server without a browser tracking identifier."
              tone="aqua"
            />
            <CookieDetail
              icon={<X className="h-4 w-4" />}
              index="03"
              label="Advertising"
              status="Never used"
              text="No ad profiles, retargeting pixels, or cross-site marketing cookies."
              tone="amber"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CookiePreferencesButton() {
  function openPreferences() {
    window.dispatchEvent(new Event(openPreferencesEvent));
  }

  return (
    <button
      type="button"
      onClick={openPreferences}
      className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/42 transition hover:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
    >
      Cookie settings
    </button>
  );
}

function CookieDetail({ icon, index, label, status, text, tone }: { icon: ReactNode; index: string; label: string; status: string; text: string; tone: "mint" | "aqua" | "amber" }) {
  const tones = {
    mint: "border-mint/20 bg-mint/[0.06] text-mint",
    aqua: "border-aqua/20 bg-aqua/[0.06] text-aqua",
    amber: "border-amber/20 bg-amber/[0.06] text-amber"
  } as const;

  return (
    <article className="group relative bg-[#080d0b] p-5 transition hover:bg-[#0a110e]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-8 w-8 place-items-center border ${tones[tone]}`}>{icon}</span>
          <span className="font-mono text-[8px] tracking-[0.18em] text-white/24">{index}</span>
        </div>
        <span className={`border px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.16em] ${tones[tone]}`}>{status}</span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-white">{label}</h3>
      <p className="mt-1.5 text-xs leading-5 text-white/48">{text}</p>
      <span className={`absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100 ${tones[tone].split(" ").at(-1)}`} />
    </article>
  );
}
