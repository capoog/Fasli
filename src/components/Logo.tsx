import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useT } from '@/lib/i18n';
import { fonts, useColors } from '@/lib/theme';
import { Row, Txt } from './ui';

/** The Fasli mark: an open book with a red grading tick, and the dot of the Arabic letter "ف". */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={17} fill="#1D5C8C" />
      <Path d="M11 22c7.5-3.2 14.5-2.6 21 1.6V50c-6.5-4-13.5-4.6-21-1.6z" fill="#fff" />
      <Path d="M53 22c-7.5-3.2-14.5-2.6-21 1.6V50c6.5-4 13.5-4.6 21-1.6z" fill="#fff" opacity={0.9} />
      <Path d="M37 35.5l4.2 4.3 8.3-9.3" fill="none" stroke="#C7362C" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={32} cy={12.5} r={4} fill="#F06A5E" />
    </Svg>
  );
}

export function Wordmark({ size = 36 }: { size?: number }) {
  const { lang } = useT();
  const c = useColors();
  return (
    <Row gap={10} align="center">
      <LogoMark size={size} />
      <View>
        <Txt style={{ fontFamily: fonts.display, fontSize: size * 0.5, lineHeight: size * 0.62, color: c.ink }}>{lang === 'ar' ? 'فصلي' : 'Fasli'}</Txt>
        <Txt style={{ fontFamily: fonts.displaySemi, fontSize: size * 0.2, letterSpacing: 2.5, color: c.muted }}>{lang === 'ar' ? 'FASLI' : 'فصلي'}</Txt>
      </View>
    </Row>
  );
}
