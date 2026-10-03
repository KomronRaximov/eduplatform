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
