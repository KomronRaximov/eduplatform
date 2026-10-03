# Adaptive Learning Platform

Masofaviy o‘qitish uchun adaptiv test tizimi. Loyiha NestJS + Prisma + SQLite backend va Next.js frontenddan iborat.

## Bir bosishda ishga tushirish

Windows’da loyiha bosh papkasidagi `run.bat` faylini ikki marta bosing.

Launcher avtomatik ravishda:

1. Node.js va npm mavjudligini tekshiradi.
2. Kerak bo‘lsa `.env` fayllari va dependency’larni tayyorlaydi.
3. Prisma Client hamda SQLite migratsiyalarini ishga tushiradi.
4. Yangi bazaga demo ma’lumotlarni bir marta yozadi.
5. Backend va frontendni alohida terminal oynalarida ochadi.
6. `http://localhost:3000` manzilini browserda ochadi.

Mavjud SQLite ma’lumotlari keyingi ishga tushirishlarda o‘chirilmaydi.

Demo akkauntlar: `admin@example.com` / `Admin123!`, `student@example.com` / `Student123!`.

## Shaxsiy mashq (oraliqli takrorlash)

Dashboard’dagi "Shaxsiy mashq" kartochkasi orqali o‘quvchi 12 ta savoldan iborat moslashgan sessiyani boshlaydi: hali ko‘rilmagan savollar va takrorlash vaqti kelgan savollar (ko‘pi bilan 6 ta) aralashtiriladi. Natijasi 50% dan past bo‘lgan (yiqilgan) testlar ustuvor: ularning ko‘rilmagan savollari birinchi tanlanadi, xato qilingan savollari esa takrorlash muddatini kutmasdan qaytariladi. Keyin zaif mavzular keladi.

Takrorlash Leitner qutilari (0–4) bilan ishlaydi: to‘g‘ri javobda quti bittaga oshadi, xatoda 0 ga qaytadi. Qutilar bo‘yicha takrorlash oralig‘i: 1, 2, 4, 8 va 16 kun. Oddiy testlar ham shu statistikani yangilaydi.

Endpoint’lar (JWT talab qilinadi): `POST /api/practice/start`, `POST /api/practice/:attemptId/submit`, `GET /api/practice/overview`.

## Video darslar

Administrator `/admin/videos` sahifasida mavzularga video qo‘shadi: YouTube havolasi yoki `mp4`/`webm` fayl (200 MB gacha). Yuklangan fayllar `backend/uploads/videos` papkasida saqlanadi (`UPLOAD_DIR` bilan o‘zgartiriladi, git’ga kirmaydi).

O‘quvchi dashboard’da, test natijasi sahifasida va `/videos` sahifasida videolarni ko‘radi. Zaif mavzulari (o‘rtacha natija 50% dan past, yiqilgan testlar, xato qilingan savollar) bo‘yicha dashboard’da tavsiya chiqadi.

### AI tavsiyasi (Gemini)

Tavsiyani Google Gemini tanlaydi va o‘zbekcha izoh yozadi. Kalit bo‘lmasa yoki AI ishlamasa, tavsiya avtomatik qoida bo‘yicha beriladi (AI belgisi chiqmaydi). Sozlash uchun `backend/.env` ga qo‘ying:

```
GEMINI_API_KEY="..."        # Google AI Studio (aistudio.google.com) dan olingan bepul kalit
GEMINI_MODEL="gemini-2.5-flash"
GEMINI_TIMEOUT_MS=8000
```

Natija 24 soatga saqlanadi va faqat zaif joylar o‘zgarganda qayta so‘raladi; AI xato bersa 10 daqiqa qayta chaqirilmaydi. AI’ga faqat zaif mavzular, xato savollar matni va video ma’lumotlari yuboriladi (ism, email yo‘q).
