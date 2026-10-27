import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '@/components/Icon';
import { Avatar, Button, Card, ErrorText, Loading, Pill, Row, Screen, Stack, Txt, useToast } from '@/components/ui';
import { SubStatusPill } from '@/features/common';
import { EXAM_COLS, getClass, SUB_COLS } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { gradeFor, pct } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { callFn, must, supabase } from '@/lib/supabase';
import { fonts, useColors } from '@/lib/theme';
import type { Answer, Exam, Mark, Profile, Question, Submission } from '@/lib/types';
import { errMsg, useData } from '@/lib/useData';

function Ring({ value, color }: { value: number; color: string }) {
  const c = useColors();
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={96} height={96} viewBox="0 0 96 96" style={{ position: 'absolute' }}>
        <Circle cx={48} cy={48} r={r} stroke={c.surface2} strokeWidth={9} fill="none" />
        <Circle cx={48} cy={48} r={r} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - value / 100)} transform="rotate(-90 48 48)" />
      </Svg>
      <Txt style={{ fontFamily: fonts.display, fontSize: 20 }}>{`${Math.round(value)}%`}</Txt>
    </View>
  );
}

export default function SubmissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { t, lang } = useT();
  const c = useColors();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, reload, setData } = useData(async () => {
    const sub = must(await supabase.from('submissions').select(SUB_COLS).eq('id', id).single()) as Submission;
    const exam = must(await supabase.from('exams').select(EXAM_COLS).eq('id', sub.exam_id).single()) as Exam;
    const [cls, questions, answers, keys, student] = await Promise.all([
      getClass(exam.class_id),
      must(await supabase.from('questions').select('id, exam_id, position, type, prompt, options, rubric, points, tag').eq('exam_id', exam.id).order('position')) as Question[],
      must(await supabase.from('answers').select('submission_id, question_id, response, points, marks, ai_marks').eq('submission_id', id)) as Answer[],
      supabase.rpc('result_keys', { p_submission_id: id }).then((r) => (r.data ?? []) as { question_id: string; answer: unknown }[]),
      supabase.from('profiles').select('id, full_name, role, school_id, locale').eq('id', sub.student_id).maybeSingle().then((r) => r.data as Profile | null),
    ]);
    return { sub, exam, cls, questions, answers, keys: Object.fromEntries(keys.map((k) => [k.question_id, k.answer])), student };
  }, [id]);

  // While AI is marking, check again every few seconds.
  useEffect(() => {
    if (data?.sub.status !== 'grading') return;
    const h = setInterval(reload, 3500);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sub.status]);

  if (!data) return <Loading />;
  const { sub, exam, cls, questions } = data;
  const isTeacher = cls.teacher_id === me.id;
  const grading = sub.status === 'grading';
  const p = pct(sub.score, sub.max_score);
  const g = gradeFor(cls.curriculum, p, lang);
  const ansOf = (qid: string) => data.answers.find((a) => a.question_id === qid);
  const show = (v: unknown, type: Question['type']) => (v == null || v === '' ? t('noAnswer') : type === 'tf' ? (v === true || v === 'true' ? t('trueW') : t('falseW')) : String(v));

  async function mark(q: Question, idx: number, delta: number) {
    const a = ansOf(q.id);
    if (!a) return;
    const marks: Mark[] = a.marks.map((m, i) => (i === idx ? { ...m, got: Math.max(0, Math.min(m.max, m.got + delta)) } : m));
    const { error: e } = await supabase.rpc('review_answer', { p_submission_id: id, p_question_id: q.id, p_marks: marks });
    if (e) { setError(e.message); return; }
    setData((d) => d && ({
      ...d,
      answers: d.answers.map((x) => (x.question_id === q.id ? { ...x, marks, points: marks.reduce((s, m) => s + m.got, 0) } : x)),
      sub: { ...d.sub, score: d.sub.score - a.points + marks.reduce((s, m) => s + m.got, 0) },
    }));
  }

  async function approve(on: boolean) {
    setBusy('approve');
    const { error: e } = await supabase.rpc('approve_submission', { p_submission_id: id, p_approved: on });
    setBusy(null);
    if (e) setError(e.message); else { if (on) toast(t('approvedToast')); reload(); }
  }

  async function regrade() {
    setBusy('ai'); setError(null);
    try { await callFn('ai-grade', { submission_id: id, regrade: true }); await reload(); } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  }

  return (
    <Screen back title={exam.title} eyebrow={cls.name}>
      {(isTeacher || me.role === 'parent' || me.role === 'admin') && data.student && (
        <Row gap={10}><Avatar name={data.student.full_name} id={data.student.id} /><Txt v="h3" auto style={{ flex: 1 }}>{data.student.full_name}</Txt><SubStatusPill s={sub} /></Row>
      )}
      <Card>
        <Row gap={16}>
          {grading ? <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}><Icon name="ai" color={c.brand} size={36} /></View>
            : <Ring value={p} color={p >= 70 ? c.ok : p >= 50 ? c.warn : c.pen} />}
          <Stack gap={2} style={{ flex: 1 }}>
            {grading ? <Txt v="h2">{t('grading')}</Txt> : <>
              <Txt style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 38 }}>{g.big}</Txt>
              <Txt muted>{`${g.small} · ${sub.score}/${sub.max_score}`}</Txt>
            </>}
            {!isTeacher && !grading && <SubStatusPill s={sub} />}
            {sub.ai_graded && !grading && <Txt v="small" color={c.brand}>{t('aiMarked')}</Txt>}
          </Stack>
        </Row>
        {grading && (isTeacher || sub.student_id === me.id) && <Button small kind="ghost" icon="ai" title={t('retry')} loading={busy === 'ai'} onPress={regrade} />}
      </Card>
      <ErrorText error={error} />

      {questions.map((q, i) => {
        const a = ansOf(q.id);
        const got = Number(a?.points ?? 0);
        const full = got >= Number(q.points);
        return (
          <Card key={q.id}>
            <Row justify="space-between">
              <Txt v="eyebrow">{`${t('question')} ${i + 1}`}</Txt>
              <Txt style={{ fontFamily: fonts.displaySemi, color: grading && q.type === 'written' ? c.muted : full ? c.ok : got > 0 ? c.warn : c.pen }}>{grading && q.type === 'written' ? '…' : `${got}/${q.points}`}</Txt>
            </Row>
            <Txt auto>{q.prompt}</Txt>
            {q.type !== 'written' ? (
              <Stack gap={4}>
                <Row gap={6}><Icon name={full ? 'check' : 'x'} size={16} color={full ? c.ok : c.pen} /><Txt v="small" auto style={{ flex: 1 }}>{`${t('yourAnswer')}: ${show(a?.response, q.type)}`}</Txt></Row>
                {!full && data.keys[q.id] !== undefined && <Txt v="small" color={c.ok} auto>{`${t('correct')} ${show(data.keys[q.id], q.type)}`}</Txt>}
              </Stack>
            ) : (
              <Stack gap={8}>
                <View style={{ backgroundColor: c.surface2, borderRadius: 10, padding: 12 }}><Txt v="small" auto selectable>{show(a?.response, 'written')}</Txt></View>
                {(a?.marks ?? []).map((m, k) => {
                  const ai = a?.ai_marks?.[k];
                  return (
                    <Row key={k} gap={10} align="flex-start" style={{ borderTopWidth: k ? 1 : 0, borderTopColor: c.line, paddingTop: k ? 8 : 0 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt v="label" auto>{m.n}</Txt>
                        {m.note ? <Txt v="small" muted auto>{m.note}</Txt> : null}
                        {isTeacher && ai && ai.got !== m.got && <Pill tone="warn" text={`${t('aiSuggested')}: ${ai.got}`} />}
                      </View>
                      {isTeacher && sub.status !== 'approved' ? (
                        <Row gap={6}>
                          <Pressable onPress={() => mark(q, k, -1)} style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}><Txt v="h3">−</Txt></Pressable>
                          <Txt style={{ fontFamily: fonts.displaySemi, minWidth: 40, textAlign: 'center' }}>{`${m.got}/${m.max}`}</Txt>
                          <Pressable onPress={() => mark(q, k, 1)} style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}><Txt v="h3">+</Txt></Pressable>
                        </Row>
                      ) : <Txt style={{ fontFamily: fonts.displaySemi }}>{`${m.got}/${m.max}`}</Txt>}
                    </Row>
                  );
                })}
              </Stack>
            )}
          </Card>
        );
      })}

      {isTeacher && !grading && (
        <Card>
          <Row justify="space-between"><Txt v="h3">{t('total')}</Txt><Txt style={{ fontFamily: fonts.display, fontSize: 20 }}>{`${sub.score}/${sub.max_score} · ${g.big}`}</Txt></Row>
          {sub.status === 'approved'
            ? <Button kind="ghost" title={t('unapprove')} loading={busy === 'approve'} onPress={() => approve(false)} />
            : <Button icon="check" title={t('approve')} loading={busy === 'approve'} onPress={() => approve(true)} />}
          {sub.status !== 'approved' && questions.some((q) => q.type === 'written') && <Button small kind="line" icon="ai" title={t('regrade')} loading={busy === 'ai'} onPress={regrade} />}
        </Card>
      )}
    </Screen>
  );
}
