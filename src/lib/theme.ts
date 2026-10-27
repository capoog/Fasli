import { useColorScheme } from 'react-native';

const light = {
  bg: '#F2F4F8', surface: '#FFFFFF', surface2: '#E8ECF3', ink: '#14213A', muted: '#5A6781', line: '#D7DDE8',
  brand: '#1D5C8C', brandSoft: '#DCE8F3', onBrand: '#FFFFFF', pen: '#C7362C', penSoft: '#F7E1DE',
  ok: '#1C8556', okSoft: '#DDF1E6', warn: '#A86F12', warnSoft: '#F6ECD8', video: '#1A2538', scrim: 'rgba(10,18,32,0.45)',
};
const dark: typeof light = {
  bg: '#0D131E', surface: '#151D2B', surface2: '#1E283A', ink: '#E5EBF4', muted: '#95A2BA', line: '#29354A',
  brand: '#62A6DA', brandSoft: '#1B3048', onBrand: '#0A1420', pen: '#F06A5E', penSoft: '#3A1F22',
  ok: '#4BC189', okSoft: '#173226', warn: '#E2AA4C', warnSoft: '#352A16', video: '#090E17', scrim: 'rgba(0,0,0,0.6)',
};
export type Colors = typeof light;

export const fonts = {
  display: 'Alexandria_700Bold',
  displaySemi: 'Alexandria_600SemiBold',
  body: 'IBMPlexSansArabic_400Regular',
  bodyMedium: 'IBMPlexSansArabic_500Medium',
  bodySemi: 'IBMPlexSansArabic_600SemiBold',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const CURRICULUM_COLOR: Record<string, string> = { american: '#2F6FA3', igcse: '#8A4FA0', stem: '#2F8A6A', bac: '#B5602A' };
export const AVATAR_COLORS = ['#2F6FA3', '#8A4FA0', '#2F8A6A', '#B5602A', '#A33E5A', '#4D5FA8', '#6E7A2E', '#1D5C8C'];
export const colorFor = (id: string) => AVATAR_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
