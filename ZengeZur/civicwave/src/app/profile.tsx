import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader, StatusShade } from '@/components/screen-header';
import { CircleButton, GroupCard, Icon, ListRow, PrimaryButton, Tap, ToggleRow } from '@/components/ui';
import { Palette, Space, Type } from '@/constants/design';
import { AvatarSource } from '@/constants/user';
import { keepPhoto } from '@/lib/photo';
import { Profile, useProfile } from '@/lib/profile';
import { useReports } from '@/lib/store';

/** Opened from the photo on the home screen: who you are, and where to go from here. */
export default function Menu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, update } = useProfile();
  const { reports } = useReports();
  const [editing, setEditing] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          left={<CircleButton icon="chevron-back" label="Geri" onPress={() => router.back()} />}
          title="Menyu"
        />

        <View style={{ padding: Space.lg, gap: Space.lg }}>
          <Animated.View entering={FadeInDown.duration(380)}>
            {editing ? <ProfileForm onDone={() => setEditing(false)} /> : <ProfileCard onEdit={() => setEditing(true)} />}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(380)}>
            <GroupCard>
              <ListRow
                icon="document-text-outline"
                label="Müraciətlərim"
                value={reports.length}
                valueColor={Palette.primary}
                onPress={() => router.push('/requests')}
              />
              <ListRow icon="trophy-outline" label="Reytinq" onPress={() => router.navigate('/leaderboard')} last />
            </GroupCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(380)}>
            <GroupCard>
              <ToggleRow
                icon="notifications-outline"
                label="Bildirişlər"
                value={profile.notifications}
                onChange={(v) => update({ notifications: v })}
                last
              />
            </GroupCard>
          </Animated.View>
        </View>
      </ScrollView>
      <StatusShade />
    </View>
  );
}

/* ---------------- the profile card ---------------- */

function ProfileCard({ onEdit }: { onEdit: () => void }) {
  const { profile, avatar, complete } = useProfile();
  const lines = [
    { icon: 'call-outline', text: profile.phone },
    { icon: 'mail-outline', text: profile.email },
    { icon: 'home-outline', text: profile.address },
  ].filter((l) => l.text.trim());

  return (
    <GroupCard>
      <View style={{ alignItems: 'center', padding: Space.xl, paddingTop: Space.xxl, gap: Space.md }}>
        <Portrait source={avatar} size={84} />
        <Text style={{ ...Type.h2, color: Palette.text, textAlign: 'center' }}>{profile.fullName}</Text>

        {complete ? (
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 2 }}>
            {lines.map((l) => (
              <View key={l.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name={l.icon} set="ion" size={18} color={Palette.primary} />
                <Text style={{ ...Type.body, color: Palette.text, flex: 1 }} numberOfLines={2}>
                  {l.text}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ ...Type.body, color: Palette.textMuted, textAlign: 'center', paddingHorizontal: Space.sm }}>
            Telefon və e-poçtunuzu əlavə edin ki, müraciətlərinizlə bağlı sizinlə əlaqə saxlamaq asan olsun.
          </Text>
        )}

        <PrimaryButton
          label={complete ? 'Profili redaktə et' : 'Profili qur'}
          icon={complete ? 'create-outline' : undefined}
          tone={complete ? 'quiet' : 'primary'}
          onPress={onEdit}
          style={{ alignSelf: 'stretch', marginTop: Space.sm }}
        />
      </View>
    </GroupCard>
  );
}

/* ---------------- editing ---------------- */

function ProfileForm({ onDone }: { onDone: () => void }) {
  const { profile, avatar, update } = useProfile();
  const [draft, setDraft] = useState<Profile>(profile);
  const set = (key: keyof Profile) => (text: string) => setDraft((d) => ({ ...d, [key]: text }));
  const shown: AvatarSource = draft.photoUri ? { uri: draft.photoUri } : avatar;

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = res.canceled ? null : res.assets?.[0];
    if (!asset) return;
    const uri = await keepPhoto(asset.uri, `profile-${Date.now()}`);
    setDraft((d) => ({ ...d, photoUri: uri }));
  };

  const save = () => {
    update({
      ...draft,
      fullName: draft.fullName.trim() || profile.fullName,
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
    });
    onDone();
  };

  return (
    <GroupCard>
      <View style={{ padding: Space.xl, gap: Space.lg }}>
        <View style={{ alignItems: 'center', gap: Space.sm }}>
          <Tap onPress={pickPhoto} scaleTo={0.94} accessibilityLabel="Şəkli dəyiş">
            <Portrait source={shown} size={92} />
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Palette.primary,
                borderWidth: 3,
                borderColor: Palette.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="camera" set="ion" size={15} color="#fff" />
            </View>
          </Tap>
          <Tap onPress={pickPhoto} scaleTo={0.96}>
            <Text style={{ ...Type.bodyStrong, color: Palette.primary }}>Şəkli dəyiş</Text>
          </Tap>
        </View>

        <View style={{ gap: Space.md }}>
          <Field
            label="Ad və soyad"
            value={draft.fullName}
            onChangeText={set('fullName')}
            placeholder="Ad Soyad"
            autoCapitalize="words"
            textContentType="name"
          />
          <Field
            label="Telefon"
            value={draft.phone}
            onChangeText={set('phone')}
            placeholder="+994 50 123 45 67"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
          <Field
            label="E-poçt"
            value={draft.email}
            onChangeText={set('email')}
            placeholder="ad@mail.az"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />
          <Field
            label="Ünvan"
            value={draft.address}
            onChangeText={set('address')}
            placeholder="Küçə, bina, mənzil"
            textContentType="fullStreetAddress"
          />
        </View>

        <View style={{ gap: Space.sm }}>
          <PrimaryButton label="Yadda saxla" icon="checkmark" onPress={save} />
          <PrimaryButton label="Ləğv et" tone="quiet" onPress={onDone} />
        </View>
        <Text style={{ ...Type.small, color: Palette.textFaint, textAlign: 'center' }}>
          Məlumatlar yalnız bu telefonda saxlanılır.
        </Text>
      </View>
    </GroupCard>
  );
}

function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...Type.small, color: Palette.textMuted }}>{label}</Text>
      <TextInput
        placeholderTextColor={Palette.textFaint}
        returnKeyType="done"
        style={{
          ...Type.row,
          color: Palette.text,
          backgroundColor: Palette.surfaceAlt,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
        {...input}
      />
    </View>
  );
}

function Portrait({ source, size }: { source: AvatarSource; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: 3,
        backgroundColor: Palette.surface,
        borderWidth: 2,
        borderColor: Palette.ring,
      }}>
      <Image source={source} style={{ flex: 1, borderRadius: size / 2 }} contentFit="cover" cachePolicy="memory" />
    </View>
  );
}
