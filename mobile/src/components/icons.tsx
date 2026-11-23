import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Line icons on a 24-unit grid, 2px stroke, round caps (drawn after Lucide, ISC licence). One
// component so every screen gets the same weight and size rules.

export type IconName =
  | 'back'
  | 'close'
  | 'chevron'
  | 'plus'
  | 'minus'
  | 'star'
  | 'plate'
  | 'bag'
  | 'alert'
  | 'user'
  | 'map'
  | 'list'
  | 'filter'
  | 'locate'
  | 'search'
  | 'bell'
  | 'chat'
  | 'calendar'
  | 'clock'
  | 'pin'
  | 'chef'
  | 'settings'
  | 'check'
  | 'camera'
  | 'image'
  | 'send'
  | 'share'
  | 'flag'
  | 'trash'
  | 'sparkle'
  | 'ticket'
  | 'info'
  | 'wallet'
  | 'drink'
  | 'shield'
  | 'more';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 24, color = '#161413', strokeWidth = 2 }: Props) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as string };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {shape(name, p, color)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

function shape(name: IconName, p: StrokeProps, color: string) {
  switch (name) {
    case 'back':
      return <Path d="M15 18l-6-6 6-6" {...p} />;
    case 'close':
      return <Path d="M18 6L6 18M6 6l12 12" {...p} />;
    case 'chevron':
      return <Path d="M9 18l6-6-6-6" {...p} />;
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...p} />;
    case 'minus':
      return <Path d="M5 12h14" {...p} />;
    case 'star':
      return (
        <Path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          {...p}
          fill={color}
        />
      );
    case 'plate':
      return (
        <>
          <Circle cx={12} cy={12} r={7} {...p} />
          <Circle cx={12} cy={12} r={3.5} {...p} />
          <Path d="M2 4v6M4 4v6M3 10v10M22 4c-1.5 1-2 3-2 5s1 2 2 2v9" {...p} />
        </>
      );
    case 'bag':
      return (
        <>
          <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" {...p} />
          <Path d="M3 6h18M16 10a4 4 0 01-8 0" {...p} />
        </>
      );
    case 'alert':
      return (
        <>
          <Circle cx={12} cy={12} r={10} {...p} />
          <Path d="M12 8v4M12 16h.01" {...p} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21a8 8 0 0116 0" {...p} />
        </>
      );
    case 'map':
      return <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" {...p} />;
    case 'list':
      return <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" {...p} />;
    case 'filter':
      return <Path d="M4 6h16M7 12h10M10 18h4" {...p} />;
    case 'locate':
      return (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...p} />
          <Circle cx={12} cy={12} r={7} {...p} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={7} {...p} />
          <Path d="M21 21l-4.3-4.3" {...p} />
        </>
      );
    case 'bell':
      return <Path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" {...p} />;
    case 'chat':
      return <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" {...p} />;
    case 'calendar':
      return (
        <>
          <Rect x={3} y={4} width={18} height={18} rx={2} {...p} />
          <Path d="M16 2v4M8 2v4M3 10h18" {...p} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={10} {...p} />
          <Path d="M12 6v6l4 2" {...p} />
        </>
      );
    case 'pin':
      return (
        <>
          <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" {...p} />
          <Circle cx={12} cy={10} r={3} {...p} />
        </>
      );
    case 'chef':
      return (
        <Path
          d="M6 13.87A4 4 0 017.41 6a5.11 5.11 0 019.18 0A4 4 0 0118 13.87V21H6zM6 17h12"
          {...p}
        />
      );
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            {...p}
          />
        </>
      );
    case 'check':
      return <Path d="M20 6L9 17l-5-5" {...p} />;
    case 'camera':
      return (
        <>
          <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" {...p} />
          <Circle cx={12} cy={13} r={4} {...p} />
        </>
      );
    case 'image':
      return (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={2} {...p} />
          <Circle cx={9} cy={9} r={2} {...p} />
          <Path d="M21 15l-5-5L5 21" {...p} />
        </>
      );
    case 'send':
      return <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />;
    case 'share':
      return <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" {...p} />;
    case 'flag':
      return <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" {...p} />;
    case 'trash':
      return <Path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" {...p} />;
    case 'sparkle':
      return <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" {...p} />;
    case 'ticket':
      return <Path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4zM13 5v2M13 17v2M13 11v2" {...p} />;
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={10} {...p} />
          <Path d="M12 16v-4M12 8h.01" {...p} />
        </>
      );
    case 'wallet':
      return <Path d="M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 000 4h4v-4z" {...p} />;
    case 'drink':
      return <Path d="M8 22h8M12 15v7M5 2h14l-2 9a5 5 0 01-10 0z" {...p} />;
    case 'shield':
      return <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" {...p} />;
    case 'more':
      return (
        <>
          <Circle cx={5} cy={12} r={1} {...p} />
          <Circle cx={12} cy={12} r={1} {...p} />
          <Circle cx={19} cy={12} r={1} {...p} />
        </>
      );
  }
}
