import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Card, Chip, ErrorText, Field, IconButton, Loading, Pill, Row, Screen, Seg, Stack, Txt, useToast } from '@/components/ui';
import { getClass } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { callFn, must, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { DraftQuestion, Material, QType, Question } from '@/lib/types';
import { errMsg, useData } from '@/lib/useData';

const blank = (type: QType = 'mcq') => ({ type, prompt: '', options: ['', '', '', ''], correct: 0, tf: true, num: '', points: '1', rubric: [{ n: '', max: '2' }, { n: '', max: '2' }] });

export default function ExamBuilder() {
  const { class: classId, material, exam: examId } = useLocalSearchParams<{ class: string; material?: string; exam?: string }>();
  const { t, lang } = useT();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('30');
  const [qs, setQs] = useState<DraftQuestion[]>([]);
  const [sources, setSources] = useState<string[]>(material ? [material] : []);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<'3' | '5' | '10'>('5');
  const [difficulty, setDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');
  const [f, setF] = useState(blank());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data } = useData(async () => {
    const cls = await getClass(classId);
    const mats = must(await supabase.from('materials').select('id, title, status').eq('class_id', classId).eq('status', 'ready').order('created_at', { ascending: false })) as Pick<Material, 'id' | 'title' | 'status'>[];
    let existing: { title: string; duration_min: number; qs: DraftQuestion[] } | null = null;
    if (examId) {
      const ex = must(await supabase.from('exams').select('title, duration_min').eq('id', examId).single()) as { title: string; duration_min: number };
      const qrows = must(await supabase.from('questions').select('id, type, prompt, options, rubric, points, tag, position').eq('exam_id', examId).order('position')) as Question[];
      const keys = qrows.length ? must(await supabase.from('question_keys').select('question_id, answer').in('question_id', qrows.map((q) => q.id))) as { question_id: string; answer: DraftQuestion['answer'] }[] : [];
      existing = { ...ex, qs: qrows.map((q) => ({ type: q.type, prompt: q.prompt, options: q.options, rubric: q.rubric, points: Number(q.points), tag: q.tag, answer: keys.find((k) => k.question_id === q.id)?.answer ?? null })) };
    }
    return { cls, mats, existing };
  }, [classId, examId]);

  useEffect(() => {
    if (data?.existing) { setTitle(data.existing.title); setDuration(String(data.existing.duration_min)); setQs(data.existing.qs); }
    else if (data && material && !title) setTitle(data.mats.find((m) => m.id === material)?.title ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return <Loading />;
  const contentRtl = data.cls.curriculum === 'bac';
  const total = qs.reduce((a, q) => a + q.points, 0);

  async function generate() {
    setError(null);
    if (!sources.length && !topic.trim()) { setError(t('topic')); return; }
    setBusy('gen');
    try {
      const r = await callFn<{ questions: DraftQuestion[] }>('ai-generate', { class_id: classId, material_ids: sources, topic: topic.trim(), count: Number(count), difficulty });
      setQs((x) => [...x, ...r.questions]);
      toast(t('generated'));
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  }

  function addManual() {
    setError(null);
    const q: DraftQuestion = { type: f.type, prompt: f.prompt.trim(), points: Math.max(1, Number(f.points) || 1), answer: null };
    if (!q.prompt) { setError(t('needQ')); return; }
    if (f.type === 'mcq') {
      const opts = f.options.map((o) => o.trim());
      if (opts.filter(Boolean).length < 2 || !opts[f.correct]) { setError(t('needQ')); return; }
      q.answer = opts[f.correct];
      q.options = opts.filter(Boolean);
    } else if (f.type === 'tf') q.answer = f.tf;
    else if (f.type === 'num') {
      const n = Number(f.num.replace(',', '.'));
      if (!f.num.trim() || !Number.isFinite(n)) { setError(t('needQ')); return; }
      q.answer = n;
    } else {
      q.rubric = f.rubric.filter((r) => r.n.trim()).map((r) => ({ n: r.n.trim(), max: Math.max(1, Number(r.max) || 1) }));
      if (!q.rubric.length) { setError(t('needQ')); return; }
      q.points = q.rubric.reduce((a, r) => a + r.max, 0);
    }
    setQs((x) => [...x, q]);
    setF(blank(f.type));
  }

  async function save(publish: boolean) {
    setError(null);
    if (!title.trim() || !qs.length) { setError(t('needTitleQ')); return; }
    setBusy(publish ? 'pub' : 'save');
    try {
      const { data: id, error: e } = await supabase.rpc('save_exam', {
        p_exam_id: examId ?? null, p_class_id: classId, p_title: title.trim(), p_duration: Math.max(1, Number(duration) || 30), p_publish: publish,
        p_questions: qs.map((q) => ({ type: q.type, prompt: q.prompt, options: q.options ?? [], rubric: q.rubric ?? [], points: q.points, tag: q.tag ?? '', answer: q.answer })),
      });
      if (e) throw e;
      toast(publish ? t('examPublished') : t('examSaved'));
      router.replace(`/exam/${id}`);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  }

  const upd = (patch: Partial<ReturnType<typeof blank>>) => setF((x) => ({ ...x, ...patch }));

  return (
    <Screen back title={examId ? t('edit') : t('newExam')} eyebrow={data.cls.name}
      footer={
        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface }}>
          <Row gap={8} style={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
            <Button flex kind="ghost" title={t('saveDraft')} loading={busy === 'save'} onPress={() => save(false)} />
            <Button flex kind="pen" title={`${t('publish')} · ${qs.length}`} loading={busy === 'pub'} onPress={() => save(true)} />
          </Row>
        </View>
      }>
      <Card>
        <Field label={t('examTitle')} value={title} onChangeText={setTitle} />
        <Field label={t('duration')} value={duration} onChangeText={setDuration} keyboardType="number-pad" style={{ maxWidth: 140 }} />
      </Card>

      <Card tone="dashed">
        <Row gap={8}><Icon name="ai" color={c.brand} /><Txt v="h3">{t('aiGenerate')}</Txt></Row>
        {data.mats.length > 0 && (
          <Stack gap={8}>
            <Txt v="label" muted>{t('sources')}</Txt>
            <Row gap={8} wrap>
              {data.mats.map((m) => <Chip key={m.id} label={m.title} on={sources.includes(m.id)} onPress={() => setSources((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />)}
            </Row>
            {sources.length > 0 && <Txt v="small" muted>{t('sourcesHint')}</Txt>}
          </Stack>
        )}
        <Field label={t('topic')} value={topic} onChangeText={setTopic} />
        <Txt v="label" muted>{t('count')}</Txt>
        <Seg value={count} onChange={setCount} options={[{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '10', label: '10' }]} />
        <Txt v="label" muted>{t('difficulty')}</Txt>
        <Seg value={difficulty} onChange={setDifficulty} options={(['mixed', 'easy', 'medium', 'hard'] as const).map((d) => ({ value: d, label: t(d) }))} />
        <Button icon="ai" title={busy === 'gen' ? t('generating') : t('generate')} loading={busy === 'gen'} onPress={generate} />
      </Card>

      <ErrorText error={error} />

      {qs.length > 0 && <Row justify="space-between"><Txt v="h2">{`${qs.length} ${t('questionsN')}`}</Txt><Pill tone="brand" text={`${total} ${t('marks')}`} /></Row>}
      {qs.map((q, i) => (
        <Card key={i}>
          <Row justify="space-between">
            <Row gap={6}><Pill text={t(q.type)} />{q.tag ? <Pill tone="brand" text={q.tag} /> : null}<Pill text={`${q.points}`} /></Row>
            <IconButton name="trash" tone="pen" label={t('delete')} onPress={() => setQs((x) => x.filter((_, j) => j !== i))} />
          </Row>
          <Txt auto selectable>{`${i + 1}. ${q.prompt}`}</Txt>
          {q.type === 'mcq' && (q.options ?? []).map((o) => (
            <Row key={o} gap={8}><Icon name={o === q.answer ? 'check' : 'x'} size={16} color={o === q.answer ? c.ok : c.line} /><Txt v="small" auto style={{ flex: 1 }}>{o}</Txt></Row>
          ))}
          {(q.type === 'tf' || q.type === 'num') && <Txt v="small" color={c.ok}>{`${t('correctAnswer')}: ${q.type === 'tf' ? (q.answer ? t('trueW') : t('falseW')) : String(q.answer)}`}</Txt>}
          {q.type === 'written' && <Txt v="small" muted auto>{(q.rubric ?? []).map((r) => `${r.n} (${r.max})`).join(' · ')}</Txt>}
        </Card>
      ))}

      <Card>
        <Txt v="h3">{t('addQuestion')}</Txt>
        <Seg value={f.type} onChange={(v) => upd({ type: v })} options={(['mcq', 'tf', 'num', 'written'] as const).map((k) => ({ value: k, label: t(k) }))} />
        <Field label={t('qText')} value={f.prompt} onChangeText={(v) => upd({ prompt: v })} multiline style={{ minHeight: 80, textAlign: contentRtl ? 'right' : undefined }} />
        {f.type === 'mcq' && (
          <Stack gap={8}>
            <Txt v="label" muted>{t('options')}</Txt>
            {f.options.map((o, i) => (
              <Row key={i} gap={8}>
                <Pressable onPress={() => upd({ correct: i })} accessibilityRole="radio" accessibilityState={{ checked: f.correct === i }}
                  style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: f.correct === i ? c.ok : c.line, backgroundColor: f.correct === i ? c.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {f.correct === i && <Icon name="check" size={14} color="#fff" />}
                </Pressable>
                <View style={{ flex: 1 }}><Field value={o} onChangeText={(v) => upd({ options: f.options.map((x, j) => (j === i ? v : x)) })} placeholder={'ABCD'[i]} /></View>
              </Row>
            ))}
          </Stack>
        )}
        {f.type === 'tf' && <Seg value={f.tf ? 't' : 'f'} onChange={(v) => upd({ tf: v === 't' })} options={[{ value: 't', label: t('trueW') }, { value: 'f', label: t('falseW') }]} />}
        {f.type === 'num' && <Field label={t('correctAnswer')} value={f.num} onChangeText={(v) => upd({ num: v })} keyboardType="decimal-pad" />}
        {f.type === 'written' ? (
          <Stack gap={8}>
            <Txt v="label" muted>{t('rubric')}</Txt>
            {f.rubric.map((r, i) => (
              <Row key={i} gap={8}>
                <View style={{ flex: 1 }}><Field value={r.n} placeholder={t('criterion')} onChangeText={(v) => upd({ rubric: f.rubric.map((x, j) => (j === i ? { ...x, n: v } : x)) })} /></View>
                <View style={{ width: 70 }}><Field value={r.max} keyboardType="number-pad" onChangeText={(v) => upd({ rubric: f.rubric.map((x, j) => (j === i ? { ...x, max: v } : x)) })} style={{ textAlign: 'center' }} /></View>
              </Row>
            ))}
            <Button small kind="ghost" title={t('addCriterion')} onPress={() => upd({ rubric: [...f.rubric, { n: '', max: '1' }] })} />
          </Stack>
        ) : (
          <Field label={t('points')} value={f.points} onChangeText={(v) => upd({ points: v })} keyboardType="number-pad" style={{ maxWidth: 100 }} />
        )}
        <Button kind="ghost" icon="plus" title={t('addToExam')} onPress={addManual} />
      </Card>
      <Txt v="small" muted center>{lang === 'ar' ? 'الإجابات الصحيحة بتفضل مخفية عن الطلاب لحد ما يسلّموا.' : 'Correct answers stay hidden from students until they submit.'}</Txt>
    </Screen>
  );
}
