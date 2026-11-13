import { Stack } from 'expo-router';

import { Palette } from '@/constants/design';

export const unstable_settings = {
  // Opening the form directly still leaves the list underneath, so "back" has a place to go.
  anchor: 'index',
};

export default function RequestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.bg },
      }}
    />
  );
}
