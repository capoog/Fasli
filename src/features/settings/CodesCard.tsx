import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Row, Txt, useToast } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { fonts, useColors } from '@/lib/theme';
import { useData } from '@/lib/useData';

export function CodeBox({ label, code }: { label: string; code: string }) {
  const c = useColors();
  const { t } = useT();
  const toast = useToast();
  return (
    <Pressable onPress={async () => { await Clipboard.setStringAsync(code).catch(() => {}); toast(t('copied')); }} accessibilityRole="button" accessibilityLabel={`${label} ${t('copy')}`}>
      <Row justify="space-between" style={{ backgroundColor: c.surface2, borderRadius: 12, padding: 12 }}>
        <View style={{ flex: 1 }}><Txt v="small" muted>{label}</Txt></View>
        <Txt selectable style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: 3 }}>{code}</Txt>
      </Row>
    </Pressable>
  );
}

/** School join codes. Admins see both and can rotate them; teachers see the student code. */
export function CodesCard() {
  const me = useMe();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const { data, reload } = useData(async () => {
    const { data: codes } = await supabase.rpc('school_codes');
    return codes as { student_code?: string; staff_code?: string } | null;
  });
  if (!data) return null;
  return (
    <Card>
      <Txt v="h3">{t('inviteCodes')}</Txt>
      {data.staff_code ? <CodeBox label={t('staffCode')} code={data.staff_code} /> : null}
      {data.student_code ? <CodeBox label={t('studentCode')} code={data.student_code} /> : null}
      {me.role === 'admin' && <Button small kind="line" title={t('newCodes')} loading={busy} onPress={async () => { setBusy(true); await supabase.rpc('regenerate_codes'); await reload(); setBusy(false); }} />}
    </Card>
  );
}
