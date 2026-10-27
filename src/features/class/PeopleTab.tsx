import { useRouter } from 'expo-router';
import { Avatar, Card, Empty, IconButton, ListItem } from '@/components/ui';
import { profilesByIds } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import type { ClassRow } from '@/lib/types';
import { useData } from '@/lib/useData';

export function PeopleTab({ cls }: { cls: ClassRow }) {
  const { t } = useT();
  const router = useRouter();
  const { data } = useData(async () => {
    const rows = must(await supabase.from('class_members').select('student_id, joined_at').eq('class_id', cls.id)) as { student_id: string }[];
    const people = await profilesByIds(rows.map((r) => r.student_id));
    return rows.map((r) => people[r.student_id]).filter(Boolean).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [cls.id]);

  return (
    <Card>
      {data?.length ? data.map((p, i) => (
        <ListItem key={p.id} first={i === 0} title={p.full_name || '—'} left={<Avatar name={p.full_name} id={p.id} />}
          right={<IconButton name="msg" label={t('messages')} onPress={() => router.push(`/chat/${p.id}`)} />} />
      )) : <Empty icon="users" text={t('classCodeShare')} />}
    </Card>
  );
}
