import React from 'react';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { colors } from '@/design/tokens';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Simple, thin, clean line icons. Nothing ornamental (design rule). */
function base(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24' };
}

export function IconToday({ size = 24, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3 4 8v8l8 5 8-5V8z" />
    </Svg>
  );
}

export function IconLadder({ size = 24, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="6" y1="3" x2="6" y2="21" />
      <Line x1="18" y1="3" x2="18" y2="21" />
      <Line x1="6" y1="7" x2="18" y2="7" />
      <Line x1="6" y1="12" x2="18" y2="12" />
      <Line x1="6" y1="17" x2="18" y2="17" />
    </Svg>
  );
}

export function IconSeason({ size = 24, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z" />
      <Path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </Svg>
  );
}

export function IconCrew({ size = 24, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="9" cy="8" r="3" />
      <Path d="M3 20a6 6 0 0 1 12 0" />
      <Path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2" />
    </Svg>
  );
}

export function IconSettings({ size = 24, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </Svg>
  );
}

export function IconChevron({ size = 24, color = colors.textSecondary, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 6 15 12 9 18" />
    </Svg>
  );
}

export function IconShare({ size = 24, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v13M8 7l4-4 4 4" />
      <Path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </Svg>
  );
}

export function IconBolt({ size = 24, color = colors.accent, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </Svg>
  );
}
