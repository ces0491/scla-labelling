import { Resend } from "resend";

/**
 * Magic-link email send via Resend.
 *
 * Reuses SCLA's existing verified domain (scla.sheetsolved.com).
 * Falls back to printing the link to the dev console when
 * RESEND_API_KEY is unset -- useful during local development without
 * burning API quota.
 */

interface SendMagicLinkArgs {
  to: string;
  link: string;
  displayName: string | null;
}

export async function sendMagicLink(args: SendMagicLinkArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "labelling@scla.sheetsolved.com";

  if (!apiKey) {
    // Dev fallback: print the link rather than 500ing. The labeller
    // wouldn't get an email, but the developer who started the local
    // server sees the URL and can copy-paste it.
    console.warn(
      `[email] RESEND_API_KEY not set -- magic link (DEV FALLBACK):\n  ${args.link}`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  const greeting = args.displayName
    ? `Hi ${args.displayName},`
    : "Hi,";

  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: "Your SCLA labelling sign-in link",
    text: [
      greeting,
      "",
      "Click the link below to sign in to the SCLA labelling app:",
      args.link,
      "",
      "The link is good for 30 minutes and only works once. If you didn't",
      "request it, you can ignore this message.",
      "",
      "-- SCLA",
    ].join("\n"),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? "unknown error"}`);
  }
}
