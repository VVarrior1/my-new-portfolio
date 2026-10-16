"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "./site-analytics";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      trackEvent("email-copy");
      toast.success("Email address copied", { description: email });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <button type="button" onClick={copy} className="btn btn-quiet">
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}
