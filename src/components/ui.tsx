import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView,
  Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isArabicText, useT } from '@/lib/i18n';
import { colorFor, fonts, useColors, type Colors } from '@/lib/theme';
import { Icon, type IconName } from './Icon';

/* ───────── Text ───────── */
type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'medium' | 'small' | 'eyebrow' | 'label' | 'big';
const V: Record<Variant, TextStyle> = {
  big: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38 },
  h1: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34 },
  h2: { fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 27 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 15.5, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
  medium: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18, letterSpacing: 0.3 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 19 },
};

export function Txt({ children, v = 'body', color, muted, center, auto, style, numberOfLines, selectable }: {
  children?: ReactNode; v?: Variant; color?: string; muted?: boolean; center?: boolean;
  /** Judge direction from the content itself (for user-written or curriculum text). */
  auto?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean;
}) {
  const c = useColors();
  const { rtl } = useT();
  // Alignment follows the interface language; the reading direction follows the text itself,
  // so an English title inside the Arabic interface still lines up with the layout.
  const contentRtl = auto && typeof children === 'string' ? isArabicText(children) : rtl;
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[V[v], { color: color ?? (muted || v === 'eyebrow' ? c.muted : c.ink), textAlign: center ? 'center' : rtl ? 'right' : 'left', writingDirection: contentRtl ? 'rtl' : 'ltr' }, style]}
    >
      {children}
    </Text>
  );
}

/* ───────── Layout ───────── */
export function Row({ children, gap = 8, align = 'center', justify, wrap, style }: {
  children?: ReactNode; gap?: number; align?: ViewStyle['alignItems']; justify?: ViewStyle['justifyContent']; wrap?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { rtl } = useT();
  return <View style={[{ flexDirection: rtl ? 'row-reverse' : 'row', gap, alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, gap = 12, style }: { children?: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Screen({ children, title, eyebrow, back, right, scroll = true, refreshing, onRefresh, footer }: {
  children?: ReactNode; title?: string; eyebrow?: string; back?: boolean; right?: ReactNode; scroll?: boolean;
  refreshing?: boolean; onRefresh?: () => void; footer?: ReactNode;
}) {
  const c = useColors();
  const router = useRouter();
  const { rtl } = useT();
  const head = (title || back || right) ? (
    <Row justify="space-between" style={{ paddingTop: 6, paddingBottom: 8 }} gap={12}>
      <Row gap={10} style={{ flex: 1 }}>
        {back && (
          <Pressable accessibilityRole="button" accessibilityLabel="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={rtl ? 'fwd' : 'back'} color={c.ink} size={20} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {eyebrow ? <Txt v="eyebrow" auto numberOfLines={1}>{eyebrow}</Txt> : null}
          {title ? <Txt v="h1" auto numberOfLines={2}>{title}</Txt> : null}
        </View>
      </Row>
      {right}
    </Row>
  ) : null;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {head}
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: 16, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' }}>{head}{children}</View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress, tone }: { children?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'ink' | 'brand' | 'dashed' }) {
  const c = useColors();
  const base: ViewStyle = {
    backgroundColor: tone === 'ink' ? c.ink : tone === 'brand' || tone === 'dashed' ? c.brandSoft : c.surface,
    borderColor: tone === 'ink' ? c.ink : tone === 'dashed' ? c.brand : c.line,
    borderWidth: tone === 'dashed' ? 1.5 : 1, borderStyle: tone === 'dashed' ? 'dashed' : 'solid', borderRadius: 14, padding: 16, gap: 10,
  };
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>{children}</Pressable>;
  return <View style={[base, style]}>{children}</View>;
}

/* ───────── Controls ───────── */
type BtnKind = 'primary' | 'ghost' | 'pen' | 'line' | 'onInk';
export function Button({ title, onPress, kind = 'primary', small, icon, loading, disabled, flex, style }: {
  title: string; onPress?: () => void; kind?: BtnKind; small?: boolean; icon?: IconName; loading?: boolean; disabled?: boolean; flex?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const { rtl } = useT();
  const bg = { primary: c.brand, ghost: c.surface2, pen: c.pen, line: 'transparent', onInk: c.bg }[kind];
  const fg = { primary: c.onBrand, ghost: c.ink, pen: '#fff', line: c.ink, onInk: c.ink }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: small ? 10 : 12, minHeight: small ? 36 : 46, paddingHorizontal: small ? 12 : 18,
        flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: kind === 'line' ? 1 : 0, borderColor: c.line, opacity: off ? 0.5 : pressed ? 0.85 : 1,
      }, flex && { flex: 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <Icon name={icon} color={fg} size={small ? 16 : 18} /> : null}
      <Text style={{ color: fg, fontFamily: fonts.bodySemi, fontSize: small ? 13.5 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, tone }: { name: IconName; onPress: () => void; label: string; tone?: 'pen' }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 11, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Icon name={name} size={18} color={tone === 'pen' ? c.pen : c.ink} />
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const c = useColors();
  const { rtl } = useT();
  const [focus, setFocus] = useState(false);
  const valueRtl = typeof props.value === 'string' && props.value ? isArabicText(props.value) : rtl;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label" muted>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[{
          borderWidth: 1.5, borderColor: focus ? c.brand : c.line, borderRadius: 12, backgroundColor: c.surface, color: c.ink,
          paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 15.5, minHeight: props.multiline ? 110 : 48,
          textAlign: valueRtl ? 'right' : 'left', textAlignVertical: props.multiline ? 'top' : 'center', writingDirection: valueRtl ? 'rtl' : 'ltr',
        } as TextStyle, props.style]}
      />
      {hint ? <Txt v="small" muted>{hint}</Txt> : null}
    </View>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'brand' | 'live' }) {
  const c = useColors();
  const map: Record<string, [string, string]> = {
    neutral: [c.surface2, c.muted], ok: [c.okSoft, c.ok], warn: [c.warnSoft, c.warn], bad: [c.penSoft, c.pen], brand: [c.brandSoft, c.brand], live: [c.pen, '#fff'],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontFamily: fonts.bodySemi, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const c = useColors();
  const { rtl } = useT();
  return (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', backgroundColor: c.surface2, borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 10, backgroundColor: on ? c.surface : 'transparent', alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? c.ink : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={{ borderWidth: 1, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 }}>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: on ? c.bg : c.ink, maxWidth: 260 }}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, id, size = 40 }: { name: string; id?: string; size?: number }) {
  const ch = (name || '?').replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Eng\.|أ\.|د\.|م\.)\s*/, '').trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(id ?? name), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: fonts.displaySemi, fontSize: size * 0.4 }}>{ch || '?'}</Text>
    </View>
  );
}

export function ListItem({ left, title, subtitle, right, onPress, first }: { left?: ReactNode; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; first?: boolean }) {
  const c = useColors();
  const inner = (
    <Row gap={12} style={{ paddingVertical: 11, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="medium" auto numberOfLines={2}>{title}</Txt>
        {subtitle ? <Txt v="small" muted numberOfLines={2}>{subtitle}</Txt> : null}
      </View>
      {right}
    </Row>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>{inner}</Pressable> : inner;
}

export function Empty({ text, icon = 'doc' }: { text: string; icon?: IconName }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={c.muted} />
      </View>
      <Txt muted center>{text}</Txt>
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: c.bg }}><ActivityIndicator color={c.brand} /></View>;
}

export function ErrorText({ error }: { error?: string | null }) {
  const c = useColors();
  if (!error) return null;
  return <View style={{ backgroundColor: c.penSoft, borderRadius: 10, padding: 10 }}><Txt v="small" color={c.pen} auto>{error}</Txt></View>;
}

export function Stat({ value, label }: { value: string; label: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, minWidth: 96, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12 }}>
      <Txt v="h2" style={{ fontFamily: fonts.displaySemi, fontSize: 21 }}>{value}</Txt>
      <Txt v="small" muted>{label}</Txt>
    </View>
  );
}

export function Bar({ label, value }: { label: string; value: number }) {
  const c = useColors();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const col = v < 50 ? c.pen : v < 65 ? c.warn : c.brand;
  return (
    <Row gap={10}>
      <Txt v="small" auto numberOfLines={1} style={{ width: 120 }}>{label}</Txt>
      <View style={{ flex: 1, height: 10, borderRadius: 99, backgroundColor: c.surface2, overflow: 'hidden' }}>
        <View style={{ width: `${v}%`, height: '100%', backgroundColor: col, borderRadius: 99 }} />
      </View>
      <Txt v="small" muted style={{ width: 42 }}>{v}%</Txt>
    </Row>
  );
}

/* ───────── Toast ───────── */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const [msg, setMsg] = useState('');
  const op = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(), 2400);
  }, [op]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 96, alignItems: 'center', opacity: op }}>
        <View style={{ backgroundColor: c.ink, borderRadius: 99, paddingHorizontal: 18, paddingVertical: 10, maxWidth: 520 }}>
          <Text style={{ color: c.bg, fontFamily: fonts.bodyMedium, fontSize: 14, textAlign: 'center' }}>{msg}</Text>
        </View>
      </Animated.View>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function useColorsFor(): Colors { return useColors(); }

/** Two-tap confirm for destructive actions (no blocking dialogs). */
export function useConfirm() {
  const [armed, setArmed] = useState<string | null>(null);
  return {
    armed,
    ask: (id: string, run: () => void) => {
      if (armed === id) { setArmed(null); run(); } else { setArmed(id); setTimeout(() => setArmed((a) => (a === id ? null : a)), 3500); }
    },
  };
}
