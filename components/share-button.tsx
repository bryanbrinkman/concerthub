"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Copies a URL (or the current page) to the clipboard. */
export function ShareButton({
  path,
  label = "Share",
  size = "sm",
  variant = "outline",
}: {
  /** Absolute path to share; defaults to the current page. */
  path?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    const url = path ? `${window.location.origin}${path}` : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — show the URL so it can be copied by hand.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy}>
      {copied ? <Check className="text-emerald-400" /> : <Share2 />}
      {copied ? "Copied!" : label}
    </Button>
  );
}
