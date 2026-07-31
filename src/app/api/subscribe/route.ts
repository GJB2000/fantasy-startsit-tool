const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter signup endpoint for the Home page's signup band.
 *
 * Deliberately provider-agnostic: it forwards the email to whatever
 * newsletter service is configured via the NEWSLETTER_FORM_ENDPOINT env
 * var (a plain POST URL — the shape most providers' embedded/hosted form
 * actions and simple APIs accept: Beehiiv, ConvertKit, Buttondown,
 * Mailchimp, etc.). Set NEWSLETTER_FORM_ENDPOINT in .env.local /
 * Vercel project env vars to connect it — same "never commit a secret"
 * discipline as SPORTSDATA_API_KEY.
 *
 * Until it's configured, this returns an honest "not connected" message
 * rather than pretending to subscribe someone and silently dropping their
 * email — this app's standing "no fake data / show a clear message"
 * rule, applied to a write path.
 */
export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const endpoint = process.env.NEWSLETTER_FORM_ENDPOINT;
  if (!endpoint) {
    return Response.json(
      { ok: false, error: "Newsletter signup isn't connected yet — check back soon." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      return Response.json({ ok: false, error: "Couldn't sign you up right now. Try again shortly." }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Couldn't reach the newsletter service." }, { status: 502 });
  }
}
