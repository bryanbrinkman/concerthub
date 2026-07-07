/**
 * Minimal email sending via the Resend REST API (no SDK).
 * No-ops silently when RESEND_API_KEY is unset — email is optional.
 *
 * Setup: create a free key at https://resend.com. Without a verified
 * domain, Resend's sandbox sender only delivers to your own account
 * email — verify a domain and set RESEND_FROM to send to anyone.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Concert Collect <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.warn(`[email] send failed: HTTP ${res.status}`);
    }
  } catch (error) {
    console.warn("[email] send failed:", error);
  }
}
