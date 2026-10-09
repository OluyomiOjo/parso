import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

// The four tabs under the floating tab bar (with the + beside it). Switching tabs glides with a soft shift.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'shift' }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="collections" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
