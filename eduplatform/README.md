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
