import { Tabs } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddButton } from '@/components/AddButton';
import { TabBar } from '@/components/TabBar';

// The four tabs, with the floating + drawn over them just above the tab bar.
export default function TabsLayout() {
  const [barHeight, setBarHeight] = useState(0);
  return (
    <View style={styles.fill}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} onHeight={setBarHeight} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="collections" />
        <Tabs.Screen name="you" />
      </Tabs>
      {barHeight ? <AddButton bottom={barHeight} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
