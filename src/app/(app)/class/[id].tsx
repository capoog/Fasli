import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ErrorText, Loading, Row, Screen, Seg, Txt } from '@/components/ui';
import { CurriculumPill } from '@/features/common';
import { CodeBox } from '@/features/settings/CodesCard';
import { ExamsTab } from '@/features/class/ExamsTab';
import { LibraryTab } from '@/features/class/LibraryTab';
import { LiveTab } from '@/features/class/LiveTab';
import { PeopleTab } from '@/features/class/PeopleTab';
import { getClass } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useData } from '@/lib/useData';

type Tab = 'live' | 'library' | 'exams' | 'people';

export default function ClassScreen() {
  const { id, tab: initial } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const me = useMe();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>(initial ?? 'live');
  const { data: cls, error } = useData(() => getClass(id), [id]);
  const isTeacher = !!cls && cls.teacher_id === me.id;

  if (!cls) return error ? <Screen back><ErrorText error={error} /></Screen> : <Loading />;

  const tabs: { value: Tab; label: string }[] = [
    { value: 'live', label: t('live') },
    { value: 'library', label: t('library') },
    { value: 'exams', label: t('exams') },
    ...(isTeacher || me.role === 'admin' ? [{ value: 'people' as Tab, label: t('people') }] : []),
  ];

  return (
    <Screen back title={cls.name} eyebrow={[cls.subject, cls.grade_level].filter(Boolean).join(' · ')}>
      <Row gap={8}><CurriculumPill c={cls.curriculum} /></Row>
      {isTeacher && <CodeBox label={`${t('classCode')} · ${t('classCodeShare')}`} code={cls.join_code} />}
      <Seg value={tab} onChange={setTab} options={tabs} />
      {tab === 'live' && <LiveTab cls={cls} isTeacher={isTeacher} />}
      {tab === 'library' && <LibraryTab cls={cls} isTeacher={isTeacher} />}
      {tab === 'exams' && <ExamsTab cls={cls} isTeacher={isTeacher} />}
      {tab === 'people' && <PeopleTab cls={cls} />}
      <Txt v="small" muted center> </Txt>
    </Screen>
  );
}
