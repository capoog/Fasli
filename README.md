<p align="center"><img src="assets/logo.png" width="96" alt="Fasli logo"></p>

<h1 align="center">فصلي · Fasli</h1>

<p align="center">منصة واحدة للحصص المباشرة والامتحانات والتصحيح بالذكاء الاصطناعي ومتابعة الطلاب، للمدارس الأمريكان والـ IGCSE والـ STEM والبكالوريا المصرية.<br>
One platform for live classes, AI-built exams, AI grading and student progress — for American, IGCSE, STEM and Egyptian Baccalaureate schools.</p>

---

## المحتوى · Contents
1. [المميزات](#المميزات--features)
2. [التقنيات (كلها ليها خطة مجانية)](#التقنيات--stack)
3. [التشغيل خطوة بخطوة](#التشغيل-خطوة-بخطوة)
4. [أول استخدام](#أول-استخدام)
5. [هيكل المشروع](#هيكل-المشروع--project-structure)
6. [Setup in English](#setup-in-english)

خطة الإطلاق الكاملة في [docs/LAUNCH.md](docs/LAUNCH.md).

---

## المميزات · Features

| الدور | اللي يقدر يعمله |
|---|---|
| **إدارة المدرسة** | تسجيل المدرسة، أكواد انضمام للمدرسين والطلاب، لوحة بالأرقام وتوزيع المناهج، كل الفصول |
| **المدرس** | يعمل فصول بكود، يدّي حصة فيديو مباشرة (كاميرا، مشاركة شاشة، شات)، **يرفع كتب PDF وصور صفحات وملخصات للمكتبة**، يولّد امتحانات بالذكاء الاصطناعي **من ملفاته**، يصحّح ويعتمد الدرجات، يراسل أولياء الأمور |
| **الطالب** | ينضم لفصل بالكود، يدخل الحصص، يحل الامتحانات بتوقيت، يشوف نتيجته وملاحظات على كل معيار، يذاكر مع **مساعد ذكي بيشرح من ملفات المدرس** |
| **ولي الأمر** | يربط ابنه بكود، يشوف المتوسط والنتايج والحضور، يراسل المدرسين |

- **عربي وإنجليزي بالكامل** مع اتجاه من اليمين للشمال.
- **نظام درجات حسب المنهج:** GPA للأمريكان، 9–1 للـ IGCSE، مستويات Rubric للـ STEM، ومن 100 للبكالوريا.
- **حماية:** الإجابات الصحيحة متخزنة في جدول منفصل مش بيوصله الطالب، والتصحيح الموضوعي بيحصل جوه قاعدة البيانات، وكل جدول عليه صلاحيات (Row Level Security).
- **تطبيق واحد** بيشتغل كموقع وكتطبيق iOS وAndroid.

## التقنيات · Stack

| الجزء | الخدمة | الخطة المجانية |
|---|---|---|
| التطبيق (موبايل + ويب) | [Expo](https://expo.dev) · React Native · Expo Router | مجاني |
| قاعدة البيانات، تسجيل الدخول، الملفات، دوال السيرفر | [Supabase](https://supabase.com) | Free tier |
| الفيديو المباشر | [LiveKit Cloud](https://livekit.io) | Free tier |
| الذكاء الاصطناعي | Google Gemini **أو** Claude (تختار بإعداد واحد) | Gemini له Free tier |
| رفع الموقع | [Cloudflare Pages](https://pages.cloudflare.com) | مجاني |
| بناء تطبيقات الموبايل | [EAS Build](https://expo.dev/eas) | عدد بنايات مجاني شهريًا |

## التشغيل خطوة بخطوة

> محتاج: Node.js 22، وحساب على Supabase وLiveKit وGoogle AI Studio (أو Anthropic).

### 1) نزّل المشروع
```bash
git clone https://github.com/capoog/fasli.git
cd fasli
npm install
```

### 2) اعمل مشروع Supabase
1. ادخل [supabase.com](https://supabase.com) ← **New project**.
2. من **Project Settings → API** خد: `Project URL` و `anon public key`.
3. اربط المشروع وارفع قاعدة البيانات والدوال:
```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
npx supabase functions deploy
```

### 3) مفاتيح السيرفر (الذكاء الاصطناعي والفيديو)
1. **Gemini (مجاني):** من [aistudio.google.com](https://aistudio.google.com/apikey) اعمل API key.
2. **LiveKit:** من [cloud.livekit.io](https://cloud.livekit.io) اعمل مشروع وخد `URL` و `API Key` و `API Secret`.
3. انسخ `supabase/functions/.env.example` لـ `supabase/functions/.env` واملاه، وبعدين:
```bash
npx supabase secrets set --env-file supabase/functions/.env
```

### 4) إعدادات التطبيق
انسخ `.env.example` لـ `.env` وحط فيه `EXPO_PUBLIC_SUPABASE_URL` و `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### 5) شغّله
```bash
npm run web        # على المتصفح
npm start          # امسح الكود بتطبيق Expo Go على موبايلك
```
> الحصص المباشرة على الموبايل محتاجة Development Build (`npx eas-cli build --profile development`) لأنها بتستخدم الكاميرا والمايك.

### 6) ارفع الموقع (Cloudflare Pages)
```bash
npm run build:web          # بيطلع فولدر dist
```
في Cloudflare Pages: **Create project → Connect to Git** واختار الـ Repo، وخلي:
- Build command: `npm run build:web`
- Output directory: `dist`
- Environment variables: نفس اللي في `.env`

بعدها حط رابط الموقع في `EXPO_PUBLIC_WEB_URL`، وفي Supabase: **Authentication → URL Configuration → Site URL**.

### 7) تطبيقات الموبايل
```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview   # ملف APK للتجربة
npx eas-cli build --platform all --profile production     # للمتاجر
npx eas-cli submit --platform all
```

## أول استخدام
1. اعمل حساب واختار **إدارة المدرسة** واكتب اسم المدرسة.
2. من الإعدادات خد **كود المدرسين** و **كود الطلاب وأولياء الأمور** وابعتهم.
3. المدرس يعمل حساب ← **مدرس** ← كود المدرسين، وبعدين يعمل فصل ويبعت **كود الفصل** للطلاب.
4. الطالب يعمل حساب ← **طالب** ← كود الطلاب، وبعدين ينضم للفصل بكوده.
5. ولي الأمر يعمل حساب ← **ولي أمر** ← كود الطلاب، وبعدين يربط ابنه بـ **الكود اللي في إعدادات الطالب**.

## هيكل المشروع · Project structure
```
src/
  app/                    الشاشات (Expo Router)
    welcome, auth, onboard   الترحيب وتسجيل الدخول والانضمام
    room                     صفحة الفيديو اللي بتفتح جوه تطبيق الموبايل
    (app)/                   كل اللي محتاج تسجيل دخول
      (tabs)/                الرئيسية، الفصول، الامتحانات، المساعد، الدرجات، الرسائل، الإعدادات
      class/[id]             الفصل: الحصص، المكتبة، الامتحانات، الطلاب
      exam/new, exam/[id]    إنشاء امتحان بالذكاء الاصطناعي، حل الامتحان
      submission/[id]        النتيجة والتصحيح والاعتماد
      live/[id], chat/[id]   الحصة المباشرة، المحادثات
  components/             عناصر الواجهة، الشعار، الفيديو
  features/               أجزاء الشاشات لكل دور
  lib/                    الاتصال بالسيرفر، الترجمة، الألوان، أنظمة الدرجات
supabase/
  migrations/             قاعدة البيانات والصلاحيات
  functions/              الذكاء الاصطناعي (توليد، تصحيح، تلخيص، قراءة ملفات، مساعد) وتوكن الفيديو
assets/                   الشعار والأيقونات (npm run icons يعيد توليدها)
```

---

## Setup in English
1. `npm install`
2. Create a Supabase project, then `npx supabase link --project-ref <ref>`, `npx supabase db push`, `npx supabase functions deploy`.
3. Get a Gemini API key (free tier) or an Anthropic key, and a LiveKit Cloud project. Fill `supabase/functions/.env` from the example and run `npx supabase secrets set --env-file supabase/functions/.env`.
4. Copy `.env.example` to `.env` with your Supabase URL and anon key.
5. `npm run web` or `npm start`. Live video on phones needs a development build (`npx eas-cli build --profile development`).
6. Deploy the web app to Cloudflare Pages (build `npm run build:web`, output `dist`), then set `EXPO_PUBLIC_WEB_URL` to its address.
7. Build store apps with `npx eas-cli build --platform all --profile production`.

**Scripts:** `npm run typecheck` · `npm run build:web` · `npm run icons`

**Security model:** every table uses Row Level Security; answer keys live in `question_keys`, readable only by the class teacher; objective marking runs inside `submit_exam()`; school join codes are only returned by `school_codes()` (admins see both, teachers see the student code); AI and video secrets stay in Edge Function secrets.
