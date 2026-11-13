import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashGate } from '@/components/splash-gate';
import { Palette } from '@/constants/design';
import { ProfileProvider } from '@/lib/profile';
import { ReportsProvider } from '@/lib/store';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.bg }}>
      <SafeAreaProvider>
        <ProfileProvider>
          <ReportsProvider>
            <SplashGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Palette.bg },
                }}>
                <Stack.Screen name="(tabs)" />
                {/* "+" opens the request sheet; its own stack pushes the form inside it */}
                <Stack.Screen name="request" options={{ presentation: 'modal' }} />
                <Stack.Screen name="requests" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </SplashGate>
            <StatusBar style="dark" />
          </ReportsProvider>
        </ProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
