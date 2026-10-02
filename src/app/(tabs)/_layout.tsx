import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useCopiedLinkOffer } from '@/lib/clipboard';

export default function TabsLayout() {
  useCopiedLinkOffer();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="collections" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
