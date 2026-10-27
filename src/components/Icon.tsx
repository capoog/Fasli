import Svg, { Circle, Path, Rect } from 'react-native-svg';

const P: Record<string, (c: string) => React.ReactNode> = {
  home: () => <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  video: () => <><Rect x={2.5} y={6} width={13} height={12} rx={2} /><Path d="m15.5 10 6-3.5v11l-6-3.5" /></>,
  exam: () => <><Rect x={4} y={3} width={16} height={18} rx={2} /><Path d="M8 8h8M8 12h8M8 16h5" /></>,
  pen: () => <><Path d="m4 20 4-1L19.5 7.5a2.1 2.1 0 0 0-3-3L5 16z" /><Path d="m14 7 3 3" /></>,
  chart: () => <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bot: () => <><Rect x={4} y={8} width={16} height={12} rx={3} /><Path d="M12 4v4M9 13v1M15 13v1M9.5 17h5" /></>,
  ai: () => <><Path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><Path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
  class: () => <><Path d="M3 7l9-4 9 4-9 4z" /><Path d="M7 9v5c0 1.7 2.2 3 5 3s5-1.3 5-3V9" /></>,
  msg: () => <Path d="M4 5h16v11H9l-5 4z" />,
  gear: () => <><Circle cx={12} cy={12} r={3} /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  building: () => <Path d="M4 21V5l8-2v18M12 8h8v13M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01M2 21h20" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  trash: () => <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  send: () => <Path d="M4 12 20 4l-6 16-3-7z" />,
  back: () => <Path d="M15 5l-7 7 7 7" />,
  fwd: () => <Path d="M9 5l7 7-7 7" />,
  check: () => <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: () => <Path d="M6 6l12 12M18 6 6 18" />,
  upload: () => <Path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  camera: () => <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx={12} cy={13} r={3.5} /></>,
  doc: () => <><Path d="M6 3h8l4 4v14H6z" /><Path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  users: () => <><Circle cx={9} cy={8} r={3.5} /><Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></>,
  globe: () => <><Circle cx={12} cy={12} r={9} /><Path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" /></>,
  clock: () => <><Circle cx={12} cy={12} r={9} /><Path d="M12 7v5l3 2" /></>,
  link: () => <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, color = '#000', strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {P[name](color)}
    </Svg>
  );
}
