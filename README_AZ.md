# Sift — Süni İntellektlə Xəbər Analizi

> **„Siqnalı səs-küydən ayır."**

🌍 **Dil seçimi**: [🇬🇧 English](README.md) · **🇦🇿 Azərbaycan dili**

---

Sift, **Neurotime Hackathon** çağırışı üçün hazırlanmış yüksək sürətli və ağıllı xəbər axtarış və analiz platformasıdır. İstifadəçilərə 10–15 May 2026 tarixləri arasında toplanmış ~20,915 çoxdilli xəbər məqaləsi (Azərbaycan, Rus və İngilis dilləri) üzərində təbii dildə semantik, açar sözlü və tarix-ağıllı axtarış imkanı verir.

Sift, **Supabase (pgvector)** və **OpenAI API**-ləri ilə gücləndirilmiş hibrid axtarış mühərriki üzərində qurulub və premium isti editorial kağız dizayn sistemi ilə təchiz olunub.

---

## 🛠️ Texnologiya Yığını
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, TypeScript strict rejim)
- **Dizayn**: [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Verilənlər bazası**: [Supabase](https://supabase.com/) (PostgreSQL + `pgvector` uzantısı)
- **Süni İntellekt**: [OpenAI API](https://openai.com/)
  - **Embeddinklər**: `text-embedding-3-small` (1536 ölçülü)
  - **Dil Modeli**: `gpt-4o-mini` (sürətli, büdcəyə uyğun)
- **Data Emalı**: `xlsx` (Excel fayllarının analizi)
- **Telegram Bot**: `Grammy` framework

---

## 🧠 Hibrid Uyğunluq Hesablama Məntiqi

Dəqiq nəticələr üçün Sift, **sıx vektor axtarışını (semantik)** ilə **seyrək termin uyğunlaşdırmasını (açar söz)** PostgreSQL mühərriki daxilində xüsusi RPC funksiyası (`match_articles`) vasitəsilə birləşdirir.

$$\text{Birləşmiş Bal} = (0.7 \times \text{Semantik Bal}) + (0.3 \times \text{Açar Söz Balı})$$

- **Semantik Bal**: Kosinus oxşarlığı ilə hesablanır (`1 - (embedding <=> sorğu_embedding)`)
- **Açar Söz Balı**: PostgreSQL GIN indeksli tam mətn axtarışı (`ts_rank_cd`)
- **Ağırlıqlar**: Semantik = 0.7, Açar söz = 0.3

---

## ⚙️ Quraşdırma və İşə Salma

### 1. Mühit Dəyişənləri
```bash
cp .env.example .env.local
```

Aşağıdakı dəyərləri doldurun:
```env
NEXT_PUBLIC_SUPABASE_URL=supabase_layihə_urliniz
NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase_açıq_açarınız
SUPABASE_SERVICE_ROLE_KEY=supabase_xidmət_açarınız
OPENAI_API_KEY=openai_api_açarınız
TELEGRAM_BOT_TOKEN=telegram_bot_tokeniniz
```

### 2. Verilənlər Bazası
`supabase_schema.sql` faylındakı SQL əmrlərini Supabase SQL Redaktorunda icra edin.

### 3. Asılılıqların Quraşdırılması
```bash
pnpm install
```

### 4. Məlumatların Daxil Edilməsi
```bash
# Test üçün (50 sətir)
npx tsx scripts/ingest.ts --limit 50

# Tam korpus (20,915 məqalə)
npx tsx scripts/ingest.ts

# Sıfırdan başlamaq
npx tsx scripts/ingest.ts --reset
```

### 5. Tətbiqin İşə Salınması
```bash
# İnkişaf rejimi
pnpm dev

# İstehsal quruluşu
npx next build
```

### 6. Telegram Botun İşə Salınması
```bash
npx tsx scripts/bot.ts
```

---

## 🏷️ Varlıq İntellekti

Sift, Azərbaycan, Rus və İngilis dillərində çoxdilli xüsusi isim çıxarma və təsnifat mühərriki ehtiva edir:

1. **Sürətli Tokenizator** — Regex əsaslı, uniqram + biqram çıxarma, 3 dilli söz filtri, böyük hərf vurğulaması (2.5x)
2. **LLM Təsnifatı** — Bütün namizədlər üçün **tək bir** GPT-4o-mini çağırışı: ORG, PERSON, LOCATION, TOPIC
3. **Xərc**: Tam verilənlər bazası üçün **<$0.01**

```bash
npx tsx scripts/compute-entities.ts
```

---

## 🤖 Telegram Bot

Grammy framework üzərində qurulmuş tam inteqrasiyalı söhbət botu:

- **Təbii dil sorğuları** — əmr yox, sadəcə yazın: *„AccessBank xəbərləri 14 Maydan"*
- **HTML kartları** — başlıq, mənbə, dil, uyğunluq faizi
- **Daxili düymələr** — 🏷️ Top varlıqlar, 📄 Daha çox, 🔁 Yeni axtarış
- **64 bayt limiti** — Telegram callback məhdudiyyəti üçün vəziyyətsiz yenidənyaradıcı protokol

### Bot Quraşdırması
1. Telegram-da `@BotFather`-a `/newbot` göndərin
2. Token-i `.env.local`-a əlavə edin
3. `npx tsx scripts/bot.ts` ilə başladın

---

## ⚠️ Məlum Məhdudiyyətlər

1. **Çoxdilli FTS** — PostgreSQL `'simple'` lüğəti istifadə olunur (Azərbaycan dilinin lemmatizasiyası yoxdur)
2. **Kateqoriya Standartlaşdırması** — Üst-üstə düşən semantik kateqoriyalar ayrıca saxlanılır
3. **OpenAI Xərci** — Tam daxiletmə: ~$0.13, Varlıq təsnifatı: <$0.01
4. **Excel Tarixləri** — ISO string və ya Excel rəqəm formatı dəstəklənir

---

## 📜 Lisenziya

Bu layihə [MIT Lisenziyası](LICENSE) altında lisenziyalaşdırılıb.

---

## 📽️ Demo

Tam təqdimat ssenarisini [DEMO_SCRIPT.md](DEMO_SCRIPT.md) faylında tapa bilərsiniz.
