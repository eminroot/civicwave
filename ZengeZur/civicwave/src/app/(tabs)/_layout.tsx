import { Tabs } from 'expo-router/js-tabs';
import { Easing } from 'react-native';

import { TabBar } from '@/components/tab-bar';
import { Palette } from '@/constants/design';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // A short slide and fade between tabs, run on the native thread.
        animation: 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 210, easing: Easing.out(Easing.cubic) },
        },
        sceneStyle: { backgroundColor: Palette.bg },
      }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="leaderboard" />
    </Tabs>
  );
}
