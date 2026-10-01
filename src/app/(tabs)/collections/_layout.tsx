import { Stack } from 'expo-router';

import { colors } from '@/theme';

// A stack inside the Collections tab, so an open collection keeps the tab bar.
export default function CollectionsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}

// Opening a collection from My Parsos still leaves the list underneath, so back goes there.
export const unstable_settings = { initialRouteName: 'index' };
