# AIDIN · Xətai Rayonu (mobil tətbiq)

Şəhər problemlərini bildirmək üçün mobil tətbiq, tamamilə Azərbaycan dilində. Hackathon prototipi, giriş tələb olunmur.

## İşə salmaq

1. Serveri işə salın (`../../server` qovluğunda `npm start`, port 8090).
2. `.env.example` faylını `.env` adı ilə kopyalayın və `EXPO_PUBLIC_API_URL` yazın: serverin ünvanı, məsələn `http://192.168.1.67:8090` (eyni Wi-Fi).
   AI (şəkil yoxlaması və AIDIN çatı) serverdə işləyir: OpenAI açarı `server/.env` faylında `OPENAI_API_KEY` kimi yazılır. Tətbiqdə heç bir açar saxlanmır.
3. Tətbiqi başladın və iPhone-da Expo Go ilə QR kodu skan edin:

```bash
npm install
npx expo start --clear
```

## Məlumat axını

Firebase istifadə olunmur. Tətbiq yalnız CivicWave serveri ilə danışır:

- Göndərilən müraciət (şəkil, mətn, məkan, AI nəticəsi) `POST /api/reports` ilə serverə gedir. Vebsayt eyni serverdən oxuyur.
- Göndərilə bilməyən müraciət telefonda saxlanılır və internet olanda özü yenidən göndərilir.
- İdarənin qərarı (təsdiq, icra, həll, rədd) `GET /api/public/statuses` ilə hər 8 saniyədən bir tətbiqə qayıdır.
- Şəkil yoxlaması `POST /api/ai/classify`, AIDIN çatı `POST /api/ai/chat` ilə serverdən keçir.
- Serverdən əvvəlki (Firebase dövrü) köhnə müraciətlər telefonda göstərilmir və silinir.

## Ekranlar

```
src/app/
  (tabs)/index.tsx        Ana səhifə: bu günün göstəriciləri, son müraciət
  (tabs)/map.tsx          Xəritə
  (tabs)/humai.tsx        AIDIN söhbət köməkçisi
  (tabs)/leaderboard.tsx  Reytinq
  request/index.tsx       "+" düyməsi: müraciət növləri və AI ilə Ağıllı Seçim
  request/new.tsx         Müraciət forması: məkan, şəkil, AI nəticəsi, göndərmə
  requests.tsx            Müraciətlərim: status və xallar
src/lib/
  api.ts      server müştərisi
  store.tsx   yerli müraciətlər, avtomatik yenidən göndərmə, status izləmə
  photo.ts    şəkli 1600 px-ə kiçildir və telefonda saxlayır
  ai.ts       şəkil yoxlaması və AIDIN (server vasitəsilə)
```
