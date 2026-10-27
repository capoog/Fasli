import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chip, Empty, ErrorText, Field, ListItem, Row, Screen, Stack, Txt, useToast } from '@/components/ui';
import { ClassBadge, CurriculumPill } from '@/features/common';
import { friendlyError, myClasses } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { CURRICULA } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Curriculum } from '@/lib/types';
import { useData } from '@/lib/useData';

function NewClass({ onDone }: { onDone: (id: string) => void }) {
  const me = useMe();
  const { t, lang } = useT();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [cur, setCur] = useState<Curriculum>('igcse');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <Txt v="h3">{t('newClass')}</Txt>
      <Field label={t('className')} value={name} onChangeText={setName} placeholder={lang === 'ar' ? 'مثال: عاشر · رياضيات' : 'e.g. Year 10 · Maths'} />
      <Field label={t('subject')} value={subject} onChangeText={setSubject} />
      <Field label={t('gradeLevel')} value={grade} onChangeText={setGrade} />
      <Txt v="label" muted>{t('curriculum')}</Txt>
      <Row gap={8} wrap>{CURRICULA.map((k) => <Chip key={k} label={t(k)} on={cur === k} onPress={() => setCur(k)} />)}</Row>
      <ErrorText error={error} />
      <Button title={t('save')} icon="check" loading={busy} onPress={async () => {
        if (!name.trim()) { setError(t('className')); return; }
        setBusy(true); setError(null);
        const { data, error: e } = await supabase.from('classes')
          .insert({ name: name.trim(), subject: subject.trim(), grade_level: grade.trim(), curriculum: cur, teacher_id: me.id, school_id: me.school_id })
          .select('id').single();
        setBusy(false);
        if (e) setError(friendlyError(e.message, lang)); else onDone(data.id);
      }} />
    </Card>
  );
}

function JoinClass({ onDone }: { onDone: (id: string) => void }) {
  const { t, lang } = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card tone="dashed">
      <Txt v="h3">{t('joinClass')}</Txt>
      <Field label={t('classCode')} hint={t('noClassesS')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" style={{ textAlign: 'center', letterSpacing: 4 }} />
      <ErrorText error={error} />
      <Button title={t('join')} icon="plus" loading={busy} onPress={async () => {
        setBusy(true); setError(null);
        const { data, error: e } = await supabase.rpc('join_class', { code: code.trim() });
        setBusy(false);
        if (e) setError(friendlyError(e.message, lang)); else { setCode(''); onDone(data as string); }
      }} />
    </Card>
  );
}

export default function Classes() {
  const me = useMe();
  const { t } = useT();
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const { data, error, refreshing, refresh, reload } = useData(() => myClasses(me));

  return (
    <Screen title={me.role === 'admin' ? t('allClasses') : t('myClasses')} refreshing={refreshing} onRefresh={refresh}
      right={me.role === 'teacher' ? <Button small icon={creating ? 'x' : 'plus'} title={creating ? t('cancel') : t('newClass')} kind={creating ? 'ghost' : 'primary'} onPress={() => setCreating(!creating)} /> : undefined}>
      <ErrorText error={error} />
      {me.role === 'teacher' && creating && <NewClass onDone={(id) => { setCreating(false); toast(t('saved')); router.push(`/class/${id}`); }} />}
      {me.role === 'student' && <JoinClass onDone={(id) => { toast(t('done')); reload(); router.push(`/class/${id}`); }} />}
      <Card>
        {data?.length ? data.map((x, i) => (
          <ListItem key={x.id} first={i === 0} title={x.name} subtitle={[x.subject, x.grade_level, me.role === 'teacher' ? `${t('classCode')}: ${x.join_code}` : ''].filter(Boolean).join(' · ')}
            left={<ClassBadge cls={x} />} right={<CurriculumPill c={x.curriculum} />} onPress={() => router.push(`/class/${x.id}`)} />
        )) : <Empty icon="class" text={me.role === 'teacher' ? t('noClassesT') : me.role === 'student' ? t('noClassesS') : t('nothingYet')} />}
      </Card>
      <Stack gap={0} />
    </Screen>
  );
}
