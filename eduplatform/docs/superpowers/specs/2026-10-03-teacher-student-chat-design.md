# O'qituvchi va talabalar chati (WebSocket) — dizayn

Sana: 2026-10-03

## Maqsad

Talaba va o'qituvchi o'rtasida shaxsiy (1-ga-1) real vaqtli chat. Shu bilan birga yangi `TEACHER` roli: o'qituvchi chatda yozishadi va mavzu/test/video kontentini boshqaradi (foydalanuvchilarni boshqara olmaydi). `ADMIN` chatda qatnashmaydi.

Muvaffaqiyat mezoni:
- Talaba o'qituvchiga (va aksincha) yozadi, xabar qabul qiluvchida sahifani yangilamasdan 1 soniya ichida paydo bo'ladi.
- O'qilmagan xabarlar soni menyuda nishon sifatida real vaqtda yangilanadi.
- Faqat suhbat ishtirokchilari xabarlarni ko'ra oladi; roli bazadan tekshiriladi.
- Admin "Foydalanuvchilar" sahifasida rolni `TEACHER` ga o'zgartira oladi; o'qituvchi test/video/mavzuni boshqara oladi, lekin foydalanuvchilarni emas.

Qamrab olinmaydi (YAGNI): guruh chatlari, fayl/rasm yuborish, xabarni tahrirlash/o'chirish, "yozmoqda…" holati, push-bildirishnoma, adminning chatda qatnashishi, bir nechta server nusxasi uchun socket adapter.

## TEACHER roli

- `UserRole.TEACHER` (`database.enums.ts`). Ro'yxatdan o'tish `STUDENT` bo'lib qoladi; admin rolni mavjud `PATCH /admin/users/:id` orqali o'zgartiradi (`UpdateUserDto.role` `UserRole` enum'ini ishlatadi, shuning uchun yangi qiymat avtomatik qabul qilinadi). Admin "Foydalanuvchilar" sahifasi hozir faqat o'qish uchun, shuning uchun unga har bir foydalanuvchi uchun **rol tanlagichi** (Talaba / O'qituvchi / Administrator) qo'shiladi; tanlagich `PATCH /admin/users/:id` ni chaqiradi. **Admin o'z rolini o'zgartira olmaydi** (backend 400: "O'z rolingizni o'zgartirib bo'lmaydi"), shunda tizim adminsiz qolmaydi.
- Seed: demo o'qituvchi `teacher@example.com` / `Teacher123!` (ism "O'qituvchi", familiya "Demo").
- **Backend huquqlari:** `AdminController` sinf darajasida `@Roles(ADMIN, TEACHER)`; `users`, `users/:id` (GET) va foydalanuvchini yangilash (PATCH) metodlari `@Roles(ADMIN)` (metod darajasi sinfnikini bekor qiladi — `RolesGuard` `getAllAndOverride` ishlatadi). `VideosAdminController` `@Roles(ADMIN, TEACHER)`. `GET /admin` (dashboard statistikasi) ikkalasiga ochiq.
- **Frontend:** `admin-layout` `ADMIN` va `TEACHER` ni qabul qiladi; `TEACHER` uchun menyuda "Foydalanuvchilar" yo'q va `/admin/users` sahifasi `TEACHER` ni `/admin` ga qaytaradi. Login: `ADMIN` va `TEACHER` → `/admin`, `STUDENT` → `/dashboard`. `student-layout` `ADMIN` va `TEACHER` ni `/admin` ga yo'naltiradi. `Role` turi `'STUDENT' | 'TEACHER' | 'ADMIN'`.
- **Cheklov (mavjud xatti-harakat):** JWT ichidagi rol token chiqarilganda belgilanadi, shuning uchun rol o'zgargach foydalanuvchi qayta kirishi kerak. Chat xizmati rolni har so'rovda **bazadan** tekshiradi.

## Ma'lumotlar modeli

`Conversation` — `id`, `studentId`, `teacherId` (ikkalasi `User`, `onDelete: Cascade`), `lastMessageAt DateTime`, `createdAt`; `@@unique([studentId, teacherId])`, `@@index([studentId, lastMessageAt])`, `@@index([teacherId, lastMessageAt])`.

`Message` — `id`, `conversationId` (`Cascade`), `senderId` (`User`, `Cascade`), `body String`, `createdAt DateTime @default(now())`, `readAt DateTime?`; `@@index([conversationId, createdAt])`, `@@index([conversationId, readAt])`.

`User` ga teskari relation'lar (`studentConversations`, `teacherConversations`, `messages`).

## REST API (`JwtAuthGuard`; rol bazadan olinadi, faqat `STUDENT` yoki `TEACHER` — `ADMIN` va boshqalar 403)

- `GET /chat/contacts?q=&limit=` — qarshi tomon ro'yxati: talabaga faol o'qituvchilar, o'qituvchiga talabalar (ism/familiya/email bo'yicha qidiruv, standart 50 ta, eng ko'pi 100). Element: `{ id, firstName, lastName, role }` (email faqat o'qituvchiga talabaning emaili ko'rinadi: `email` qo'shiladi; talabaga o'qituvchi emaili yuborilmaydi).
- `GET /chat/conversations` — mening suhbatlarim, `lastMessageAt` kamayish tartibida: `{ id, other: { id, firstName, lastName, role }, lastMessage: { body, senderId, createdAt } | null, unreadCount }`.
- `POST /chat/conversations` `{ userId }` — suhbatni topadi yoki yaratadi (idempotent; ikki tomonlama parallel yaratishda unique xatosi ushlanib mavjud yozuv qaytariladi). Juftlik `STUDENT`+`TEACHER` bo'lishi shart: o'zi bilan, bir xil rol yoki `ADMIN` bilan → 400; mavjud bo'lmagan foydalanuvchi → 404.
- `GET /chat/conversations/:id/messages?before=<messageId>&limit=` — eng yangi `limit` (standart 50, eng ko'pi 100) xabar, eskidan yangiga tartiblangan; `before` berilsa shu xabardan eskilari. Ishtirokchi bo'lmagan → 404. Javobda `hasMore: boolean`.
- `POST /chat/conversations/:id/read` — suhbatdagi qarshi tomon yuborgan va hali o'qilmagan xabarlarni `readAt = hozir` qiladi; `{ updated: number }` qaytaradi.
- `POST /chat/conversations/:id/messages` `{ body }` — xabar yuboradi. `body` trim qilinadi, 1–2000 belgi (bo'sh → 400). `lastMessageAt` yangilanadi. Xabar bazaga yozilgach WebSocket orqali tarqatiladi. Ishtirokchi bo'lmagan → 404. Yuborish tezligi: bir foydalanuvchidan 1 daqiqada ko'pi bilan 30 xabar (oshsa 429; `Message` jadvalidagi oxirgi daqiqa soni bilan hisoblanadi).
- `GET /chat/unread-count` — `{ total }`.

Xabar obyekti: `{ id, conversationId, senderId, body, createdAt, readAt }`.

## WebSocket (socket.io)

- Paketlar: backend `@nestjs/websockets@^10`, `@nestjs/platform-socket.io@^10`; frontend `socket.io-client@^4`. Gateway `ChatGateway` (`@WebSocketGateway({ cors: { origin: FRONTEND_URL, credentials: true } })`), HTTP bilan bir portda (`PORT`), standart `/socket.io` yo'li.
- **Autentifikatsiya:** mijoz `io(API_ORIGIN, { auth: { token } })`. Server `handleConnection` da `JwtService.verifyAsync(token)` (xuddi HTTP bilan bir xil `JWT_SECRET`); yaroqsiz yoki muddati o'tgan token → ulanish uziladi. Yaroqli bo'lsa `user:<sub>` xonasiga qo'shiladi. Gateway mijozdan hech qanday hodisa qabul qilmaydi (yuborish va o'qilgan deb belgilash REST orqali, shuning uchun huquq va validatsiya bitta joyda).
- **Server → mijoz hodisalari** (faqat tegishli foydalanuvchining xonasiga):
  - `chat:message` `{ message }` — yangi xabar: yuboruvchining va qabul qiluvchining xonalariga (yuboruvchining boshqa tablari ham yangilansin).
  - `chat:read` `{ conversationId, readerId, readAt }` — o'qilgan deb belgilanganda xabar yuboruvchisiga.
  - `chat:unread` `{ total }` — o'qilmaganlar soni o'zgargan foydalanuvchiga (yangi xabarda qabul qiluvchiga, o'qilganda o'quvchiga).
- Xabar xonaga faqat REST muvaffaqiyatli bazaga yozgandan keyin tarqatiladi; tarqatish xatosi REST javobini buzmaydi (xato logga yoziladi).
- Ulanish uzilib qayta ulansa, mijoz joriy suhbat xabarlarini, suhbatlar ro'yxatini va o'qilmaganlar sonini qayta yuklaydi (o'tkazib yuborilgan hodisalar uchun).

## Frontend

- `lib/socket.ts`: bitta socket (singleton) — token bilan ulanadi, `STUDENT`/`TEACHER` uchun; chiqishda (logout) uziladi. `lib/chat.ts`: `useChatRealtime()` — layout'da bir marta chaqiriladi; hodisalarni React Query keshiga yozadi: `chat:message` → `['chat','messages',conversationId]` ga (id bo'yicha takrorsiz) qo'shadi va `['chat','conversations']` ni yangilaydi; `chat:read` → shu suhbat xabarlarida `readAt` ni belgilaydi; `chat:unread` → `['chat','unread']` ni o'rnatadi; `connect` → tegishli so'rovlarni invalidatsiya qiladi.
- **UI:** umumiy `ChatView` komponenti; talaba uchun `/chat` (student layout), o'qituvchi uchun `/admin/chat` (admin layout). Chap panelda suhbatlar (o'qilmagan nishoni, oxirgi xabar) va "Yangi suhbat" (kontaktlar qidiruvi), o'ngda xabarlar (o'zimniki o'ngda, qarshi tomonniki chapda, vaqt, o'qilgan belgisi), pastda kiritish (Enter yuboradi, Shift+Enter yangi qator, 2000 belgi hisoblagichi). Eskiroq xabarlar uchun "Oldingilarini yuklash". Suhbat ochilganda va ochiq turganda kelgan xabarlarda `read` chaqiriladi. Telefonda ro'yxat va suhbat alohida ekran. Xabar matni faqat oddiy matn (React orqali, HTML yo'q), `white-space: pre-wrap`.
- **Menyu:** talaba va o'qituvchi menyusida "Chat" havolasi va o'qilmaganlar nishoni (`/chat/unread-count` boshlang'ich qiymat + `chat:unread`). Talaba mobil menyusi 5 ustunga o'tadi.
- Matnlar o'zbek tilida, mavjud uslubda; `Role` turi va `types` ga `ChatConversation`, `ChatMessage`, `ChatContact` qo'shiladi.

## Xato holatlari

- Token yo'q/yaroqsiz → REST 401, socket ulanishi uziladi (mijoz xato ko'rsatmaydi, login sahifasi mavjud mantiq bilan ishlaydi).
- `ADMIN` chat endpoint'lariga → 403 ("Chat faqat talaba va o'qituvchilar uchun").
- Suhbat ishtirokchisi bo'lmagan yoki mavjud bo'lmagan suhbat → 404 (mavjudligi oshkor qilinmaydi).
- Ulanish uzilganda UI "Qayta ulanmoqda…" holatini ko'rsatadi; xabar yuborish REST bo'lgani uchun uzilishda ham ishlaydi (qabul qilish qayta ulangach tiklanadi).
- O'qituvchi roli olib tashlansa, mavjud suhbat tarixi saqlanadi, lekin yangi xabar yuborib bo'lmaydi (juftlik roli tekshiruvi 403).

## Testlash

- `ChatService` (prisma va gateway mock bilan): juftlik tekshiruvi (talaba-talaba, o'qituvchi-o'qituvchi, admin, o'zi bilan, mavjud emas), find-or-create idempotentligi va unique poygasi, xabar yuborish (trim, 0 va 2001 belgi, tezlik chegarasi 429, `lastMessageAt`, ikkala xonaga `chat:message` va qabul qiluvchiga `chat:unread`), ishtirokchi bo'lmaganga 404, rolni bazadan olish (token'dagi rol bilan mos kelmasa bazadagi hisobga olinadi), o'qilgan deb belgilash faqat qarshi tomon xabarlarini o'zgartirishi va `chat:read`/`chat:unread` chiqarishi, sahifalash (`before`, `hasMore`), `unreadCount`/`unread-count`.
- `ChatGateway`: yaroqli token → `user:<id>` xonasiga qo'shiladi; yaroqsiz/yo'q/muddati o'tgan token → uziladi; `emitToUser` to'g'ri xonaga yuboradi.
- Rollar: admin controller'da `users` metodlari `TEACHER` ga 403, kontent metodlari ruxsat (Reflector metadata testi).
- Haqiqiy socket.io bilan integratsiya smoke testi (2 ta mijoz ulanib, REST orqali yuborilgan xabarning real vaqtda kelishi, begona foydalanuvchiga kelmasligi).
- Frontend uchun test infratuzilmasi yo'q: `tsc`, `next build` va ikki brauzer oynasida qo'lda tekshiruv.
