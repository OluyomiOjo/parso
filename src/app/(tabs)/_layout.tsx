import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

// The four tabs under the floating tab bar (with the + beside it). Tabs switch instantly: the shift animation
// left pages inside the Collections tab blank (owner report, build 14).
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="collections" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
