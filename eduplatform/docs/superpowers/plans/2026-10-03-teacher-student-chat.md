# O'qituvchi va talabalar chati (WebSocket) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yangi `TEACHER` roli (chat + kontent huquqi) va talaba ↔ o'qituvchi o'rtasida socket.io orqali real vaqtli shaxsiy chat; `ADMIN` chatda qatnashmaydi.

**Architecture:** Yangi `chat` NestJS moduli: `ChatService` (barcha qoidalar va DB), `ChatController` (REST: tarix, yuborish, o'qilgan deb belgilash), `ChatGateway` (faqat JWT bilan ulanish va `user:<id>` xonalariga hodisa yetkazish). Xabar REST orqali yoziladi, bazaga yozilgach gateway tarqatadi. Frontend'da bitta socket, hodisalar React Query keshiga yoziladi; ikkala layout'ga "Chat" nishoni.

**Tech Stack:** NestJS 10, `@nestjs/websockets` + `@nestjs/platform-socket.io` (socket.io 4), Prisma 5 (SQLite), Jest; Next.js, React Query, `socket.io-client`, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-03-teacher-student-chat-design.md`

## Global Constraints

- Xabar `body`: trim qilinadi, 1–2000 belgi. Tezlik: bir foydalanuvchidan 1 daqiqada ko'pi bilan 30 xabar (oshsa 429 `TooManyRequestsException` — `HttpException` 429).
- Sahifalash: standart 50, eng ko'pi 100; tartib `createdAt` o'sish, teng bo'lsa `id` bo'yicha; `before=<messageId>` kursor.
- Chat faqat `STUDENT` ↔ `TEACHER`; `ADMIN` va boshqalar 403 `Chat faqat talaba va o‘qituvchilar uchun`. Rol har so'rovda **bazadan** olinadi (token'dagi emas).
- Ishtirokchi bo'lmagan yoki mavjud bo'lmagan suhbat → 404 `Suhbat topilmadi`.
- Socket hodisalari: `chat:message` `{ message }`, `chat:read` `{ conversationId, readerId, readAt }`, `chat:unread` `{ total }`; faqat `user:<id>` xonalariga; mijozdan hodisa qabul qilinmaydi.
- Talabaga o'qituvchining `email`i yuborilmaydi; o'qituvchiga talabaning emaili yuboriladi.
- Admin o'z rolini o'zgartira olmaydi (400 `O‘z rolingizni o‘zgartirib bo‘lmaydi`).
- `TEACHER` huquqi: mavzu, test, savol, video boshqaruvi + `GET /admin`; foydalanuvchilarni boshqarish (`users`, `users/:id` GET/PATCH/DELETE) faqat `ADMIN`.
- Foydalanuvchiga ko'rinadigan matnlar o'zbek tilida; kod uslubi mavjud fayllarga mos; xabar matni UI'da faqat oddiy matn (HTML yo'q). O'chirish tasdig'i `ConfirmDialog` bilan.
- Yangi ish `feature/teacher-chat` branch'ida (`feature/video-lessons` dan ochiladi). Python yo'q; fayllarni Write/Edit yoki `node -e` bilan o'zgartiring va har o'zgarishdan keyin uzun qatorlarni **to'liq** tekshiring (`cut` qisqartirgan chiqishga ishonmang).

## Review Focus

1. Talaba boshqa suhbatning xabarlarini o'qiy/yoza olmasligi (ID taxmin qilish) — 404 (Task 5, 6).
2. Admin yoki roli o'zgargan (tokeni eski) foydalanuvchi chatga kira olmasligi; talaba o'qituvchi tokeni bilan o'zini o'qituvchi qila olmasligi (Task 4).
3. Yaroqsiz/muddati o'tgan/soxta token bilan socket ulanishi rad etilishi va hodisalar boshqa foydalanuvchi xonasiga tushmasligi (Task 6).
4. Ikki tomon bir vaqtda suhbat ochsa unique poygasi 500 bermasligi (Task 4).
5. Xabarda HTML/script, 2001 belgi, faqat probel — rad etilishi yoki oddiy matn sifatida ko'rsatilishi (Task 5, 9).
6. Ulanish uzilib qayta ulanganda o'tkazib yuborilgan xabarlar tiklanishi (Task 8, 9).
7. Admin o'zini `STUDENT` ga tushirib adminsiz qolmasligi (Task 2).
8. Bir xil `createdAt`li xabarlarda `before` kursori xabar o'tkazib yubormasligi yoki takrorlamasligi (Task 5).

---

### Task 1: Paketlar, sxema, TEACHER roli, seed

**Files:**
- Modify: `backend/package.json`, `frontend/package.json` (+ lock fayllari faqat shu paketlar uchun), `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `backend/src/common/types/database.enums.ts`
- Create: `backend/prisma/migrations/<timestamp>_chat/migration.sql` (Prisma yaratadi)

**Interfaces:**
- Produces: `UserRole.TEACHER = 'TEACHER'`; modellar `Conversation`, `Message`.

- [ ] **Step 1:** `git checkout -b feature/teacher-chat`. `cd backend && npm i @nestjs/websockets@^10 @nestjs/platform-socket.io@^10`; `cd ../frontend && npm i socket.io-client@^4`. `package-lock.json`ga kirgan begona o'zgarishlarni commit'ga qo'shmang (`git add -p` yoki faqat `package.json`).
- [ ] **Step 2:** `schema.prisma` ga spec'dagi `Conversation` (`student User @relation("StudentConversations", ...)`, `teacher User @relation("TeacherConversations", ...)`, indekslar, `@@unique([studentId, teacherId])`) va `Message` (`@@index([conversationId, createdAt])`, `@@index([conversationId, readAt])`) modellarini, `User` ga `studentConversations`, `teacherConversations`, `messages` teskari relation'larini qo'shing (barcha `onDelete: Cascade`).
- [ ] **Step 3:** `UserRole` ga `TEACHER` qo'shing. `seed.ts`: boshidagi `deleteMany` zanjiriga `message` va `conversation` (`user.deleteMany()` dan oldin), va demo o'qituvchi (`teacher@example.com`, `Teacher123!` bcrypt bilan, ism "O‘qituvchi", familiya "Demo", `role: UserRole.TEACHER`).
- [ ] **Step 4:** `npx prisma format && npx prisma migrate dev --name chat --skip-generate && npx prisma generate` (EPERM chiqsa tiplar yangilanganini `grep -c "model Conversation\|Conversation" node_modules/.prisma/client/index.d.ts` bilan tekshiring); `npx tsc --noEmit -p .` toza. Commit `feat(db): chat models, TEACHER role and websocket deps`.

### Task 2: Backend rollar va huquqlar

**Files:**
- Modify: `backend/src/modules/admin/admin.controller.ts`, `backend/src/modules/admin/admin.service.ts` (`updateUser`), `backend/src/modules/videos/videos-admin.controller.ts`
- Test: `backend/src/modules/admin/admin.roles.spec.ts`, `backend/src/modules/admin/admin.service.spec.ts` (qo'shimcha)

**Interfaces:**
- Produces: `AdminService.updateUser(id: string, dto: UpdateUserDto, actingUserId?: string)` — `actingUserId === id` va `dto.role` berilgan va farq qilsa `BadRequestException('O‘z rolingizni o‘zgartirib bo‘lmaydi')`. `AdminController.updateUser` `@CurrentUser()` dan `user.sub` ni uzatadi.

- [ ] **Step 1: Failing testlar.** `admin.roles.spec.ts`: `Reflect.getMetadata(ROLES_KEY, AdminController)` `[ADMIN, TEACHER]` ni o'z ichiga oladi; `AdminController.prototype` dagi `users`, `user`, `updateUser`, `deleteUser` metodlarining `ROLES_KEY` metadatasi `[ADMIN]`; `topics`, `createTopic`, `tests`, `createTest`, `createQuestion`, `dashboard` metodlarida metadata yo'q (sinfniki amal qiladi); `VideosAdminController` metadatasi `ADMIN` va `TEACHER`ni o'z ichiga oladi; `RolesGuard` bilan sinov: `TEACHER` foydalanuvchi `users` handler'iga rad etiladi, `topics` handler'iga o'tadi. `admin.service.spec`: `updateUser('u1', { role: 'STUDENT' }, 'u1')` → `BadRequestException`; boshqa foydalanuvchining rolini o'zgartirish ruxsat; o'z `currentDifficulty`ini o'zgartirish ruxsat.
- [ ] **Step 2:** FAIL: `cd backend && npx jest src/modules/admin`.
- [ ] **Step 3:** Implement: sinf `@Roles(UserRole.ADMIN, UserRole.TEACHER)`, foydalanuvchi metodlariga `@Roles(UserRole.ADMIN)`; `VideosAdminController` shunga mos; `updateUser` himoyasi.
- [ ] **Step 4:** PASS + `npx jest` (hammasi) + `npx tsc --noEmit -p .`. Commit `feat(roles): teacher permissions and self-role protection`.

### Task 3: Frontend rollar

**Files:**
- Modify: `frontend/src/types/index.ts` (`Role = 'STUDENT' | 'TEACHER' | 'ADMIN'`), `frontend/src/components/admin-layout.tsx`, `frontend/src/components/student-layout.tsx`, `frontend/src/app/(auth)/login/page.tsx`, `frontend/src/app/admin/users/page.tsx`

**Interfaces:**
- Produces: `admin-layout` `ADMIN` va `TEACHER` ni qabul qiladi, `STUDENT`ni `/dashboard`ga qaytaradi; menyuda "Foydalanuvchilar" faqat `ADMIN` uchun; `student-layout` `ADMIN` va `TEACHER` ni `/admin`ga qaytaradi; login yo'naltirishi `STUDENT → /dashboard`, qolganlari `/admin`; login sahifasida demo "O‘qituvchi" tugmasi (`teacher@example.com` / `Teacher123!`).

- [ ] **Step 1:** Yuqoridagi o'zgarishlarni qiling. `/admin/users` sahifasi `TEACHER`ni `/admin`ga qaytaradi (sessiya roli bo'yicha, yuklashdan oldin).
- [ ] **Step 2:** Users sahifasiga (jadval va mobil kartochka) har bir foydalanuvchi uchun rol tanlagichi (`select`: Talaba / O‘qituvchi / Administrator; o'z qatori `disabled`) — `PATCH /admin/users/:id { role }`, muvaffaqiyatda ro'yxat invalidatsiya, xato sahifada `ErrorBox` bilan; eslatma matni: "Rol o‘zgargach foydalanuvchi qayta kirishi kerak".
- [ ] **Step 3:** `cd frontend && npx tsc --noEmit && npx next build` toza. Commit `feat(frontend): teacher role routing and user role selector`.

### Task 4: ChatService — ishtirokchilar, kontaktlar, suhbatlar

**Files:**
- Create: `backend/src/modules/chat/chat.types.ts`, `backend/src/modules/chat/chat.service.ts`
- Test: `backend/src/modules/chat/chat.service.spec.ts`

**Interfaces:**
- Produces (`chat.types.ts`):
  - `type ChatContact = { id: string; firstName: string; lastName: string; role: 'STUDENT' | 'TEACHER'; email?: string }` (`email` faqat o'qituvchi ko'rayotgan talaba uchun)
  - `type ChatMessageDto = { id: string; conversationId: string; senderId: string; body: string; createdAt: string; readAt: string | null }`
  - `type ChatConversationDto = { id: string; other: ChatContact; lastMessage: { body: string; senderId: string; createdAt: string } | null; unreadCount: number }`
  - `MAX_BODY = 2000`, `RATE_LIMIT_PER_MINUTE = 30`, `DEFAULT_PAGE = 50`, `MAX_PAGE = 100`
- Produces (`ChatService`): konstruktor `(prisma: PrismaService, gateway: ChatGateway)` (gateway Task 6 da yoziladi; bu vazifada `emitToUser(userId: string, event: string, payload: unknown): void` imzosiga ega minimal interfeys/stub sifatida `chat.gateway.ts` yaratiladi); `private actor(userId: string): Promise<{ id: string; role: 'STUDENT' | 'TEACHER'; firstName: string; lastName: string }>` — bazadan o'qiydi, `STUDENT`/`TEACHER` emas → `ForbiddenException`; `contacts(userId: string, q?: string, limit?: number): Promise<ChatContact[]>`; `conversations(userId: string): Promise<ChatConversationDto[]>`; `openConversation(userId: string, otherId: string): Promise<ChatConversationDto>`; `private assertParticipant(userId: string, conversationId: string)` — ishtirokchi bo'lmasa `NotFoundException('Suhbat topilmadi')`.

- [ ] **Step 1: Failing testlar** (prisma mock): (a) `actor` — `ADMIN` va mavjud bo'lmagan foydalanuvchi → `ForbiddenException`; token roli bilan emas, bazadagi rol bilan ishlashi (`findUnique` natijasi `TEACHER` bo'lsa o'qituvchi sifatida); (b) `contacts` — talabaga faqat `TEACHER` rolidagilar (`email`siz), o'qituvchiga faqat `STUDENT`lar (`email` bilan), `q` ism/familiya/email bo'yicha `contains`, `limit` 100 gacha cheklanadi; (c) `openConversation` — talaba+o'qituvchi juftligi `studentId`/`teacherId` to'g'ri joylanadi (talaba boshlasa ham, o'qituvchi boshlasa ham), mavjud bo'lsa yangi yaratilmaydi; talaba-talaba, o'qituvchi-o'qituvchi, `ADMIN` bilan, o'zi bilan → `BadRequestException`; mavjud bo'lmagan `otherId` → `NotFoundException`; `create` unique xatosini (`P2002`) bersa mavjud suhbat qayta o'qilib qaytariladi (500 emas); (d) `conversations` — `lastMessageAt` kamayish tartibida, `unreadCount` faqat qarshi tomonning `readAt = null` xabarlari, `lastMessage` bo'sh suhbatda `null`; (e) `assertParticipant` boshqa foydalanuvchining suhbatiga va mavjud bo'lmaganiga bir xil `NotFoundException`.
- [ ] **Step 2–4:** FAIL → implement → PASS (`npx jest src/modules/chat`). **Step 5:** commit `feat(chat): participants, contacts and conversations`.

### Task 5: ChatService — xabarlar, o'qilgan, o'qilmaganlar

**Files:**
- Modify: `backend/src/modules/chat/chat.service.ts`
- Test: `backend/src/modules/chat/chat.service.spec.ts` (qo'shimcha)

**Interfaces:**
- Produces: `messages(userId: string, conversationId: string, before?: string, limit?: number): Promise<{ items: ChatMessageDto[]; hasMore: boolean }>`; `send(userId: string, conversationId: string, body: string): Promise<ChatMessageDto>`; `markRead(userId: string, conversationId: string): Promise<{ updated: number }>`; `unreadTotal(userId: string): Promise<{ total: number }>`.
- Gateway chaqiruvlari: `send` → bazaga yozgach `emitToUser(senderId, 'chat:message', { message })`, `emitToUser(receiverId, 'chat:message', { message })`, `emitToUser(receiverId, 'chat:unread', { total })`; `markRead` (`updated > 0` bo'lsa) → `emitToUser(otherId, 'chat:read', { conversationId, readerId, readAt })` va `emitToUser(readerId, 'chat:unread', { total })`. Tarqatish xatosi ushlanadi va logga yoziladi (REST natijasini buzmaydi).

- [ ] **Step 1: Failing testlar:** (a) `send` — `body` trim qilinadi; `''`, probellar, 2001 belgi → `BadRequestException`; 2000 belgi qabul; `<script>alert(1)</script>` matni o'zgarishsiz saqlanadi (escape UI'da); `lastMessageAt` yangilanadi; tezlik: oxirgi daqiqada 30 xabar bo'lsa 429; ishtirokchi bo'lmagan → 404 (xabar yozilmaydi); gateway chaqiruvlari yuqoridagi tartibda va to'g'ri `userId` lar bilan; `emitToUser` throw qilsa ham `send` natija qaytaradi; (b) `messages` — eng yangi `limit` ta, o'sish tartibida qaytadi, `hasMore` to'g'ri; `before` kursori: bir xil `createdAt`li xabarlarda hech biri o'tkazib yuborilmaydi/takrorlanmaydi (kursor `(createdAt, id)` juftligi bo'yicha); `limit` 100 dan oshsa 100; ishtirokchi bo'lmagan → 404; (c) `markRead` — faqat `senderId !== userId` va `readAt = null` xabarlarni yangilaydi, `updated` soni qaytadi; `updated === 0` bo'lsa hodisa chiqmaydi; (d) `unreadTotal` — foydalanuvchining barcha suhbatlaridagi qarshi tomon o'qilmagan xabarlar yig'indisi.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** commit `feat(chat): messages, read receipts and unread counts`.

### Task 6: ChatGateway, controller, modul

**Files:**
- Create/Modify: `backend/src/modules/chat/chat.gateway.ts`, `backend/src/modules/chat/chat.controller.ts`, `backend/src/modules/chat/dto/chat.dto.ts`, `backend/src/modules/chat/chat.module.ts`; Modify `backend/src/app.module.ts`
- Test: `backend/src/modules/chat/chat.gateway.spec.ts`

**Interfaces:**
- Produces: `ChatGateway` — `@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true } })`; `@WebSocketServer() server: Server`; `handleConnection(client: Socket): Promise<void>` — `client.handshake.auth?.token` ni `JwtService.verifyAsync` bilan tekshiradi; yaroqli bo'lsa `client.join('user:' + payload.sub)`, aks holda `client.disconnect(true)`; `emitToUser(userId: string, event: 'chat:message' | 'chat:read' | 'chat:unread', payload: unknown): void` → `this.server.to('user:' + userId).emit(event, payload)`.
- `ChatController` (`@Controller('chat')`, `JwtAuthGuard`): `GET contacts` (`q?`, `limit?`), `GET conversations`, `POST conversations` (`{ userId }`), `GET conversations/:id/messages` (`before?`, `limit?`), `POST conversations/:id/read`, `POST conversations/:id/messages` (`{ body }`), `GET unread-count`; `@CurrentUser()` → `user.sub`. DTO'lar: `OpenConversationDto { @IsString() userId }`, `SendMessageDto { @IsString() body }` (uzunlik/probel tekshiruvi service'da), `MessagesQueryDto { before?: string; limit?: number (@Type(() => Number), @IsInt, @Min(1), @Max(100)) }`.
- `ChatModule`: `JwtModule.registerAsync` (`JWT_SECRET`, `AuthModule`dagi kabi), providers `ChatService`, `ChatGateway`.

- [ ] **Step 1: Failing testlar** (`JwtService` va socket mock): yaroqli token → `join('user:u1')`, uzilmaydi; token yo'q / yaroqsiz / `verifyAsync` throw → `disconnect(true)` va `join` chaqirilmaydi; `emitToUser('u1', 'chat:message', p)` → `server.to('user:u1').emit('chat:message', p)` (boshqa xonaga emas).
- [ ] **Step 2–4:** FAIL → implement → PASS; `npx tsc --noEmit -p .`; `npx jest` hammasi.
- [ ] **Step 5: Qo'lda socket smoke** (DB nusxasi, 3999-port, `rm -f dist/tsconfig.tsbuildinfo && npx nest build`; vaqtinchalik skript `backend/_smoke.js`, commit qilinmaydi, oxirida o'chiriladi): talaba va o'qituvchi tokenlari bilan 2 ta `socket.io-client` ulanadi; talaba REST orqali yozadi → o'qituvchi `chat:message` va `chat:unread` oladi (<1 s); o'qituvchi `/read` chaqiradi → talaba `chat:read` oladi; uchinchi (begona) talaba hech narsa olmaydi; soxta token ulanishi uziladi; admin tokeni bilan `GET /chat/contacts` → 403; begona suhbat `GET messages` → 404.
- [ ] **Step 6:** commit `feat(chat): websocket gateway and REST API`.

### Task 7: Frontend — socket va chat ma'lumotlari

**Files:**
- Create: `frontend/src/lib/socket.ts`, `frontend/src/lib/chat.ts`
- Modify: `frontend/src/types/index.ts` (`ChatContact`, `ChatMessage`, `ChatConversation` — Task 4 DTO'lari bilan bir xil maydonlar)

**Interfaces:**
- Produces: `getSocket(): Socket | null` (token yo'q yoki rol `ADMIN` bo'lsa `null`; aks holda `io(origin, { auth: { token }, transports: ['websocket', 'polling'] })` singleton; origin `NEXT_PUBLIC_API_URL` dan `new URL(...).origin`); `closeSocket(): void`; `useChatRealtime(): { connected: boolean }` — layout'da bir marta chaqiriladi, `chat:message` → `['chat','messages',conversationId]` keshiga id bo'yicha takrorsiz qo'shadi va `['chat','conversations']` ni invalidatsiya qiladi; `chat:read` → shu suhbat xabarlarida qarshi tomon o'qigan xabarlarning `readAt` ini belgilaydi; `chat:unread` → `['chat','unread']` ni `{ total }` qiladi; `connect` (qayta ulanish ham) → `['chat']` kalitli barcha so'rovlarni invalidatsiya qiladi; `useUnreadCount(): number` (`['chat','unread']`, `GET /chat/unread-count`, ADMIN uchun so'rov yo'q); `logout()` (`lib/auth.ts`) `closeSocket()` ni chaqiradi.

- [ ] **Step 1:** Fayllarni yozing. Kesh yangilash funksiyalarini (`appendMessage(cache, message)`, `markMessagesRead(cache, readerId, readAt)`) alohida sof funksiya sifatida chiqaring va **`frontend/src/lib/chat.ts` ichida eksport qiling** (test infratuzilmasi yo'q, shuning uchun ularni qo'lda tekshirish oson bo'lsin).
- [ ] **Step 2:** `npx tsc --noEmit && npx next build` toza. Commit `feat(frontend): chat socket and realtime cache`.

### Task 8: Frontend — chat sahifalari

**Files:**
- Create: `frontend/src/components/chat-view.tsx`, `frontend/src/app/(student)/chat/page.tsx`, `frontend/src/app/admin/chat/page.tsx`

**Interfaces:**
- Consumes: Task 7 (`useChatRealtime`, kesh kalitlari), REST endpointlar (Task 6).
- Produces: `ChatView({ currentUserId: string })` — chap panel: suhbatlar ro'yxati (`GET /chat/conversations`, o'qilmagan nishoni, oxirgi xabar), "Yangi suhbat" (kontaktlar qidiruvi `GET /chat/contacts?q=`, tanlanganda `POST /chat/conversations`); o'ng panel: xabarlar (`GET .../messages`, "Oldingilarini yuklash" `before` bilan), o'zimniki o'ngda, vaqt va o'qilgan belgisi (`readAt`), kiritish (Enter yuboradi, Shift+Enter yangi qator, 2000 belgi hisoblagichi, bo'sh/probelda tugma o'chiq); yuborilgan xabar javobdan keshga qo'shiladi (socket aks-sadosi id bo'yicha takrorlanmaydi); suhbat ochiq bo'lganda va yangi qarshi tomon xabari kelganda `POST .../read`; ulanish yo'q bo'lsa "Qayta ulanmoqda…"; telefonda ro'yxat/suhbat alohida ekran (orqaga tugmasi); xato `ErrorBox`; matn `whitespace-pre-wrap` va React orqali (HTML yo'q).

- [ ] **Step 1:** Komponent va ikki sahifani yozing (ikkala sahifa `sessionUser()` dan `currentUserId` olib `ChatView` ni chizadi).
- [ ] **Step 2:** `npx tsc --noEmit && npx next build` toza. Commit `feat(frontend): chat view`.

### Task 9: Menyuga Chat va nishon, `useChatRealtime` ulash

**Files:**
- Modify: `frontend/src/components/student-layout.tsx`, `frontend/src/components/admin-layout.tsx`

**Interfaces:**
- Consumes: `useChatRealtime`, `useUnreadCount` (Task 7).

- [ ] **Step 1:** Talaba menyusiga `{ href: '/chat', label: 'Chat', icon }` (yangi `'chat'` ikonka `icons.tsx` ga), mobil menyu `grid-cols-5`; o'qituvchi menyusiga `/admin/chat` (faqat `TEACHER` uchun; `ADMIN` ga ko'rinmaydi). Havolada `useUnreadCount() > 0` bo'lsa nishon (9+ bo'lsa "9+"). Har ikkala layout'da `useChatRealtime()` (faqat `STUDENT`/`TEACHER` uchun faol).
- [ ] **Step 2:** `npx tsc --noEmit && npx next build` toza.
- [ ] **Step 3: Ikki brauzer oynasida qo'lda tekshirish** (DB nusxasi, backend 4001, frontend `next build` + `next start -p 4000` `NEXT_PUBLIC_API_URL=http://localhost:4001/api` bilan, `FRONTEND_URL=http://localhost:4000`; tugagach serverlarni to'xtating va `next build` ni standart sozlama bilan qayta ishga tushiring): talaba va o'qituvchi (ikkinchisi inkognito/boshqa tab context) — talaba yozadi → o'qituvchida sahifani yangilamasdan xabar va menyu nishoni paydo bo'ladi; o'qituvchi suhbatni ochadi → talabada "o'qildi" belgisi; admin menyusida "Chat" yo'q; internet uzib qayta ulansa xabarlar tiklanadi (backend'ni qayta ishga tushirib tekshirish mumkin); xabarda `<b>x</b>` matn sifatida ko'rinadi.
- [ ] **Step 4:** commit `feat(frontend): chat navigation and unread badges`.

### Task 10: Hujjat

**Files:**
- Modify: `README.md`, `backend/README.md`

- [ ] **Step 1:** README'ga "Chat va o'qituvchi roli" bo'limi (rol berish yo'li, demo hisob `teacher@example.com`, chat imkoniyatlari va cheklovlari); backend README'ga chat endpoint'lari va socket hodisalari ro'yxati, `FRONTEND_URL` socket CORS uchun ham ishlatilishi. **Step 2:** commit `docs: describe teacher role and chat`.
