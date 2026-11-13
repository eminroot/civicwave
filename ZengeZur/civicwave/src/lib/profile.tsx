import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { AvatarSource, USER } from '@/constants/user';

/** What the citizen says about themselves. Kept only on this phone. */
export type Profile = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  /** A photo picked on this phone; the bundled portrait while unset. */
  photoUri?: string;
  notifications: boolean;
};

const STORAGE_KEY = 'civicwave.profile.v1';
const DEFAULT: Profile = { fullName: USER.fullName, phone: '', email: '', address: '', notifications: true };

type Ctx = {
  profile: Profile;
  avatar: AvatarSource;
  /** true once a phone number or an e-mail is filled in */
  complete: boolean;
  update: (patch: Partial<Profile>) => void;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProfile((p) => ({ ...p, ...JSON.parse(raw) }));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  }, [profile, ready]);

  const update = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);

  const value = useMemo<Ctx>(
    () => ({
      profile,
      avatar: profile.photoUri ? { uri: profile.photoUri } : USER.avatar,
      complete: Boolean(profile.phone.trim() || profile.email.trim()),
      update,
    }),
    [profile, update]
  );

  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): Ctx {
  const ctx = use(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
