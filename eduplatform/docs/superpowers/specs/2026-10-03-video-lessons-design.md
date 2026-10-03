# Video darslar va AI (Gemini) tavsiyasi — dizayn

Sana: 2026-10-03

## Maqsad

Admin mavzularga video dars qo'shadi (YouTube havolasi yoki yuklangan fayl). O'quvchi yaxshi o'zlashtirmagan mavzularga mos videolar unga tavsiya qilinadi. Tanlovni **Google Gemini API (bepul tarif)** qiladi; kalit yo'q yoki AI ishlamasa, tavsiya avtomatik **qoida bo'yicha** (AI'siz) beriladi.

Muvaffaqiyat mezoni:
- Admin YouTube havolasi yoki mp4/webm fayl bilan video qo'sha, tahrirlay va o'chira oladi.
- O'quvchi dashboard, test natijasi sahifasi va `/videos` sahifasida videolarni ko'radi va pleyerda ijro eta oladi.
- Zaif mavzusi bo'lgan o'quvchiga shu mavzularning videolari (eng zaifidan boshlab) tavsiya qilinadi; AI yoqilgan bo'lsa tanlovni va o'zbekcha izohni Gemini beradi, o'chiq/xato bo'lsa qoida ishlaydi.

Qamrab olinmaydi (YAGNI): o'quvchilarning video yuklashi, ko'rilganlik statistikasi, AI'ning yangi video topishi yoki yaratishi (AI faqat admin kutubxonasidan tanlaydi), YouTube'dan qidirish, Gemini'ning pullik funksiyalari, videoni qayta kodlash yoki thumbnail yaratish.

## Ma'lumotlar modeli

Yangi `Video` (jadval `Video`):

| Maydon | Tur | Izoh |
|---|---|---|
| id | String (uuid) | |
| topicId | String | `Topic` ga relation, `onDelete: Cascade`, `@@index([topicId])` |
| title | String | 1–200 belgi |
| description | String? | ko'pi bilan 1000 belgi |
| difficulty | String? | `EASY`/`MEDIUM`/`HARD` yoki `null` |
| type | String | `YOUTUBE` yoki `UPLOAD` (`VideoType` konstantasi `database.enums.ts` da) |
| youtubeId | String? | `type = YOUTUBE` bo'lsa to'ldiriladi |
| fileName | String? | `type = UPLOAD` bo'lsa to'ldiriladi (uuid + kengaytma) |
| isActive | Boolean | default `true` |
| createdAt, updatedAt | DateTime | |

`Topic` ga `videos Video[]` teskari relation qo'shiladi.

## YouTube havolasi

`extractYoutubeId(url: string): string | null` sof funksiya. Qabul qilinadigan shakllar: `youtube.com/watch?v=ID`, `m.youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, `youtube.com/shorts/ID`, ixtiyoriy qo'shimcha parametrlar (`&t=`, `?si=`) bilan. ID `[A-Za-z0-9_-]{11}` bo'lishi shart. Boshqa domen, `javascript:` yoki noto'g'ri ID → `null`, admin API 400 qaytaradi ("YouTube havolasi noto'g'ri").

Frontend YouTube'ni `https://www.youtube-nocookie.com/embed/<id>` iframe orqali ko'rsatadi, thumbnail `https://i.ytimg.com/vi/<id>/hqdefault.jpg`.

## Fayl yuklash

- Formatlar: faqat `.mp4` (`video/mp4`) va `.webm` (`video/webm`); kengaytma va MIME ikkalasi mos kelishi shart. Hajm ko'pi bilan **200 MB**.
- Saqlash: `UPLOAD_DIR` (`.env`, default `./uploads`) ichidagi `videos/<uuid>.<ext>`; fayl nomi serverda yaratiladi, mijoz nomi ishlatilmaydi. Papka `.gitignore` ga qo'shiladi, mavjud bo'lmasa avtomatik yaratiladi.
- Berish: `app.useStaticAssets(UPLOAD_DIR, { prefix: '/api/uploads/' })`; ya'ni `GET /api/uploads/videos/<fileName>`. Express `Range` so'rovlarini o'zi qo'llaydi, shuning uchun `<video>` seek ishlaydi. Yo'l autentifikatsiyasiz ochiq, lekin fayl nomi taxmin qilib bo'lmaydigan uuid (qabul qilingan cheklov).
- O'chirish: video o'chirilganda yoki YouTube'dan faylga (va aksincha) almashtirilganda eski fayl diskdan o'chiriladi; fayl allaqachon yo'q bo'lsa xato bermaydi.
- Yuklash ishlamay qolsa (validatsiya xatosi, DB xatosi) qisman yozilgan fayl o'chiriladi.
- `multer` allaqachon `@nestjs/platform-express` bilan o'rnatilgan; faqat `@types/multer` devDependency qo'shiladi.

## Admin API (mavjud `AdminController` kabi `JwtAuthGuard` + `RolesGuard` + `ADMIN`)

- `GET /admin/videos?topicId=` → barcha videolar (faol va nofaol), mavzu nomi bilan, yangisi birinchi.
- `POST /admin/videos` (`multipart/form-data`): maydonlar `topicId`, `title`, `description?`, `difficulty?`, `type`, va `type=YOUTUBE` uchun `youtubeUrl`, `type=UPLOAD` uchun `file`. Tur bilan mos kelmaydigan maydon (masalan, `YOUTUBE` bilan `file`) → 400. `topicId` mavjud bo'lmasa 404.
- `PATCH /admin/videos/:id` (`multipart/form-data`): `title`, `description`, `difficulty`, `topicId`, `isActive`; shuningdek `youtubeUrl` yoki yangi `file` (tur o'zgarishi mumkin). Yuborilmagan maydon o'zgarmaydi.
- `DELETE /admin/videos/:id` → videoni va (bo'lsa) faylni o'chiradi.

Javobdagi video obyekti: `{ id, topicId, topic: { id, name }, title, description, difficulty, type, youtubeId, fileUrl, isActive }`, bunda `fileUrl` = `/api/uploads/videos/<fileName>` (faqat `UPLOAD`), aks holda `null`.

## O'quvchi API (`JwtAuthGuard`)

- `GET /videos?topicId=` → faqat faol videolar (faol mavzu), mavzu bo'yicha.
- `GET /videos/recommended` → `{ items: { video, reason }[] }`, ko'pi bilan 6 ta.

### Tavsiya (`VideoRecommendationService.recommend`)

Imzo: `recommend(userId: string): Promise<{ source: 'ai' | 'rules'; items: { video: VideoDto; reason: string }[] }>`; `GET /videos/recommended` shuni qaytaradi (`items` ko'pi bilan 6 ta).

**1. Nomzodlarni yig'ish (qoida, har doim).**
- *Zaif mavzular* (har biri `weakness` bali bilan, kichigi = zaifrog'i): `UserTopicProgress.averagePercentage < 50` (`weakness = averagePercentage`); oxirgi urinishi < 50% bo'lgan testlarning mavzulari (`weakness = o'sha foiz`); xato qilingan (`UserQuestionStat.box = 0`, ya’ni oxirgi javob xato) savollari bo'lgan mavzu (`weakness = 49`, boshqa belgi bo'lmasa). Mavzu bir necha belgiga ega bo'lsa eng kichik `weakness` olinadi.
- Zaif mavzularning faol videolari (faol mavzu) — nomzodlar, ko'pi bilan 30 ta (eng zaif mavzulardan boshlab).
- Zaif mavzu yoki nomzod yo'q → `{ source: 'rules', items: [] }`, AI chaqirilmaydi.

**2. Qoida bo'yicha tanlov (zaxira, AI'siz).** Mavzular `weakness` o'sish tartibida; mavzu ichida: yiqilgan test(lar) darajasiga yoki `currentDifficulty` ga teng `difficulty`li videolar birinchi (`difficulty = null` oxirida), keyin yangisi birinchi. Mavzular orasida navbatma-navbat, har mavzudan ko'pi bilan 2 ta, jami 6 ta. `reason` shabloni: `«{mavzu}» mavzusida natijangiz {foiz}% — bu video shu mavzuni mustahkamlashga yordam beradi.`; `weakness` faqat xato savollardan kelsa: `«{mavzu}» mavzusida xato qilgan savollaringiz bor — bu video yordam beradi.`

**3. AI tanlovi (Gemini).** `GEMINI_API_KEY` bo'sh bo'lsa butunlay o'tkazib yuboriladi.
- Mijoz: `GeminiClient.generateJson(prompt: string, schema: object): Promise<unknown>`. SDK ishlatilmaydi; Node'ning `fetch` bilan `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent`, sarlavha `x-goog-api-key`, tana `{ contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: 'application/json', responseSchema } }`, javob `candidates[0].content.parts[0].text` (JSON sifatida o'qiladi). Taymaut `GEMINI_TIMEOUT_MS` (default 8000).
- Prompt: vazifa tavsifi (o'zbekcha izoh yozish, faqat berilgan nomzod ID'lari ichidan tanlash, ko'pi bilan 6 ta) va ma'lumotlar: zaif mavzular (nomi, foiz), eng ko'p xato qilingan 5 savol matni, nomzod videolar (`id`, sarlavha, tavsif, daraja, mavzu nomi). Foydalanuvchining ismi, emaili va ID'si yuborilmaydi. Video/savol matnlari "ma'lumot" sifatida beriladi va prompt ularning ichidagi ko'rsatmalarga amal qilmaslikni aytadi.
- Chiqish sxemasi: `{ items: [{ videoId: string, reason: string }] }`.
- **Tekshiruv (AI uydirmasligi uchun):** server faqat nomzodlar ichidagi `videoId`ni qabul qiladi; noma'lum yoki takroriy ID tashlab yuboriladi; `reason` kesib (ko'pi bilan 300 belgi) olinadi, bo'sh bo'lsa shablon izoh qo'yiladi; natijada 1 tadan kam qolsa — zaxira.
- **Zaxira:** kalit yo'q, taymaut, tarmoq xatosi, HTTP xato (jumladan 429 limit, 404 model), noto'g'ri JSON yoki bo'sh natija → qoida bo'yicha tanlov (`source: 'rules'`); foydalanuvchiga xato ko'rsatilmaydi.
- **Keshlash (bepul limitni tejash):** yangi `UserVideoRecommendation` (`userId` unikal, `signature`, `itemsJson`, `createdAt`). `signature` = zaif mavzular, nomzod ID'lari va xato savollar ro'yxatidan olingan hash. Imzo bir xil va yozuv 24 soatdan yosh bo'lsa, AI chaqirilmaydi. Faqat muvaffaqiyatli AI natijasi keshlanadi. AI xato bersa, shu foydalanuvchi uchun 10 daqiqa AI qayta chaqirilmaydi (xotiradagi `Map<userId, vaqt>`).
- **Sozlama (`.env` / `.env.example`):** `GEMINI_API_KEY=` (bo'sh joy, egasi o'zi qo'yadi), `GEMINI_MODEL=gemini-2.5-flash` (bepul tarifda mavjud; modellar tez almashadi, shuning uchun sozlanadi), `GEMINI_TIMEOUT_MS=8000`. Kalit hech qachon frontendga, logga yoki javobga chiqmaydi.

`GET /practice/overview` o'zgarmaydi.

`Video`dan tashqari yangi jadval: `UserVideoRecommendation` (`id`, `userId` unikal, `signature`, `itemsJson` String, `createdAt`; `User` ga cascade).

## Frontend

- **Admin:** yon menyuga "Videolar" (`/admin/videos`): jadval/ro'yxat (sarlavha, mavzu, tur, daraja, faol), mavzu filtri, "Video qo'shish" formasi (tur tanlash: YouTube havolasi maydoni yoki fayl tanlash), tahrirlash, o'chirish (`ConfirmDialog`, xato modal ichida ko'rinadi). Yuklash paytida holat ko'rsatiladi; mijoz tomonida 200 MB va mp4/webm oldindan tekshiriladi (server tekshiruvi asosiy).
- **O'quvchi:** dashboard'da "Sizga tavsiya etilgan videodarslar" bloki (`/videos/recommended`; bo'sh bo'lsa ko'rsatilmaydi; `source = 'ai'` bo'lsa kartochkada "AI tavsiyasi" belgisi; so'rov dashboard'ning boshqa qismlarini kutdirmaydi, alohida yuklanadi), test natijasi sahifasida (`/attempts/[id]/result`) shu test mavzusi uchun video bloki (`/videos?topicId=`; bo'sh bo'lsa ko'rsatilmaydi), `/videos` sahifasi (mavzu bo'yicha guruhlangan ro'yxat, nav havola shart emas: dashboard va natija sahifasidan havola), pleyer modali (YouTube iframe yoki `<video controls preload="metadata">`; Esc/orqa fon bilan yopiladi).
- Matnlar o'zbek tilida, mavjud uslubda; `frontend/src/types/index.ts` ga `Video` turi qo'shiladi.

## Xato holatlari

- Noto'g'ri YouTube havolasi, ruxsat etilmagan format yoki MIME, 200 MB dan katta fayl (413), mos kelmaydigan maydonlar → 400/413 va tushunarli o'zbekcha xabar.
- Mavjud bo'lmagan mavzu/video → 404.
- Fayl yuklanayotganda tarmoq uzilsa — qisman fayl diskda qolmaydi.
- Mavzu o'chirilganda uning videolari bazadan o'chadi (cascade); yuklangan fayllar ham diskdan tozalanadi (`AdminService.deleteTopic` videolar fayllarini avval o'chiradi).

## Testlash

- `extractYoutubeId`: barcha qabul qilingan shakllar, `&t=`/`?si=`, noto'g'ri ID, begona domen, bo'sh satr.
- Fayl tekshiruvi: kengaytma/MIME mos kelmasligi, katta hajm, noto'g'ri tur.
- Qoida bo'yicha tanlov: zaif mavzu tartibi, daraja ustuvorligi, har mavzudan 2 ta chegarasi, 6 ta limit, zaif mavzu yo'q → bo'sh, nofaol videolar chiqarilmaydi, `reason` shabloni.
- AI tanlovi (`GeminiClient` mock bilan): to'g'ri javob → `source: 'ai'`; nomzodlarda yo'q/takroriy ID tashlanadi; hamma ID noto'g'ri → zaxira; kalit yo'q → `GeminiClient` chaqirilmaydi; xato/taymaut/429 → zaxira va 10 daqiqalik kutish; imzo bir xil → kesh ishlatiladi, imzo o'zgarsa qayta so'raladi; AI xatosi keshlanmaydi; prompt'da ism/email/ID yo'q; `reason` 300 belgigacha kesiladi.
- `GeminiClient` (`fetch` mock bilan): so'rov URL'i, `x-goog-api-key` sarlavhasi, `responseMimeType`/`responseSchema`, javobdan matnni olish, HTTP xatoda va taymautda xato tashlashi.
- Admin xizmati (prisma/fayl tizimi mock bilan): yaratish YouTube/UPLOAD, mos kelmaydigan maydonlar 400, o'chirishda fayl o'chirilishi, almashtirishda eski fayl o'chirilishi, mavzu o'chirilganda fayllar tozalanishi.
- Frontend uchun test infratuzilmasi yo'q: `tsc`, `next build` va qo'lda tekshiruv.
