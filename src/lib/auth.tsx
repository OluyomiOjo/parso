import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

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
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }));
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
    return error ? "Google sign-in didn't finish. Try again." : null;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return null;
    return "Google sign-in didn't finish. Try again.";
  }
}

export async function signOut() {
  if (isGoogleConfigured) await GoogleSignin.signOut().catch(() => undefined);
  await supabase.auth.signOut();
}
