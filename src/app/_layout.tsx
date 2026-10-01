import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ShareHandler } from '@/components/ShareHandler';
import { AuthProvider, useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

// Keep the launch screen up until the saved session has loaded, so signed-in people never see the welcome screen flash.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Drop every cached list on sign-out, so the next account never sees the last one's saves.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') queryClient.clear();
});

function RootStack() {
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paste" options={{ presentation: 'modal' }} />
        <Stack.Screen name="save/[id]" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootStack />
          <ShareHandler />
        </AuthProvider>
      </QueryClientProvider>
    </ShareIntentProvider>
  );
}
