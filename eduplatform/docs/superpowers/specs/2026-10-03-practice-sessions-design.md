# Shaxsiy mashq sessiyalari (moslashgan test + oraliqli takrorlash) — dizayn

Sana: 2026-10-03

## Maqsad

O'quvchi hali ko'rmagan savollarni yechsin va bilmagan (xato qilgan) savollarini vaqt oralig'ida takrorlab mustahkamlasin. Mavjud testlar o'zgarmaydi; ular yoniga yangi **"Mashq sessiyasi"** rejimi qo'shiladi.

Muvaffaqiyat mezoni:
- Sessiya savollari barcha faol testlardagi savollar orasidan o'quvchi uchun yig'iladi.
- Xato qilingan savol 1 kundan keyin qayta chiqadi; to'g'ri javob oraliqni cho'zadi.
- O'quvchi dashboard'da "bugun takrorlash kerak: N ta" ni ko'radi.

Qamrab olinmaydi (YAGNI): SM-2, savollar uchun qiyinlik bahosi, admin sozlamalari, bildirishnomalar.

## Ma'lumotlar modeli

Yangi model `UserQuestionStat` (`@@unique([userId, questionId])`):

| Maydon | Tur | Izoh |
|---|---|---|
| userId, questionId | String | Cascade o'chirish |
| box | Int (0–4) | Leitner qutisi |
| correctCount, wrongCount | Int | Statistika |
| lastSeenAt | DateTime | Oxirgi javob vaqti |
| nextReviewAt | DateTime | Navbatdagi takrorlash |

Qator o'quvchi savolga birinchi marta javob bergandan keyin yaratiladi. Qator yo'q bo'lsa, savol "yangi".

`TestAttempt` o'zgaradi: `testId` ixtiyoriy (`String?`) va `isPractice Boolean @default(false)` qo'shiladi. Practice sessiyada `testId = null`, `difficulty` o'quvchining `currentDifficulty` qiymati. Sessiya savollari ro'yxati start paytida yangi `PracticeAttemptQuestion` jadvaliga (`attemptId`, `questionId`, `order`) yoziladi. Submit shu ro'yxatga qarshi tekshiradi. Javoblar mavjud tamoyildagidek submit paytida `AttemptAnswer` ga yoziladi.

## Leitner mantig'i (`PracticeScheduler`, sof funksiyalar)

- Takrorlash oraliqlari quti bo'yicha: 0→1 kun, 1→2, 2→4, 3→8, 4→16.
- To'g'ri javob: `box = min(box + 1, 4)`. Xato javob: `box = 0`.
- `nextReviewAt = hozir + oraliq(box)`. Javob berilmagan (o'tkazib yuborilgan) savol xato hisoblanadi.
- Birinchi marta ko'rilgan savol: to'g'ri bo'lsa `box = 1`, xato bo'lsa `box = 0`.

## Savollarni tanlash (`PracticeService.buildSession`)

Hajm: 12 ta savol. Faqat `isActive` test va `isActive` mavzudagi savollar.

1. **Muddati kelgan** (`nextReviewAt <= now`): eng eski muddatdan boshlab, ko'pi bilan 6 ta (50%).
2. **Yangi** (statistikasi yo'q): zaif mavzular (`UserTopicProgress.averagePercentage < 50`) ustuvor, keyin `currentDifficulty` ga yaqin test qiyinligi. Qolgan o'rinlarni to'ldiradi.
3. **To'ldiruvchi** (muddati kelmagan, `box <= 1`): faqat yuqoridagilar 12 taga yetmasa.

Natija aralashtiriladi. Agar 12 ta yig'ilmasa, mavjudicha (kamida 1 ta) beriladi; 0 ta bo'lsa — bo'sh holat.

## Endpoint'lar (faqat STUDENT roli, mavjud JWT guard)

- `POST /practice/start` → `{ attemptId, questions[] }` (to'g'ri javoblarsiz, mavjud `start` formatida). Faol bajarilmagan practice sessiya bo'lsa, o'shani qaytaradi (takroriy bosishdan himoya).
- `POST /practice/:attemptId/submit` → baholaydi, `UserQuestionStat` ni bitta tranzaksiyada yangilaydi, natija va savol bo'yicha to'g'ri/xato qaytaradi.
- `GET /practice/overview` → `{ dueCount, newCount, weakTopics[] }`.

Mavjud `AttemptsService.submit` ichidagi baholash (javoblarni tekshirish + ball hisoblash) umumiy yordamchi funksiyaga ajratiladi; oddiy testlar ham javobdan keyin `UserQuestionStat` ni yangilaydi. Practice sessiya `UserTopicProgress` va `currentDifficulty` ni o'zgartirmaydi (daraja o'sishi hozirgidek oddiy testlardan).

Mavjud kodda `attempt.test` ga tayanadigan joylar (`AttemptsService.history/get`, `ProgressService.history`, frontend tarix va natija sahifalari) `testId = null` holatiga moslashtiriladi: practice sessiya nomi "Shaxsiy mashq".

## Xato holatlari

- Boshqa o'quvchining sessiyasi: 403. Mavjud emas: 404. Allaqachon yakunlangan: 409.
- Submit'da sessiyaga tegishli bo'lmagan savol yoki variant: 400 (mavjud tekshiruv uslubida).
- Tanlash paytida savol yo'q bo'lsa: `start` 200 bilan `questions: []` va frontend bo'sh holat ko'rsatadi; sessiya yaratilmaydi.
- Sessiya vaqti cheklanmaydi.

## Frontend

- Dashboard: "Bugungi takrorlash: N ta savol" kartochkasi va [Mashqni boshlash] tugmasi (N=0 bo'lsa: "Bugun takrorlash yo'q, yangi savollarni yeching").
- `/practice`: mavjud test yechish ekrani komponentlarini qayta ishlatadi. Natija sahifasi har bir savol bo'yicha to'g'ri/xato va keyingi takrorlash muddatini ("ertaga", "4 kundan keyin") ko'rsatadi.
- Matnlar o'zbek tilida, mavjud uslubda.

## Testlash

- `PracticeScheduler` unit testlari: quti o'tishlari, oraliqlar, chegaraviy (box 4 dan oshmaydi, xatoda 0).
- `PracticeService` tanlash testlari (prisma mock bilan, `adaptive.service.spec.ts` uslubida): muddati kelgan ustuvor, 50% chegara, yangi savollar tanlovi, bo'sh holat.
- Submit: noto'g'ri savol/variant rad etilishi, ikki marta yuborish 409.
