// The store reviewers' way in (owner decision after build 23): Apple's and Google's reviewers sign in to the demo
// account, review@parso.ai, with a fixed code given in the review notes, since they can't read its inbox. Only that
// address is accepted; the code lives in the REVIEW_CODE secret. A right code gets back a one-time sign-in code for
// the app's usual email sign-in step; nothing else is ever returned.
import { createClient } from 'npm:@supabase/supabase-js@2';

const REVIEW_EMAIL = 'review@parso.ai';
const json = (body: unknown, status = 200) => Response.json(body, { status });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Compares without leaking, through timing, how much of the code was right.
function sameCode(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const expected = Deno.env.get('REVIEW_CODE');
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const code = String(body.code ?? '').trim();
  if (!expected || email !== REVIEW_EMAIL || !sameCode(code, expected)) {
    await sleep(1000); // slows guessing
    return json({ error: "That code didn't work." }, 401);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  let link = await admin.auth.admin.generateLink({ type: 'magiclink', email: REVIEW_EMAIL });
  if (link.error) {
    // First use: the demo account is created, already confirmed.
    await admin.auth.admin.createUser({ email: REVIEW_EMAIL, email_confirm: true });
    link = await admin.auth.admin.generateLink({ type: 'magiclink', email: REVIEW_EMAIL });
  }
  const otp = link.data?.properties?.email_otp;
  if (link.error || !otp) {
    console.error('review-sign-in: no code', link.error?.message);
    return json({ error: "Couldn't sign in. Try again." }, 500);
  }
  return json({ code: otp });
});
