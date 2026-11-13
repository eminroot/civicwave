import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/screen-header';
import { Sparkle } from '@/components/sparkle';
import { CircleButton, GroupCard, Icon, ListRow, SectionTitle, Tap } from '@/components/ui';
import { ALL_SERVICES, SERVICE_SECTIONS, Service } from '@/constants/categories';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/design';

export default function RequestCatalog() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('az');
    if (!q) return null;
    return ALL_SERVICES.filter(
      (s) => s.title.toLocaleLowerCase('az').includes(q) || s.keywords.toLocaleLowerCase('az').includes(q)
    );
  }, [query]);

  const open = (s: Service) =>
    router.push({ pathname: '/request/new', params: { category: s.categoryId, service: s.id } });
  const openAi = () => router.push({ pathname: '/request/new', params: { mode: 'ai' } });

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          topInset={Platform.OS !== 'ios'}
          left={<CircleButton icon="close" label="Bağla" onPress={() => router.back()} />}
          title="Yeni müraciət"
        />

        <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.xl, gap: Space.lg }}>
          <Animated.View entering={FadeInDown.duration(360)}>
            <Tap onPress={openAi} scaleTo={0.97}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  height: 68,
                  paddingHorizontal: 20,
                  borderRadius: Radius.pill,
                  backgroundColor: Palette.surface,
                  ...Shadow.card,
                }}>
                <Sparkle size={34} />
                <Text style={{ ...Type.row, fontSize: 18, color: Palette.text, flex: 1 }}>AI ilə Ağıllı Seçim</Text>
                <Icon name="camera-outline" set="ion" size={22} color={Palette.primary} />
              </View>
            </Tap>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(50).duration(360)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              height: 62,
              paddingHorizontal: 20,
              borderRadius: Radius.pill,
              borderWidth: 1.5,
              borderColor: Palette.borderStrong,
            }}>
            <Icon name="search" set="ion" size={22} color={Palette.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Müraciət növünü axtarın"
              placeholderTextColor={Palette.textFaint}
              returnKeyType="search"
              style={{ ...Type.row, fontSize: 18, color: Palette.text, flex: 1, padding: 0 }}
            />
            {query.length > 0 && (
              <Tap onPress={() => setQuery('')} haptic={false} scaleTo={0.9} accessibilityLabel="Təmizlə">
                <Icon name="close-circle" set="ion" size={21} color={Palette.textFaint} />
              </Tap>
            )}
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: Space.lg }}>
          {results ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <SectionTitle first>{results.length ? `Tapıldı: ${results.length}` : 'Tapılmadı'}</SectionTitle>
              {results.length ? (
                <GroupCard>
                  {results.map((s, i) => (
                    <ListRow
                      key={s.id}
                      icon={s.icon}
                      iconSet={s.iconSet}
                      label={s.title}
                      onPress={() => open(s)}
                      last={i === results.length - 1}
                    />
                  ))}
                </GroupCard>
              ) : (
                <GroupCard>
                  <ListRow icon="sparkles-outline" label="AI ilə Ağıllı Seçim" onPress={openAi} last />
                </GroupCard>
              )}
            </Animated.View>
          ) : (
            SERVICE_SECTIONS.map((section, si) => (
              <Animated.View key={section.title} entering={FadeInDown.delay(90 + si * 50).duration(380)}>
                <SectionTitle>{section.title}</SectionTitle>
                <GroupCard>
                  {section.data.map((s, i) => (
                    <ListRow
                      key={s.id}
                      icon={s.icon}
                      iconSet={s.iconSet}
                      label={s.title}
                      onPress={() => open(s)}
                      last={i === section.data.length - 1}
                    />
                  ))}
                </GroupCard>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
