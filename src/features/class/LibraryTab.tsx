import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Card, Empty, ErrorText, Field, Pill, Row, Stack, Txt, useConfirm, useToast } from '@/components/ui';
import { kindFor, pickDocuments, takePhoto, type PickedFile } from '@/lib/files';
import { useT } from '@/lib/i18n';
import { callFn, must, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { ClassRow, Material } from '@/lib/types';
import { errMsg, useData } from '@/lib/useData';

const COLS = 'id, class_id, title, kind, storage_path, mime_type, text_content, summary, status, created_at';
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function LibraryTab({ cls, isTeacher }: { cls: ClassRow; isTeacher: boolean }) {
  const { t } = useT();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [summing, setSumming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, reload, setData } = useData(async () =>
    must(await supabase.from('materials').select(COLS).eq('class_id', cls.id).order('created_at', { ascending: false })) as Material[], [cls.id]);

  async function upload(files: PickedFile[]) {
    for (const f of files) {
      setUploading(f.name);
      try {
        const safe = f.name.replace(/[^\w.\-]+/g, '_').slice(-80);
        const path = `${cls.id}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from('materials').upload(path, f.bytes, { contentType: f.mime, upsert: false });
        if (up.error) throw up.error;
        const mat = must(await supabase.from('materials').insert({
          class_id: cls.id, title: f.name.replace(/\.[^.]+$/, ''), kind: kindFor(f.mime), storage_path: path, mime_type: f.mime, status: 'processing',
        }).select(COLS).single()) as Material;
        setData((d) => [mat, ...(d ?? [])]);
        await callFn('material-process', { material_id: mat.id });
        toast(t('ready'));
      } catch (e) {
        setError(errMsg(e));
      }
    }
    setUploading(null);
    reload();
  }

  async function pick() {
    setError(null);
    try { const files = await pickDocuments(); if (files.length) await upload(files); }
    catch (e) { setError(errMsg(e) === 'too_big' ? t('fileTooBig') : errMsg(e)); }
  }

  async function photo() {
    setError(null);
    const f = await takePhoto().catch((e) => { setError(errMsg(e)); return null; });
    if (f) await upload([f]);
  }

  async function saveNote() {
    if (!noteTitle.trim() || !noteBody.trim()) { setError(`${t('noteTitle')} · ${t('noteBody')}`); return; }
    try {
      must(await supabase.from('materials').insert({ class_id: cls.id, title: noteTitle.trim(), kind: 'note', text_content: noteBody.trim(), status: 'ready' }));
      setNoteTitle(''); setNoteBody(''); setNoteOpen(false); toast(t('saved')); reload();
    } catch (e) { setError(errMsg(e)); }
  }

  async function summarize(m: Material) {
    setSumming(m.id); setError(null);
    try {
      const r = await callFn<{ summary: string }>('ai-summarize', { material_id: m.id });
      setData((d) => (d ?? []).map((x) => (x.id === m.id ? { ...x, summary: r.summary } : x)));
      setOpen(m.id);
    } catch (e) { setError(errMsg(e)); } finally { setSumming(null); }
  }

  async function remove(m: Material) {
    if (m.storage_path) await supabase.storage.from('materials').remove([m.storage_path]);
    await supabase.from('materials').delete().eq('id', m.id);
    reload();
  }

  const kindLabel = { pdf: 'PDF', image: 'IMG', text: 'TXT', note: 'NOTE' } as const;
  const kindTone = { pdf: [c.penSoft, c.pen], image: [c.warnSoft, c.warn], text: [c.okSoft, c.ok], note: [c.brandSoft, c.brand] } as const;

  return (
    <Stack>
      <Txt muted>{t('libSub')}</Txt>
      {isTeacher && (
        <Card tone="dashed">
          <Button icon="upload" title={uploading ? `${t('processing')} ${uploading}` : t('uploadFile')} loading={!!uploading} onPress={pick} />
          <Row gap={8}>
            {Platform.OS !== 'web' && <Button flex kind="ghost" icon="camera" title={t('takePhoto')} disabled={!!uploading} onPress={photo} />}
            <Button flex kind="ghost" icon="pen" title={t('writeNote')} onPress={() => setNoteOpen(!noteOpen)} />
          </Row>
          {noteOpen && (
            <Stack gap={10}>
              <Field label={t('noteTitle')} value={noteTitle} onChangeText={setNoteTitle} />
              <Field label={t('noteBody')} value={noteBody} onChangeText={setNoteBody} multiline style={{ minHeight: 180 }} />
              <Button title={t('save')} onPress={saveNote} />
            </Stack>
          )}
        </Card>
      )}
      <ErrorText error={error} />
      {data?.length ? data.map((m) => (
        <Card key={m.id}>
          <Row gap={12}>
            <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: kindTone[m.kind][0], alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="label" color={kindTone[m.kind][1]} style={{ fontSize: 11 }}>{kindLabel[m.kind]}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="medium" auto numberOfLines={2}>{m.title}</Txt>
              <Txt v="small" muted>{m.status === 'ready' ? `${words(m.text_content).toLocaleString()} ${t('words')}` : ''}</Txt>
            </View>
            {m.status !== 'ready' && <Pill tone={m.status === 'failed' ? 'bad' : 'brand'} text={m.status === 'failed' ? t('failed') : t('processing')} />}
          </Row>
          {m.summary && open === m.id ? (
            <View style={{ backgroundColor: c.surface2, borderRadius: 10, padding: 12, gap: 4 }}>
              <Row gap={6}><Icon name="ai" color={c.brand} size={16} /><Txt v="label">{t('summary')}</Txt></Row>
              <Txt auto selectable>{m.summary}</Txt>
            </View>
          ) : null}
          {open === `${m.id}:text` ? <Txt auto selectable v="small" style={{ backgroundColor: c.surface2, borderRadius: 10, padding: 12 }}>{m.text_content.slice(0, 6000)}</Txt> : null}
          {m.status === 'ready' && (
            <Row gap={8} wrap>
              {isTeacher && <Button small icon="ai" title={t('buildExam')} onPress={() => router.push(`/exam/new?class=${cls.id}&material=${m.id}`)} />}
              <Button small kind="ghost" title={m.summary ? (open === m.id ? t('hideText') : t('summary')) : t('summarize')} loading={summing === m.id}
                onPress={() => (m.summary ? setOpen(open === m.id ? null : m.id) : summarize(m))} />
              <Button small kind="ghost" title={open === `${m.id}:text` ? t('hideText') : t('showText')} onPress={() => setOpen(open === `${m.id}:text` ? null : `${m.id}:text`)} />
              {isTeacher && <Button small kind="line" icon="trash" title={confirm.armed === m.id ? t('confirmDelete') : t('delete')} onPress={() => confirm.ask(m.id, () => remove(m))} />}
            </Row>
          )}
          {m.status === 'failed' && isTeacher && <Button small kind="line" icon="trash" title={t('delete')} onPress={() => remove(m)} />}
        </Card>
      )) : <Card><Empty icon="doc" text={t('noMaterials')} /></Card>}
    </Stack>
  );
}
