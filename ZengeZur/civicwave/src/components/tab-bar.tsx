import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { Palette, Shadow, Type } from '@/constants/design';

type TabDef = { label: string; icon: string; iconActive: string };

const TABS: Record<string, TabDef> = {
  index: { label: 'Ana səhifə', icon: 'home-outline', iconActive: 'home' },
  map: { label: 'Xəritə', icon: 'map-outline', iconActive: 'map' },
  leaderboard: { label: 'Reytinq', icon: 'trophy-outline', iconActive: 'trophy' },
};

/** The last slot opens the profile and menu screen, which sits above the tabs. */
const PROFILE_TAB: TabDef = { label: 'Profil', icon: 'person-circle-outline', iconActive: 'person-circle' };

/** How far the "+" button rises above the bar. */
export const FAB_RISE = 36;

/** Height of the tab bar including the bottom safe area, for content and floating cards. */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + 62;
}

function TabItem({ def, focused, onPress }: { def: TabDef; focused: boolean; onPress: () => void }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    if (focused) {
      lift.value = withSequence(withTiming(-3, { duration: 120 }), withSpring(0, { damping: 9, stiffness: 260 }));
    }
  }, [focused, lift]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const color = focused ? Palette.primary : Palette.textFaint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4, gap: 3 }}>
      <Animated.View style={iconStyle}>
        <Icon name={focused ? def.iconActive : def.icon} set="ion" size={25} color={color} />
      </Animated.View>
      <Text style={{ ...Type.tiny, fontSize: 11, letterSpacing: 0, color: focused ? Palette.primary : Palette.textMuted }}>
        {def.label}
      </Text>
    </Pressable>
  );
}

/** The raised "+" in the middle of the bar: opens a new request. */
function RequestButton() {
  const router = useRouter();
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Yeni müraciət"
        onPressIn={() => {
          s.value = withSpring(0.9, { damping: 16, stiffness: 340 });
        }}
        onPressOut={() => {
          s.value = withSpring(1, { damping: 10, stiffness: 240 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/request');
        }}
        style={{ marginTop: -34, alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: Palette.primary,
              borderWidth: 5,
              borderColor: Palette.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...Shadow.fab,
            },
            style,
          ]}>
          <Icon name="add" set="ion" size={36} color="#fff" />
        </Animated.View>
        <Text style={{ ...Type.tiny, fontSize: 11, letterSpacing: 0, color: Palette.textMuted, marginTop: 2 }}>
          Müraciət
        </Text>
      </Pressable>
    </View>
  );
}

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = state.routes.map((route, index) => {
    const def = TABS[route.name];
    if (!def) return null;
    const focused = state.index === index;
    const onPress = () => {
      Haptics.selectionAsync().catch(() => {});
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return <TabItem key={route.key} def={def} focused={focused} onPress={onPress} />;
  });

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 6,
        backgroundColor: Palette.surface,
        borderTopWidth: 1,
        borderTopColor: Palette.border,
        ...Shadow.bar,
      }}>
      {items.slice(0, 2)}
      <RequestButton />
      {items.slice(2)}
      <TabItem
        def={PROFILE_TAB}
        focused={false}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          router.push('/profile');
        }}
      />
    </View>
  );
}
