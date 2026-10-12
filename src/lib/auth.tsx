import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { storedSession, supabase } from './supabase';
import { track } from './track';

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleConfigured = Boolean(googleIosClientId && googleWebClientId);

if (isGoogleConfigured) {
  GoogleSignin.configure({ iosClientId: googleIosClientId, webClientId: googleWebClientId });
}

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    let settled = false;
    // The sign-in kept on the phone opens Parso straight away, online or not; supabase-js's answer follows.
    void storedSession().then((stored) => {
      if (!settled && stored) setState({ session: stored, loading: false });
    });
    supabase.auth.getSession().then(({ data, error }) => {
      settled = true;
      // No answer from the server (offline) is not a sign-out: keep the phone's sign-in until it can be renewed.
      if (!data.session && error)
        return void storedSession().then((stored) => setState({ session: stored, loading: false }));
      setState({ session: data.session, loading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Offline, the first event can report no sign-in for the same reason; only a real sign-out clears it.
      if (!session && event !== 'SIGNED_OUT') return;
      settled = true;
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useSession() {
  return useContext(AuthContext);
}

// Each sign-in returns an error message to show, or null when it worked or the person cancelled.
export type SignInResult = string | null;

export async function signInWithApple(): Promise<SignInResult> {
  try {
    // Apple gets the hashed nonce; Supabase checks the raw one against it, so a stolen token can't be replayed.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return "Apple sign-in didn't finish. Try again.";

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return "Apple sign-in didn't finish. Try again.";

    track('signed_in');
    // Apple shares the name only on the first sign-in, so keep it now.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
    if (fullName) await supabase.auth.updateUser({ data: { full_name: fullName } });
    return null;
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return null;
    return "Apple sign-in didn't finish. Try again.";
  }
}

export async function signInWithGoogle(): Promise<SignInResult> {
  if (!isGoogleConfigured) return "Google sign-in isn't set up yet. Use Apple for now.";
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return null;
    const idToken = response.data.idToken;
    if (!idToken) return "Google sign-in didn't finish. Try again.";

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return "Google sign-in didn't finish. Try again.";
    track('signed_in');
    return null;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return null;
    return "Google sign-in didn't finish. Try again.";
  }
}

export async function signOut() {
  if (isGoogleConfigured) await GoogleSignin.signOut().catch(() => undefined);
  await supabase.auth.signOut();
}

export const DELETE_ACCOUNT_FAILED = "Couldn't delete your account. Check your connection and try again.";

// Removes the account and everything in it (saves, collections, pictures) on the server, then forgets the
// session on this phone. Apple requires apps with sign-in to offer this.
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw new Error(DELETE_ACCOUNT_FAILED);
  if (isGoogleConfigured) await GoogleSignin.signOut().catch(() => undefined);
  await supabase.auth.signOut({ scope: 'local' }); // the account no longer exists on the server
}
