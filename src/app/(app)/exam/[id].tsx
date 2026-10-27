import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Empty, ErrorText, Field, ListItem, Loading, Pill, Row, Screen, Stack, Stat, Txt, Avatar, useConfirm, useToast } from '@/components/ui';
import { ExamStatusPill, SubStatusPill } from '@/features/common';
import { EXAM_COLS, getClass, profilesByIds, SUB_COLS } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { pct } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { callFn, must, supabase } from '@/lib/supabase';
import { fonts, useColors } from '@/lib/theme';
import type { ClassRow, Exam, Question, Submission } from '@/lib/types';
import { errMsg, useData } from '@/lib/useData';

const Q_COLS = 'id, exam_id, position, type, prompt, options, rubric, points, tag';

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1597334677);
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { data, error, reload } = useData(async () => {
    const exam = must(await supabase.from('exams').select(EXAM_COLS).eq('id', id).single()) as Exam;
    const [cls, questions] = await Promise.all([
      getClass(exam.class_id),
      must(await supabase.from('questions').select(Q_COLS).eq('exam_id', id).order('position')) as Question[],
    ]);
    return { exam, cls, questions };
  }, [id]);
  if (!data) return error ? <Screen back><ErrorText error={error} /></Screen> : <Loading />;
  if (data.cls.teacher_id === me.id || me.role === 'admin') return <TeacherExam {...data} reload={reload} />;
  if (me.role === 'student') return <TakeExam {...data} />;
  return <Screen back title={data.exam.title}><Empty text={data.cls.name} /></Screen>;
}

/* ───────────────────────── Teacher: overview, publish, submissions ───────────────────────── */
function TeacherExam({ exam, cls, questions, reload }: { exam: Exam; cls: ClassRow; questions: Question[]; reload: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const me = useMe();
  const isTeacher = cls.teacher_id === me.id;
  const { data } = useData(async () => {
    const subs = must(await supabase.from('submissions').select(SUB_COLS).eq('exam_id', exam.id).order('submitted_at', { ascending: false })) as Submission[];
    const names = await profilesByIds(subs.map((s) => s.student_id));
    return { subs, names };
  }, [exam.id]);
  const done = (data?.subs ?? []).filter((s) => s.status === 'graded' || s.status === 'approved');
  const avg = done.length ? Math.round(done.reduce((a, s) => a + pct(s.score, s.max_score), 0) / done.length) : null;
  const total = questions.reduce((a, q) => a + Number(q.points), 0);

  async function setStatus(status: Exam['status']) {
    await supabase.from('exams').update({ status, ...(status === 'published' ? { published_at: new Date().toISOString() } : {}) }).eq('id', exam.id);
    toast(t('saved')); reload();
  }

  return (
    <Screen back title={exam.title} eyebrow={cls.name}>
      <Row gap={8} wrap><ExamStatusPill e={exam} /><Pill text={`${exam.duration_min} ${t('min')}`} /><Pill text={`${questions.length} ${t('questionsN')} · ${total} ${t('marks')}`} /></Row>
      {isTeacher && (
        <Row gap={8} wrap>
          {exam.status === 'draft' && <Button flex kind="pen" title={t('publish')} onPress={() => setStatus('published')} />}
          {exam.status === 'published' && <Button flex kind="ghost" title={t('closeExam')} onPress={() => setStatus('closed')} />}
          {exam.status === 'closed' && <Button flex kind="ghost" title={t('publish')} onPress={() => setStatus('published')} />}
          {!data?.subs.length && <Button flex kind="ghost" icon="pen" title={t('edit')} onPress={() => router.push(`/exam/new?class=${cls.id}&exam=${exam.id}`)} />}
          {!data?.subs.length && <Button kind="line" icon="trash" title={confirm.armed === 'del' ? t('confirmDelete') : t('delete')}
            onPress={() => confirm.ask('del', async () => { await supabase.from('exams').delete().eq('id', exam.id); router.back(); })} />}
        </Row>
      )}
      <Row gap={10} wrap>
        <Stat value={String(data?.subs.length ?? '—')} label={t('submissions')} />
        <Stat value={String((data?.subs ?? []).filter((s) => s.status === 'graded' || s.status === 'grading').length)} label={t('needReview')} />
        <Stat value={avg != null ? `${avg}%` : '—'} label={t('average')} />
      </Row>
      <Card>
        <Txt v="h2">{t('submissions')}</Txt>
        {data?.subs.length ? data.subs.map((s, i) => (
          <ListItem key={s.id} first={i === 0} title={data.names[s.student_id]?.full_name ?? '—'} subtitle={s.status === 'in_progress' ? t('inProgress') : `${s.score}/${s.max_score}`}
            left={<Avatar name={data.names[s.student_id]?.full_name ?? '?'} id={s.student_id} />} right={<SubStatusPill s={s} />}
            onPress={s.status === 'in_progress' ? undefined : () => router.push(`/submission/${s.id}`)} />
        )) : <Empty icon="exam" text={t('noSubmissions')} />}
      </Card>
      <Card>
        <Txt v="h2">{t('questionsN')}</Txt>
        {questions.map((q, i) => (
          <Stack key={q.id} gap={4} style={{ paddingTop: i ? 10 : 0 }}>
            <Row gap={6}><Pill text={t(q.type)} /><Pill text={String(q.points)} />{q.tag ? <Pill tone="brand" text={q.tag} /> : null}</Row>
            <Txt auto>{`${i + 1}. ${q.prompt}`}</Txt>
          </Stack>
        ))}
      </Card>
    </Screen>
  );
}

/* ───────────────────────── Student: take the exam ───────────────────────── */
function TakeExam({ exam, cls, questions }: { exam: Exam; cls: ClassRow; questions: Question[] }) {
  const { t } = useT();
  const c = useColors();
  const router = useRouter();
  const me = useMe();
  const toast = useToast();
  const [sub, setSub] = useState<Submission | null>(null);
  const [checking, setChecking] = useState(true);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, unknown>>({});
  const [left, setLeft] = useState(exam.duration_min * 60);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const store = sub ? `fasli.answers.${sub.id}` : '';

  useEffect(() => {
    (async () => {
      const s = (await supabase.from('submissions').select(SUB_COLS).eq('exam_id', exam.id).eq('student_id', me.id).maybeSingle()).data as Submission | null;
      if (s && s.status !== 'in_progress') { router.replace(`/submission/${s.id}`); return; }
      if (s) { setSub(s); const saved = await AsyncStorage.getItem(`fasli.answers.${s.id}`); if (saved) setAns(JSON.parse(saved)); }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id]);

  useEffect(() => {
    if (!sub) return;
    const end = new Date(sub.started_at).getTime() + exam.duration_min * 60000;
    const tick = () => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0 && !submitted.current) { toast(t('timeUp')); submit(); }
    };
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);

  const order = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q.type === 'mcq' ? seededShuffle(q.options, `${me.id}${q.id}`) : q.options])), [questions, me.id]);

  function setAnswer(qid: string, v: unknown) {
    const next = { ...ans, [qid]: v };
    setAns(next);
    if (store) AsyncStorage.setItem(store, JSON.stringify(next)).catch(() => {});
  }

  async function start() {
    setBusy(true); setError(null);
    const { data, error: e } = await supabase.rpc('start_exam', { p_exam_id: exam.id });
    setBusy(false);
    if (e) setError(e.message); else setSub(data as Submission);
  }

  async function submit() {
    if (!sub || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const { data, error: e } = await supabase.rpc('submit_exam', { p_submission_id: sub.id, p_answers: ans });
      if (e) throw e;
      await AsyncStorage.removeItem(store).catch(() => {});
      if ((data as Submission).status === 'grading') callFn('ai-grade', { submission_id: sub.id }).catch(() => {});
      router.replace(`/submission/${sub.id}`);
    } catch (e) {
      submitted.current = false;
      setError(errMsg(e));
      setBusy(false);
    }
  }

  if (checking) return <Loading />;

  if (!sub) {
    const total = questions.reduce((a, q) => a + Number(q.points), 0);
    return (
      <Screen back title={exam.title} eyebrow={cls.name}>
        <Card>
          <Row gap={10} wrap>
            <Stat value={`${exam.duration_min}`} label={t('min')} />
            <Stat value={String(questions.length)} label={t('questionsN')} />
            <Stat value={String(total)} label={t('marks')} />
          </Row>
          <Txt muted>{t('examIntro')}</Txt>
          <ErrorText error={error} />
          <Button title={t('startExam')} loading={busy} onPress={start} disabled={exam.status !== 'published'} />
        </Card>
      </Screen>
    );
  }

  const q = questions[i];
  const a = ans[q.id];
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const answered = (qid: string) => ans[qid] !== undefined && ans[qid] !== '';

  return (
    <Screen title={exam.title} right={
      <View style={{ borderWidth: 1, borderColor: left < 120 ? c.pen : c.line, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: c.surface }}>
        <Txt style={{ fontFamily: fonts.displaySemi, color: left < 120 ? c.pen : c.ink }}>{`${mm}:${ss}`}</Txt>
      </View>}>
      <Row gap={5}>
        {questions.map((x, k) => (
          <Pressable key={x.id} onPress={() => setI(k)} style={{ flex: 1, height: 7, borderRadius: 99, backgroundColor: k === i ? c.ink : answered(x.id) ? c.brand : c.surface2 }} accessibilityLabel={`${t('question')} ${k + 1}`} />
        ))}
      </Row>
      <Card>
        <Row justify="space-between"><Txt v="eyebrow">{`${t('question')} ${i + 1} ${t('of')} ${questions.length}`}</Txt><Row gap={6}>{q.tag ? <Pill tone="brand" text={q.tag} /> : null}<Pill text={`${q.points} ${t('marks')}`} /></Row></Row>
        <Txt auto style={{ fontSize: 17, lineHeight: 28 }} selectable>{q.prompt}</Txt>
        {q.type === 'mcq' && order[q.id].map((o, k) => {
          const on = a === o;
          return (
            <Pressable key={o} onPress={() => setAnswer(q.id, o)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Row gap={12} style={{ borderWidth: 1.5, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brandSoft : c.surface, borderRadius: 12, padding: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: on ? c.brand : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt v="label" color={on ? c.onBrand : c.ink}>{'ABCDEF'[k]}</Txt>
                </View>
                <Txt auto style={{ flex: 1 }}>{o}</Txt>
              </Row>
            </Pressable>
          );
        })}
        {q.type === 'tf' && (
          <Row gap={10}>
            {[true, false].map((v) => {
              const on = a === v;
              return (
                <Pressable key={String(v)} onPress={() => setAnswer(q.id, v)} style={{ flex: 1 }} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <View style={{ borderWidth: 1.5, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brandSoft : c.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                    <Txt v="medium">{v ? t('trueW') : t('falseW')}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </Row>
        )}
        {q.type === 'num' && <Field value={a == null ? '' : String(a)} onChangeText={(v) => setAnswer(q.id, v)} keyboardType="decimal-pad" placeholder={t('yourAnswer')} style={{ textAlign: 'center', fontSize: 20 }} />}
        {q.type === 'written' && <Field value={a == null ? '' : String(a)} onChangeText={(v) => setAnswer(q.id, v)} multiline placeholder={t('writeHere')} style={{ minHeight: 180 }} />}
      </Card>
      <ErrorText error={error} />
      <Row gap={8}>
        <Button kind="ghost" title={t('prev')} disabled={i === 0} onPress={() => setI(i - 1)} />
        {i < questions.length - 1
          ? <Button flex title={t('next')} onPress={() => setI(i + 1)} />
          : <Button flex kind="pen" loading={busy} title={armed ? t('confirmSubmit') : t('submit')} onPress={() => (armed ? submit() : (setArmed(true), setTimeout(() => setArmed(false), 3500)))} />}
      </Row>
    </Screen>
  );
}
