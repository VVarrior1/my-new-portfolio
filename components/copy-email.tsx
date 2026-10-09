"use client";

import { useState } from "react";
import { trackEvent } from "./site-analytics";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      trackEvent("email-copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <button type="button" onClick={copy} className="btn btn-quiet" aria-live="polite">
      {copied ? "Copied to clipboard" : "Copy address"}
    </button>
  );
}
