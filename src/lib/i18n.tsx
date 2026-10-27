import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from './types';

const dict = {
  appName: ['فصلي', 'Fasli'],
  tagline: ['منصة واحدة للحصص والامتحانات والتصحيح والمتابعة', 'One place for classes, exams, grading and progress'],
  // auth
  signIn: ['تسجيل الدخول', 'Sign in'],
  createAccount: ['إنشاء حساب', 'Create account'],
  haveAccount: ['عندك حساب؟ سجّل دخول', 'Have an account? Sign in'],
  noAccount: ['معندكش حساب؟ اعمل واحد', 'No account? Create one'],
  email: ['البريد الإلكتروني', 'Email'],
  password: ['كلمة المرور', 'Password'],
  passwordHint: ['8 حروف على الأقل', 'At least 8 characters'],
  fullName: ['الاسم بالكامل', 'Full name'],
  forgot: ['نسيت كلمة المرور؟', 'Forgot password?'],
  resetSent: ['بعتنالك رابط لتغيير كلمة المرور على الإيميل.', 'We sent a password reset link to your email.'],
  checkEmail: ['بعتنالك رسالة تأكيد على الإيميل. افتحها وبعدين سجّل دخول.', 'We sent you a confirmation email. Open it, then sign in.'],
  notConfigured: ['التطبيق لسه مش متوصل بالسيرفر. حط مفاتيح Supabase في ملف ‎.env (اقرأ README).', 'The app is not connected to a server yet. Add your Supabase keys to .env (see README).'],
  // onboarding
  whoAreYou: ['إنت مين؟', 'Who are you?'],
  student: ['طالب', 'Student'], teacher: ['مدرس', 'Teacher'], parent: ['ولي أمر', 'Parent'], admin: ['إدارة المدرسة', 'School admin'],
  studentD: ['احضر الحصص، حل الامتحانات، وذاكر مع المساعد الذكي', 'Join classes, take exams, study with the AI tutor'],
  teacherD: ['ادّي حصص مباشرة، اعمل امتحانات بالذكاء الاصطناعي، وصحّح أسرع', 'Teach live, build exams with AI, grade faster'],
  parentD: ['تابع حضور ودرجات ابنك وكلّم المدرسين', 'Follow attendance and grades, message teachers'],
  adminD: ['سجّل مدرستك وادعُ المدرسين والطلاب', 'Register your school and invite teachers and students'],
  schoolName: ['اسم المدرسة', 'School name'],
  schoolCode: ['كود المدرسة', 'School code'],
  staffCodeHint: ['خده من إدارة المدرسة (كود المدرسين)', 'Get it from your school admin (staff code)'],
  studentCodeHint: ['خده من المدرسة أو المدرس', 'Get it from your school or teacher'],
  continue: ['متابعة', 'Continue'],
  back: ['رجوع', 'Back'],
  createSchool: ['سجّل المدرسة', 'Register school'],
  joinSchool: ['انضم للمدرسة', 'Join school'],
  // tabs
  home: ['الرئيسية', 'Home'], classes: ['الفصول', 'Classes'], exams: ['الامتحانات', 'Exams'], tutor: ['المساعد', 'Tutor'],
  progress: ['الدرجات', 'Grades'], messages: ['الرسائل', 'Messages'], settings: ['الإعدادات', 'Settings'], school: ['المدرسة', 'School'],
  // common
  save: ['حفظ', 'Save'], cancel: ['إلغاء', 'Cancel'], delete: ['حذف', 'Delete'], confirmDelete: ['اضغط تاني للتأكيد', 'Tap again to confirm'],
  loading: ['جاري التحميل…', 'Loading…'], retry: ['حاول تاني', 'Try again'], done: ['تم', 'Done'], close: ['قفل', 'Close'],
  copy: ['نسخ', 'Copy'], copied: ['اتنسخ', 'Copied'], open: ['افتح', 'Open'], edit: ['تعديل', 'Edit'], add: ['إضافة', 'Add'],
  min: ['دقيقة', 'min'], questionsN: ['سؤال', 'questions'], marks: ['درجة', 'marks'], of: ['من', 'of'], you: ['إنت', 'You'],
  goodMorning: ['صباح الخير', 'Good morning'], goodEvening: ['مساء الخير', 'Good evening'],
  nothingYet: ['لسه مفيش حاجة هنا.', 'Nothing here yet.'],
  // classes
  myClasses: ['فصولي', 'My classes'], allClasses: ['كل الفصول', 'All classes'],
  newClass: ['فصل جديد', 'New class'], className: ['اسم الفصل', 'Class name'], subject: ['المادة', 'Subject'],
  gradeLevel: ['الصف / السنة', 'Grade / year'], curriculum: ['المنهج', 'Curriculum'],
  joinClass: ['انضم لفصل', 'Join a class'], classCode: ['كود الفصل', 'Class code'], join: ['انضم', 'Join'],
  classCodeShare: ['ابعت الكود ده للطلاب علشان ينضموا', 'Share this code so students can join'],
  noClassesT: ['اعمل أول فصل ليك وابعت الكود للطلاب.', 'Create your first class and share its code with students.'],
  noClassesS: ['اكتب كود الفصل اللي المدرس اداهولك.', 'Enter the class code your teacher gave you.'],
  students: ['طالب', 'students'], people: ['الطلاب', 'Students'],
  live: ['الحصص', 'Live'], library: ['المكتبة', 'Library'],
  // live
  startNow: ['ابدأ حصة دلوقتي', 'Start a class now'], schedule: ['جدولة حصة', 'Schedule a class'],
  sessionTitle: ['عنوان الحصة', 'Class title'], when: ['الميعاد', 'Time'],
  liveNow: ['مباشر الآن', 'Live now'], scheduled: ['مجدولة', 'Scheduled'], ended: ['انتهت', 'Ended'],
  joinLive: ['ادخل الحصة', 'Join class'], startLive: ['ابدأ الحصة', 'Start class'], endLive: ['إنهاء الحصة', 'End class'],
  notStarted: ['المدرس لسه مبدأش الحصة', 'The teacher has not started yet'],
  attendance: ['الحضور', 'Attendance'], connecting: ['بيتصل…', 'Connecting…'], leave: ['خروج', 'Leave'],
  classNotes: ['ملاحظات الحصة', 'Class notes'], liveNeedsWeb: ['الحصة المباشرة على الموبايل محتاجة رابط الموقع (EXPO_PUBLIC_WEB_URL).', 'Live classes on mobile need the website URL (EXPO_PUBLIC_WEB_URL).'],
  // library
  libSub: ['ارفع الكتب وملخصات الدروس، والذكاء الاصطناعي يولّد منها الأسئلة ويذاكر بيها مع الطلاب.', 'Upload books and lesson summaries. AI builds questions from them and tutors students with them.'],
  uploadFile: ['ارفع ملف (PDF أو صورة أو نص)', 'Upload a file (PDF, photo or text)'],
  takePhoto: ['صوّر صفحة', 'Photograph a page'],
  writeNote: ['اكتب ملخص درس', 'Write a lesson summary'],
  noteTitle: ['عنوان الدرس', 'Lesson title'], noteBody: ['الملخص', 'Summary'],
  processing: ['بيقرأ الملف…', 'Reading file…'], failed: ['فشلت القراءة', 'Could not read'], ready: ['جاهز', 'Ready'],
  words: ['كلمة', 'words'], summarize: ['لخّصه', 'Summarize'], summary: ['الملخص', 'Summary'], showText: ['اعرض النص', 'Show text'], hideText: ['اخفي النص', 'Hide text'],
  buildExam: ['اعمل امتحان منه', 'Build an exam from it'], noMaterials: ['لسه مفيش ملفات في المكتبة.', 'No materials in the library yet.'],
  fileTooBig: ['الملف أكبر من 20 ميجا.', 'The file is larger than 20 MB.'],
  // exams
  newExam: ['امتحان جديد', 'New exam'], examTitle: ['عنوان الامتحان', 'Exam title'], duration: ['المدة بالدقائق', 'Duration (minutes)'],
  draft: ['مسودة', 'Draft'], published: ['منشور', 'Published'], closed: ['مقفول', 'Closed'],
  publish: ['انشر للطلاب', 'Publish to students'], saveDraft: ['احفظ مسودة', 'Save draft'], closeExam: ['اقفل الامتحان', 'Close exam'],
  aiGenerate: ['ولّد أسئلة بالذكاء الاصطناعي', 'Generate questions with AI'], sources: ['من ملفات المكتبة', 'From library files'],
  sourcesHint: ['الأسئلة هتطلع من المحتوى ده بس.', 'Questions will come only from this content.'],
  topic: ['الموضوع أو الدرس (اختياري لو اخترت ملف)', 'Topic or lesson (optional if you picked a file)'],
  count: ['عدد الأسئلة', 'Number of questions'], difficulty: ['المستوى', 'Difficulty'],
  easy: ['سهل', 'Easy'], medium: ['متوسط', 'Medium'], hard: ['صعب', 'Hard'], mixed: ['متنوع', 'Mixed'],
  generate: ['ولّد', 'Generate'], generating: ['بيولّد الأسئلة…', 'Generating…'], generated: ['اتضافت أسئلة، راجعها قبل النشر', 'Questions added. Review them before publishing.'],
  addQuestion: ['أضف سؤال بإيدك', 'Add a question manually'], qType: ['نوع السؤال', 'Question type'],
  mcq: ['اختياري', 'Multiple choice'], tf: ['صح وغلط', 'True / False'], num: ['رقمي', 'Numeric'], written: ['مقالي', 'Written'],
  qText: ['نص السؤال', 'Question'], options: ['الاختيارات (اضغط على الصح)', 'Options (tap the correct one)'],
  correctAnswer: ['الإجابة الصحيحة', 'Correct answer'], points: ['الدرجة', 'Marks'], rubric: ['معايير التصحيح', 'Marking rubric'],
  criterion: ['المعيار', 'Criterion'], addCriterion: ['+ معيار', '+ Criterion'], addToExam: ['أضف للامتحان', 'Add to exam'],
  trueW: ['صح', 'True'], falseW: ['خطأ', 'False'], tag: ['الدرس / الكود', 'Lesson / code'],
  needTitleQ: ['اكتب عنوان وضيف سؤال واحد على الأقل.', 'Add a title and at least one question.'],
  needQ: ['اكتب نص السؤال والإجابة الصحيحة.', 'Write the question and its correct answer.'],
  examSaved: ['اتحفظ', 'Saved'], examPublished: ['اتنشر للطلاب', 'Published to students'],
  submissions: ['التسليمات', 'Submissions'], needReview: ['محتاجة مراجعة', 'Need review'], average: ['المتوسط', 'Average'],
  noSubmissions: ['لسه محدش سلّم.', 'No submissions yet.'], noExams: ['مفيش امتحانات لسه.', 'No exams yet.'],
  startExam: ['ابدأ الامتحان', 'Start exam'], resume: ['كمّل', 'Resume'], viewResult: ['النتيجة', 'Result'],
  examIntro: ['الأسئلة الموضوعية بتتصحح فورًا. المقالي بيصححه الذكاء الاصطناعي على معايير التصحيح، والمدرس بيراجع قبل الاعتماد.', 'Objective questions are marked instantly. Written answers are marked by AI against the rubric, then reviewed by your teacher.'],
  question: ['سؤال', 'Question'], next: ['التالي', 'Next'], prev: ['السابق', 'Previous'], submit: ['سلّم الامتحان', 'Submit exam'],
  confirmSubmit: ['متأكد؟ اضغط تاني للتسليم', 'Sure? Tap again to submit'], yourAnswer: ['إجابتك', 'Your answer'],
  writeHere: ['اكتب إجابتك وخطوات الحل…', 'Write your answer and working…'],
  timeUp: ['الوقت خلص، اتسلّم تلقائيًا', 'Time is up. Submitted automatically.'],
  grading: ['بيتصحح…', 'Marking…'], graded: ['اتصحح', 'Marked'], approved: ['معتمد', 'Approved'], inProgress: ['لم يُسلّم', 'In progress'],
  awaitingReview: ['بانتظار مراجعة المدرس', 'Awaiting teacher review'],
  correct: ['الإجابة الصحيحة:', 'Correct answer:'], aiMarked: ['صححه الذكاء الاصطناعي', 'Marked by AI'],
  approve: ['اعتمد الدرجة', 'Approve grade'], unapprove: ['إلغاء الاعتماد', 'Undo approval'], approvedToast: ['اتعتمدت ووصلت للطالب وولي الأمر', 'Approved and shared with student and parent'],
  aiSuggested: ['اقتراح الذكاء الاصطناعي', 'AI suggested'], total: ['الإجمالي', 'Total'], noAnswer: ['(مفيش إجابة)', '(no answer)'],
  regrade: ['صحّح تاني بالذكاء الاصطناعي', 'Re-mark with AI'],
  // tutor
  tutorTitle: ['المساعد الذكي', 'AI tutor'], tutorSub: ['بيشرحلك خطوة بخطوة من ملفات مدرسك. بيوجّهك ومش بيحل الواجب بدالك.', 'Explains step by step from your teacher’s files. It guides you; it won’t do your homework for you.'],
  ask: ['اسأل المساعد…', 'Ask the tutor…'], thinking: ['بيفكّر…', 'Thinking…'], pickClass: ['اختار المادة', 'Pick a subject'],
  tq1: ['اشرحلي آخر درس', 'Explain the latest lesson'], tq2: ['ادّيني 3 أسئلة تدريب', 'Give me 3 practice questions'], tq3: ['إيه أضعف حاجة عندي؟', 'What is my weakest area?'],
  clearChat: ['امسح المحادثة', 'Clear chat'],
  // progress / parent
  recentResults: ['آخر النتائج', 'Recent results'], noResults: ['لسه مفيش نتايج.', 'No results yet.'],
  linkChild: ['اربط ابنك', 'Link your child'], childCode: ['كود الطالب', 'Student code'], childCodeHint: ['الطالب يلاقيه في الإعدادات عنده', 'Your child finds it in their Settings'],
  children: ['أبنائي', 'My children'], myCode: ['الكود بتاعي لولي الأمر', 'My code for my parent'],
  attendanceRate: ['نسبة الحضور', 'Attendance'], examsTaken: ['امتحانات', 'Exams taken'],
  // messages
  newMessage: ['رسالة جديدة', 'New message'], typeMessage: ['اكتب رسالتك…', 'Write a message…'], send: ['ابعت', 'Send'],
  noMessages: ['مفيش رسايل لسه.', 'No messages yet.'], pickPerson: ['ابعت لمين؟', 'Who to message?'],
  // admin / settings
  dashboard: ['لوحة المدرسة', 'School dashboard'], teachers: ['مدرس', 'teachers'], parents: ['ولي أمر', 'parents'],
  inviteCodes: ['أكواد الانضمام', 'Join codes'], staffCode: ['كود المدرسين', 'Staff code'], studentCode: ['كود الطلاب وأولياء الأمور', 'Student & parent code'],
  newCodes: ['اعمل أكواد جديدة', 'Make new codes'], curricula: ['المناهج', 'Curricula'], avgScore: ['متوسط الدرجات', 'Average score'],
  language: ['اللغة', 'Language'], profile: ['الملف الشخصي', 'Profile'], signOut: ['تسجيل خروج', 'Sign out'], version: ['الإصدار', 'Version'],
  saved: ['اتحفظ', 'Saved'],
  // curricula
  american: ['أمريكان', 'American'], igcse: ['IGCSE', 'IGCSE'], stem: ['STEM', 'STEM'], bac: ['البكالوريا المصرية', 'Egyptian Baccalaureate'],
} as const satisfies Record<string, readonly [string, string]>;

export type TKey = keyof typeof dict;

type Ctx = { lang: Lang; rtl: boolean; t: (k: TKey) => string; setLang: (l: Lang) => void; ready: boolean };
const LangCtx = createContext<Ctx | null>(null);
const KEY = 'fasli.lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const device = (getLocales()[0]?.languageCode ?? 'ar') === 'en' ? 'en' : 'ar';
  const [lang, setLangState] = useState<Lang>(device);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === 'ar' || v === 'en') setLangState(v); }).finally(() => setReady(true));
  }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); AsyncStorage.setItem(KEY, l).catch(() => {}); }, []);
  const value = useMemo<Ctx>(() => ({
    lang, rtl: lang === 'ar', ready, setLang,
    t: (k) => dict[k]?.[lang === 'ar' ? 0 : 1] ?? k,
  }), [lang, ready, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useT() {
  const c = useContext(LangCtx);
  if (!c) throw new Error('useT outside LangProvider');
  return c;
}

/** Text direction of a piece of content, judged from its characters (for mixed Arabic/English content). */
export const isArabicText = (s: string) => /[؀-ۿ]/.test(s.slice(0, 200));
