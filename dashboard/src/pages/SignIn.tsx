import { useState } from 'react';

import { supabase } from '../supabase';

// Admins sign in with a one-time link sent to their email. Anyone can ask for a link, but only emails in
// the admins table get any numbers back (checked by the admin-stats function).
export function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    setBusy(false);
    if (otpError) setError("Couldn't send the sign-in link. Check the email address and try again.");
    else setSent(true);
  };

  return (
    <div className="center">
      <form className="signin" onSubmit={send}>
        <div className="brand">
          <img src="/icon.png" alt="" />
          Parso dashboard
        </div>
        {sent ? (
          <p className="secondary">
            Check {email} for a sign-in link and open it on this device. It works once and expires in an hour.
          </p>
        ) : (
          <>
            <label className="secondary" htmlFor="email">
              Sign in with your admin email. We'll send you a link.
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="button" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
            {error ? <div className="error">{error}</div> : null}
          </>
        )}
      </form>
    </div>
  );
}
