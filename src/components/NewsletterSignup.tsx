"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter signup band on the Home page — the primary growth hook for
 * Legitfootball's newsletter. Posts to /api/subscribe, which forwards to
 * whatever provider is configured (see that route). Client-side email
 * validation plus loading / success / error states; nothing is faked —
 * the success state only shows after the route confirms the signup.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Couldn't sign you up right now.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Try again shortly.");
    }
  }

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[6px] border border-accent/25 bg-accent/[0.07] p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-accent text-accent-ink">
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
            <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        <div>
          <p className="font-jost text-[18px] font-semibold leading-tight">The Legitfootball newsletter</p>
          <p className="text-[12px] text-foreground/55">A better way to get your football news.</p>
        </div>
      </div>

      {status === "done" ? (
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-accent">
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          You&rsquo;re in — check your inbox to confirm.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2" noValidate>
          <div className="flex flex-col">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="you@email.com"
              aria-label="Email address"
              aria-invalid={status === "error"}
              className="w-[220px] max-w-full rounded-[3px] border border-foreground/15 bg-surface px-3.5 py-2.5 text-[13px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 max-[560px]:w-full"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            style={{ fontFamily: "var(--font-engraved)" }}
            className="rounded-[3px] bg-accent px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-accent-ink transition hover:brightness-105 disabled:opacity-60"
          >
            {status === "loading" ? "Signing up…" : "Subscribe"}
          </button>
          {status === "error" && message && (
            <p className="w-full text-[11.5px] text-bad" role="alert">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
