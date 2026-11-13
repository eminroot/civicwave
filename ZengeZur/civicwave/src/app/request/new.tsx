import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapPreview } from '@/components/district-map';
import { Float } from '@/components/fx';
import { ScanOverlay } from '@/components/scan-overlay';
import { ScreenHeader } from '@/components/screen-header';
import {
  CircleButton,
  Divider,
  GroupCard,
  Icon,
  PrimaryButton,
  RingIcon,
  SeverityTag,
  Spinner,
  Tap,
  ToggleRow,
} from '@/components/ui';
import { ART } from '@/constants/art';
import {
  ALL_SERVICES,
  CATEGORY_ICON,
  CATEGORY_NAMES,
  CategoryId,
  DEPARTMENTS,
  IconSet,
  SEVERITY_POINTS,
} from '@/constants/categories';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/design';
import { submitFeedback } from '@/lib/api';
import { AIAnalysis, classifyIssue, refineClassification } from '@/lib/ai';
import { getCurrentPlace } from '@/lib/location';
import { keepPhoto, Photo, preparePhoto } from '@/lib/photo';
import { useProfile } from '@/lib/profile';
import { XATAI, useReports } from '@/lib/store';

type Phase = 'empty' | 'preparing' | 'analyzing' | 'clarify' | 'ready';
type Place = { lat: number; lng: number; address: string };

const SHEET = Platform.OS === 'ios'; // on iOS the form lives in a sheet below the status bar

export default function NewReport() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { addReport } = useReports();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ mode?: string; category?: string; service?: string }>();
  const lockedCategory = (params.category as CategoryId) || null;
  const service = ALL_SERVICES.find((s) => s.id === params.service);
  const isAi = params.mode === 'ai' || !lockedCategory;
  const title = isAi ? 'Ağıllı seçim' : (service?.title ?? CATEGORY_NAMES[lockedCategory!]);
  const glyph: { name: string; set: IconSet } = isAi
    ? { name: 'sparkles-outline', set: 'ion' }
    : service
      ? { name: service.icon, set: service.iconSet }
      : { name: CATEGORY_ICON[lockedCategory!].icon, set: CATEGORY_ICON[lockedCategory!].iconSet };

  const [phase, setPhase] = useState<Phase>('empty');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [withName, setWithName] = useState(true);
  const [place, setPlace] = useState<Place | null>(null);
  const [locating, setLocating] = useState(true);
  const [editingAddress, setEditingAddress] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [banner, setBanner] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      // Never block the form on the location: after 15 s the district centre is used
      // and the citizen can type the address.
      const found = await Promise.race([
        getCurrentPlace(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15_000)),
      ]);
      setPlace(found);
    } catch {
      setPlace((p) => p ?? { ...XATAI, address: 'Xətai rayonu' });
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    locate();
    // The map preview is created after the screen has slid in, so the slide stays smooth.
    const t = setTimeout(() => setShowMap(true), 380);
    return () => clearTimeout(t);
  }, [locate]);

  const lockCategory = useCallback(
    (a: AIAnalysis) => {
      if (!lockedCategory) return a;
      return {
        ...a,
        categoryId: lockedCategory,
        categoryName: CATEGORY_NAMES[lockedCategory],
        department: DEPARTMENTS[lockedCategory],
      };
    },
    [lockedCategory]
  );

  const analyze = useCallback(
    async (p: Photo, noteText: string) => {
      setPhase('analyzing');
      setError(null);
      try {
        const result = lockCategory(await classifyIssue(p.base64, p.mime, noteText.trim() || undefined));
        if (!result.imageQualityOk) {
          setPhoto(null);
          setAnalysis(null);
          setPhase('empty');
          setError(result.retakeReason || 'Şəkil aydın deyil. Yenidən çəkin.');
          return;
        }
        setAnalysis(result);
        if (result.confidence < 85 && result.clarifyingQuestions.length > 0) {
          setAnswers(result.clarifyingQuestions.map(() => ''));
          setPhase('clarify');
        } else {
          setPhase('ready');
        }
      } catch (e) {
        // The report can still go out: the officers check the category anyway.
        const said = (e as Error)?.message || '';
        const cat = lockedCategory || 'roads';
        setAnalysis({
          imageQualityOk: true,
          categoryId: cat,
          categoryName: CATEGORY_NAMES[cat],
          severity: 'medium',
          severityReason: '',
          costMin: 0,
          costMax: 0,
          department: DEPARTMENTS[cat],
          confidence: 0,
          summary: '',
          clarifyingQuestions: [],
        });
        setError(
          `${/[əğıöüşçİ]/i.test(said) ? said.replace(/[.!]?$/, '.') : 'AI cavab vermədi.'} Kateqoriyanı özünüz yoxlayın.`
        );
        setPhase('ready');
      }
    },
    [lockCategory, lockedCategory]
  );

  const pick = useCallback(
    async (source: 'camera' | 'library') => {
      setError(null);
      try {
        if (source === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            setError('Kameraya icazə verilmədi');
            return;
          }
        }
        const res =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ quality: 0.85, mediaTypes: 'images' })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: 'images' });
        if (res.canceled || !res.assets?.[0]) return;
        const asset = res.assets[0];
        // Show the photo at once; shrink it for the AI and the upload meanwhile.
        setAnalysis(null);
        setPhoto({ uri: asset.uri, base64: '', mime: asset.mimeType || 'image/jpeg' });
        setPhase('preparing');
        const prepared = await preparePhoto(asset);
        setPhoto(prepared);
        analyze(prepared, note);
      } catch (e: any) {
        setPhoto(null);
        setPhase('empty');
        setError(e?.message || 'Şəkil seçilmədi');
      }
    },
    [analyze, note]
  );

  const submitAnswers = useCallback(async () => {
    if (!photo || !analysis) return;
    setPhase('analyzing');
    try {
      const qa = analysis.clarifyingQuestions.map((q, i) => ({
        question: q,
        answer: answers[i]?.trim() || 'Bilmirəm',
      }));
      setAnalysis(lockCategory(await refineClassification(photo.base64, photo.mime, qa, note.trim() || undefined)));
    } catch {
      // keep the first result
    }
    setPhase('ready');
  }, [photo, analysis, answers, note, lockCategory]);

  const submit = useCallback(async () => {
    if (!analysis || !photo || !place || submitting) return;
    setSubmitting(true);
    const id = `r-${Date.now()}`;
    const photoUri = await keepPhoto(photo.uri, id);
    const fullNote = [note.trim(), recurring ? 'Təkrarlanan problem' : ''].filter(Boolean).join('\n');
    addReport({
      id,
      categoryId: analysis.categoryId,
      categoryName: analysis.categoryName,
      title: analysis.summary || analysis.categoryName,
      severity: analysis.severity,
      department: analysis.department,
      costMin: analysis.costMin,
      costMax: analysis.costMax,
      confidence: analysis.confidence,
      note: fullNote || undefined,
      photoUri,
      photoMime: photo.mime,
      address: place.address.trim() || 'Xətai rayonu',
      lat: place.lat,
      lng: place.lng,
      firstReporter: true,
      reporter: withName ? profile.fullName : 'Anonim',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSubmitting(false);
    setDoneId(id);
  }, [analysis, photo, place, submitting, note, recurring, withName, addReport, profile.fullName]);

  if (doneId) {
    return (
      <Done
        reportId={doneId}
        department={analysis?.department ?? ''}
        category={analysis?.categoryName ?? ''}
        points={analysis ? SEVERITY_POINTS[analysis.severity] : 0}
        onOpenList={() => router.replace('/requests')}
        onClose={() => {
          // Close the whole sheet and land on the tab it was opened from.
          const sheet = navigation.getParent();
          if (sheet?.canGoBack()) sheet.goBack();
          else router.dismissTo('/');
        }}
      />
    );
  }

  const busy = phase === 'preparing' || phase === 'analyzing';
  const cta =
    phase === 'empty'
      ? { label: 'Şəkil çəkin', icon: 'camera', onPress: () => pick('camera'), disabled: false }
      : busy
        ? { label: 'AI yoxlayır', icon: undefined, onPress: undefined, disabled: false }
        : phase === 'clarify'
          ? {
              label: 'Cavabı göndər',
              icon: 'arrow-forward',
              onPress: submitAnswers,
              disabled: !answers.some((a) => a.trim()),
            }
          : { label: 'Göndər', icon: 'paper-plane', onPress: submit, disabled: locating || !place };

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <ScreenHeader
            topInset={!SHEET}
            left={<CircleButton icon="chevron-back" label="Geri" onPress={() => router.back()} />}
            title={title}
            backdrop={{ kind: 'glyph', name: glyph.name, set: glyph.set }}
          />

          {banner && (
            <Animated.View
              exiting={FadeOut.duration(160)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: Space.lg,
                paddingTop: Space.lg,
              }}>
              <Pressable
                onPress={() => Linking.openURL('tel:112').catch(() => {})}
                style={{
                  flex: 1,
                  backgroundColor: Palette.alert,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  paddingHorizontal: Space.lg,
                  paddingVertical: 13,
                }}>
                <Text style={{ ...Type.bodyStrong, fontSize: 16, lineHeight: 21, color: '#fff' }}>
                  Həyat üçün təhlükə varsa 112-yə zəng edin.
                </Text>
              </Pressable>
              <CircleButton icon="close" size={34} label="Gizlət" onPress={() => setBanner(false)} />
            </Animated.View>
          )}

          <View style={{ padding: Space.lg, gap: Space.lg }}>
            <WhereCard
              place={place}
              locating={locating}
              showMap={showMap}
              editing={editingAddress}
              onToggleEdit={() => {
                setPlace((p) => p ?? { ...XATAI, address: '' });
                setEditingAddress((v) => !v);
              }}
              onChangeAddress={(address) => setPlace((p) => (p ? { ...p, address } : p))}
              onLocate={locate}
            />

            <GroupCard>
              <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.lg }}>
                <Text style={{ ...Type.bodyStrong, color: Palette.text }}>Ətraflı</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Problem barədə qısa yazın"
                  placeholderTextColor={Palette.textFaint}
                  multiline
                  style={{
                    ...Type.row,
                    color: Palette.text,
                    minHeight: 84,
                    textAlignVertical: 'top',
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingHorizontal: 0,
                  }}
                />
              </View>

              {photo ? (
                <Animated.View
                  entering={FadeIn.duration(250)}
                  style={{ marginHorizontal: Space.md, height: 220, borderRadius: 18, overflow: 'hidden' }}>
                  <Image source={{ uri: photo.uri }} style={{ flex: 1 }} contentFit="cover" />
                  {busy && <ScanOverlay height={220} />}
                  {!busy && (
                    <View style={{ position: 'absolute', top: 10, right: 10 }}>
                      <CircleButton
                        icon="close"
                        size={34}
                        bg="rgba(255,255,255,0.92)"
                        label="Şəkli sil"
                        onPress={() => {
                          setPhoto(null);
                          setAnalysis(null);
                          setPhase('empty');
                        }}
                      />
                    </View>
                  )}
                </Animated.View>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 26,
                  margin: Space.md,
                  paddingHorizontal: Space.lg,
                  height: 72,
                  borderRadius: 18,
                  backgroundColor: Palette.surfaceAlt,
                }}>
                <Tap onPress={() => pick('camera')} disabled={busy} scaleTo={0.88} accessibilityLabel="Kamera">
                  <Icon name="camera-outline" set="ion" size={38} color={Palette.primary} />
                </Tap>
                <Tap onPress={() => pick('library')} disabled={busy} scaleTo={0.88} accessibilityLabel="Qalereya">
                  <Icon name="image-outline" set="ion" size={36} color={Palette.primary} />
                </Tap>
                <View style={{ flex: 1 }} />
                {busy ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Spinner size={16} color={Palette.ai1} track={Palette.ring} />
                    <Text style={{ ...Type.small, color: Palette.textMuted }}>AI yoxlayır</Text>
                  </View>
                ) : !photo ? (
                  <Text style={{ ...Type.small, color: Palette.textMuted }}>Şəkil vacibdir</Text>
                ) : null}
              </View>

              {error ? (
                <Animated.View
                  entering={FadeIn}
                  style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: Space.lg, paddingBottom: Space.lg }}>
                  <Icon name="alert-circle" set="ion" size={18} color={Palette.alert} />
                  <Text style={{ ...Type.small, color: Palette.alert, flex: 1 }}>{error}</Text>
                </Animated.View>
              ) : null}
            </GroupCard>

            {analysis && (phase === 'ready' || phase === 'clarify') ? <Analysis analysis={analysis} /> : null}

            {analysis && phase === 'clarify' ? (
              <Animated.View entering={FadeInDown.duration(380)}>
                <GroupCard>
                  <View style={{ padding: Space.lg, gap: Space.lg }}>
                    <Text style={{ ...Type.bodyStrong, color: Palette.text }}>Dəqiqləşdirək</Text>
                    {analysis.clarifyingQuestions.map((q, i) => (
                      <View key={i} style={{ gap: 8 }}>
                        <Text style={{ ...Type.row, color: Palette.text }}>{q}</Text>
                        <TextInput
                          value={answers[i]}
                          onChangeText={(t) => setAnswers((prev) => prev.map((a, j) => (j === i ? t : a)))}
                          placeholder="Cavabınız"
                          placeholderTextColor={Palette.textFaint}
                          multiline
                          style={{
                            ...Type.body,
                            fontSize: 16,
                            color: Palette.text,
                            backgroundColor: Palette.surfaceAlt,
                            borderRadius: 14,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            minHeight: 50,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </GroupCard>
              </Animated.View>
            ) : null}

            <GroupCard>
              <ToggleRow label="Təkrarlanan problem" value={recurring} onChange={setRecurring} />
              <ToggleRow label="Adımla göndər" value={withName} onChange={setWithName} last />
            </GroupCard>
          </View>
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: Space.xxl,
            right: Space.xxl,
            bottom: Math.max(insets.bottom, 16) + 4,
          }}>
          <PrimaryButton
            label={cta.label}
            icon={cta.icon}
            loading={busy || submitting}
            disabled={cta.disabled}
            onPress={cta.onPress}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function WhereCard({
  place,
  locating,
  showMap,
  editing,
  onToggleEdit,
  onChangeAddress,
  onLocate,
}: {
  place: Place | null;
  locating: boolean;
  showMap: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  onChangeAddress: (a: string) => void;
  onLocate: () => void;
}) {
  return (
    <GroupCard>
      <View style={{ backgroundColor: Palette.band, paddingHorizontal: Space.xl, paddingTop: 18, height: 96 }}>
        <Text style={{ ...Type.h2, color: Palette.text }}>Problem harada?</Text>
      </View>
      <View style={{ height: 150, backgroundColor: Palette.bgDeep }}>
        {showMap && place ? (
          <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
            <MapPreview lat={place.lat} lng={place.lng} />
          </Animated.View>
        ) : null}
      </View>

      <View
        style={{
          position: 'absolute',
          top: 58,
          left: Space.lg,
          right: Space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 68,
          paddingRight: 8,
          borderRadius: 34,
          backgroundColor: Palette.surface,
          ...Shadow.raised,
        }}>
        <Pressable
          onPress={onToggleEdit}
          accessibilityRole="button"
          accessibilityLabel="Ünvanı düzəlt"
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingVertical: 10 }}>
          {locating ? (
            <Spinner size={20} color={Palette.primary} track={Palette.ring} />
          ) : (
            <Icon name="location-outline" set="ion" size={24} color={Palette.primary} />
          )}
          <Text style={{ ...Type.row, color: place && !locating ? Palette.text : Palette.textFaint, flex: 1 }} numberOfLines={2}>
            {locating ? 'Məkan təyin olunur' : (place?.address ?? 'Ünvan')}
          </Text>
        </Pressable>
        <CircleButton icon="locate-outline" size={42} color={Palette.primary} label="Yenidən təyin et" onPress={onLocate} />
      </View>

      {editing && place ? (
        <Animated.View entering={FadeInDown.duration(220)}>
          <View style={{ padding: Space.lg, gap: 8 }}>
            <Text style={{ ...Type.small, color: Palette.textMuted }}>Ünvan</Text>
            <TextInput
              value={place.address}
              onChangeText={onChangeAddress}
              autoFocus
              placeholder="Küçə, bina"
              placeholderTextColor={Palette.textFaint}
              onSubmitEditing={onToggleEdit}
              returnKeyType="done"
              style={{
                ...Type.row,
                color: Palette.text,
                backgroundColor: Palette.surfaceAlt,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            />
          </View>
        </Animated.View>
      ) : null}
    </GroupCard>
  );
}

function Analysis({ analysis }: { analysis: AIAnalysis }) {
  const cat = CATEGORY_ICON[analysis.categoryId];
  return (
    <Animated.View entering={FadeInDown.duration(380)}>
      <GroupCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: Space.lg }}>
          <RingIcon name={cat.icon} set={cat.iconSet} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...Type.small, color: Palette.textMuted }}>AI təyin etdi</Text>
            <Text style={{ ...Type.h2, color: Palette.text }}>{analysis.categoryName}</Text>
          </View>
          <SeverityTag severity={analysis.severity} />
        </View>
        {analysis.summary ? (
          <Text style={{ ...Type.body, color: Palette.textMuted, paddingHorizontal: Space.lg, marginTop: -4, paddingBottom: Space.lg }}>
            {analysis.summary}
          </Text>
        ) : null}
        <Divider inset={Space.lg} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Space.lg, minHeight: 60 }}>
          <Text style={{ ...Type.body, color: Palette.textMuted }}>Qurum</Text>
          <Text style={{ ...Type.bodyStrong, color: Palette.text, flex: 1, textAlign: 'right' }} numberOfLines={2}>
            {analysis.department}
          </Text>
        </View>
        {analysis.confidence > 0 ? (
          <>
            <Divider inset={Space.lg} />
            <Confidence value={analysis.confidence} />
          </>
        ) : null}
      </GroupCard>
    </Animated.View>
  );
}

function Confidence({ value }: { value: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(150, withTiming(value, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [value, w]);
  const bar = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  const color = value >= 85 ? Palette.low : value >= 60 ? Palette.medium : Palette.critical;
  return (
    <View style={{ paddingHorizontal: Space.lg, paddingVertical: Space.lg, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...Type.body, color: Palette.textMuted }}>Əminlik</Text>
        <Text style={{ ...Type.bodyStrong, color, fontVariant: ['tabular-nums'] }}>{value}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: Palette.bgDeep, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: color }, bar]} />
      </View>
    </View>
  );
}

/* ---------------- after sending ---------------- */

function Done({
  reportId,
  department,
  category,
  points,
  onOpenList,
  onClose,
}: {
  reportId: string;
  department: string;
  category: string;
  points: number;
  onOpenList: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { reports, sendState, resend } = useReports();
  const report = reports.find((r) => r.id === reportId);
  const state = report ? sendState(report) : 'sending';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Palette.bg }}
      contentContainerStyle={{
        paddingTop: (SHEET ? 0 : insets.top) + 56,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: Space.lg,
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <SuccessMark />
      <Animated.Text
        entering={FadeInDown.delay(250).duration(380)}
        style={{ ...Type.title, color: Palette.text, marginTop: Space.xl, textAlign: 'center' }}>
        Müraciət qəbul edildi
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(330).duration(380)} style={{ alignSelf: 'stretch', marginTop: Space.xl }}>
        <GroupCard>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, padding: Space.lg, gap: 4 }}>
              <Text style={{ ...Type.small, color: Palette.textMuted }}>Nömrə</Text>
              {state === 'sent' ? (
                <Text style={{ ...Type.figure, color: Palette.text }}>#{report?.serverId}</Text>
              ) : state === 'sending' ? (
                <View style={{ height: 30, justifyContent: 'center' }}>
                  <Spinner size={20} color={Palette.primary} track={Palette.ring} />
                </View>
              ) : (
                <Tap onPress={() => resend(reportId)} scaleTo={0.95}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 30 }}>
                    <Icon name="refresh" set="ion" size={17} color={Palette.primary} />
                    <Text style={{ ...Type.bodyStrong, color: Palette.primary }}>Yenidən</Text>
                  </View>
                </Tap>
              )}
            </View>
            <View style={{ width: 1, backgroundColor: Palette.border }} />
            <View style={{ flex: 1, padding: Space.lg, gap: 4 }}>
              <Text style={{ ...Type.small, color: Palette.textMuted }}>Təsdiqdən sonra</Text>
              <Text style={{ ...Type.figure, color: Palette.ok }}>+{points} xal</Text>
            </View>
          </View>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Space.lg, minHeight: 58 }}>
            <Text style={{ ...Type.body, color: Palette.textMuted }}>Qurum</Text>
            <Text style={{ ...Type.bodyStrong, color: Palette.text, flex: 1, textAlign: 'right' }} numberOfLines={2}>
              {department}
            </Text>
          </View>
          {state === 'waiting' ? (
            <>
              <Divider />
              <Text style={{ ...Type.small, color: Palette.warn, padding: Space.lg }}>
                Hələ göndərilməyib. Tətbiq özü yenidən cəhd edəcək.
              </Text>
            </>
          ) : null}
        </GroupCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(410).duration(380)} style={{ alignSelf: 'stretch' }}>
        <Feedback reportId={report?.serverId} category={category} />
      </Animated.View>

      <View style={{ alignSelf: 'stretch', gap: Space.md, marginTop: Space.xl }}>
        <PrimaryButton label="Müraciətlərim" icon="list" onPress={onOpenList} />
        <PrimaryButton label="Bağla" tone="quiet" onPress={onClose} />
      </View>
    </ScrollView>
  );
}

const BADGE = 150;

/** The 3D check badge lands with a spring and a small turn while a green ring spreads behind it. */
function SuccessMark() {
  const ring = useSharedValue(0);
  const s = useSharedValue(0.3);
  const r = useSharedValue(-16);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(60, withTiming(1, { duration: 160 }));
    s.value = withDelay(60, withSpring(1, { damping: 9, stiffness: 160, mass: 0.8 }));
    r.value = withDelay(60, withSpring(0, { damping: 7, stiffness: 120 }));
    ring.value = withDelay(280, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [ring, s, r, o]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.3 * (1 - ring.value),
    transform: [{ scale: 0.7 + ring.value * 0.8 }],
  }));
  const badge = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ scale: s.value }, { rotate: `${r.value}deg` }],
  }));
  return (
    <View style={{ width: BADGE, height: BADGE + 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: BADGE, height: BADGE, borderRadius: BADGE / 2, backgroundColor: Palette.low },
          ringStyle,
        ]}
      />
      <Animated.View style={badge}>
        <Float amount={4} duration={2000} shadow={BADGE * 0.62}>
          <Image
            source={ART.success.src}
            style={{ width: BADGE, height: (BADGE * ART.success.h) / ART.success.w }}
            contentFit="contain"
            cachePolicy="memory"
            priority="high"
          />
        </Float>
      </Animated.View>
    </View>
  );
}

const RATING_LABEL: Record<number, string> = { 1: 'Çox pis', 2: 'Pis', 3: 'Normal', 4: 'Yaxşı', 5: 'Əla' };

function Feedback({ reportId, category }: { reportId?: string; category: string }) {
  const { profile } = useProfile();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    if (rating < 1 || state === 'sending') return;
    setState('sending');
    try {
      await submitFeedback({ rating, comment: comment.trim() || undefined, reportId, category, reporter: profile.fullName });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <GroupCard style={{ marginTop: Space.lg }}>
      {state === 'sent' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', padding: Space.xl, gap: 8 }}>
          <Icon name="heart" set="ion" size={30} color={Palette.low} />
          <Text style={{ ...Type.h3, color: Palette.text }}>Təşəkkürlər</Text>
        </Animated.View>
      ) : (
        <View style={{ padding: Space.lg }}>
          <Text style={{ ...Type.bodyStrong, color: Palette.text, textAlign: 'center' }}>Proses necə keçdi?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: Space.md }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Tap key={n} onPress={() => setRating(n)} scaleTo={0.8} accessibilityLabel={RATING_LABEL[n]}>
                <Icon
                  name={n <= rating ? 'star' : 'star-outline'}
                  set="ion"
                  size={38}
                  color={n <= rating ? Palette.medium : Palette.borderStrong}
                />
              </Tap>
            ))}
          </View>
          <Text style={{ ...Type.small, color: Palette.medium, textAlign: 'center', height: 20, marginTop: 4 }}>
            {rating > 0 ? RATING_LABEL[rating] : ''}
          </Text>
          {rating > 0 ? (
            <Animated.View entering={FadeInDown.duration(240)} style={{ gap: Space.md, marginTop: Space.sm }}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Şərh (istəyə bağlı)"
                placeholderTextColor={Palette.textFaint}
                multiline
                style={{
                  ...Type.body,
                  fontSize: 16,
                  color: Palette.text,
                  backgroundColor: Palette.surfaceAlt,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  minHeight: 70,
                  textAlignVertical: 'top',
                }}
              />
              {state === 'error' ? (
                <Text style={{ ...Type.small, color: Palette.alert, textAlign: 'center' }}>Göndərilmədi. Yenidən cəhd edin.</Text>
              ) : null}
              <PrimaryButton label="Rəyi göndər" tone="quiet" loading={state === 'sending'} onPress={send} />
            </Animated.View>
          ) : null}
        </View>
      )}
    </GroupCard>
  );
}
