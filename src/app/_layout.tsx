import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ShareHandler } from '@/components/ShareHandler';
import { AuthProvider, useSession } from '@/lib/auth';
import { useCopiedLinkOffer } from '@/lib/clipboard';
import { IntroProvider, useIntro } from '@/lib/intro';
import { usePurchasesAccount } from '@/lib/pro';
import { configureNotifications, useReminderSync, useReminderTaps } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { useOpenTracking } from '@/lib/track';
import { useWeeklyNotification } from '@/lib/weekNotification';
import { addMenu, colors, radius } from '@/theme';

// Keep the launch screen up until the saved session has loaded, so signed-in people never see the welcome screen flash.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
configureNotifications();

// Drop every cached list on sign-out, so the next account never sees the last one's saves.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') queryClient.clear();
});

function RootStack() {
  const { session, loading: sessionLoading } = useSession();
  const { seen: introSeen } = useIntro();
  const loading = sessionLoading || introSeen === null;
  useOpenTracking(session !== null);
  useCopiedLinkOffer(session !== null && !loading);
  usePurchasesAccount();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    // Pages slide in from the right and go back with a swipe from anywhere on the page (owner decision, step 11).
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="add-menu"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: false, // a close button instead, like Pinterest's sheet
            sheetCornerRadius: addMenu.cornerRadius,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="copied-link"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: radius.panel,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen name="save/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="collection-rename/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="note/[id]" />
        <Stack.Screen name="photo/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="week" />
        <Stack.Screen
          name="reminder-time/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9],
            sheetGrabberVisible: true,
            sheetCornerRadius: radius.panel,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen name="item-edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="upgrade"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9],
            sheetGrabberVisible: true,
            sheetCornerRadius: radius.panel,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={session === null && !introSeen}>
        <Stack.Screen name="intro" />
      </Stack.Protected>
      <Stack.Protected guard={session === null && introSeen === true}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}

// Keeps the phone's reminder notifications in step with the saves, schedules the Sunday weekly update, and opens
// what a notification is about when it's tapped.
function Reminders() {
  useReminderSync();
  useWeeklyNotification();
  useReminderTaps();
  return null;
}

export default function RootLayout() {
  return (
    // Gesture root: press-and-hold dragging (rearranging collections) needs it around the whole app.
    <GestureHandlerRootView style={styles.root}>
      <ShareIntentProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <IntroProvider>
              <StatusBar style="dark" />
              <RootStack />
              <ShareHandler />
              <Reminders />
            </IntroProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
