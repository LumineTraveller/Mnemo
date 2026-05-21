// Language Space — typography-first, reading-oriented
// Two palettes: dark (default) + light

export const darkColors = {
  // 背景：接近纯黑，带极轻蓝调
  bg:       '#0d0f1a',
  bg2:      '#111320',
  bg3:      '#161826',
  surface:  '#1a1c2a',
  overlay:  '#1f2132',
  // 分隔线
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.12)',
  // 文字四级：白色透明度递减
  text:     'rgba(255,255,255,0.92)',   // 主文字
  text2:    'rgba(255,255,255,0.60)',   // 次要（例句、输入文字）
  text3:    'rgba(255,255,255,0.35)',   // 元数据、标签、弱选项
  text4:    'rgba(255,255,255,0.20)',   // 最淡（未激活选项、分隔符）
  // Accent：低饱和冷绿调，克制使用
  accent:   '#7EB8A4',
  accentFg: '#a8d4c8',
  accentBg: 'rgba(126,184,164,0.10)',
  green:    '#7ec8a0',   greenBg:  'rgba(126,200,160,0.10)',
  amber:    '#d4a85a',   amberBg:  'rgba(212,168,90,0.10)',
  red:      '#e07878',   redBg:    'rgba(224,120,120,0.10)',
  error:    '#e07878',   errorBg:  'rgba(224,120,120,0.10)',
  primaryContainer:     'rgba(126,184,164,0.14)',
  onPrimaryContainer:   'rgba(255,255,255,0.80)',
  secondaryContainer:   'rgba(126,184,164,0.10)',
  onSecondaryContainer: '#7EB8A4',
  genderM:  '#7baaf7',   genderF:  '#e08888',   genderN: '#7ec8a0',
};

export const lightColors = {
  // 背景：暖纸白，舒适阅读感
  bg:       '#f5f3ee',
  bg2:      '#edeae3',
  bg3:      '#e6e2da',
  surface:  '#dedad2',
  overlay:  '#d3cec5',
  // 分隔线
  border:   'rgba(0,0,0,0.07)',
  border2:  'rgba(0,0,0,0.12)',
  // 文字四级：深色透明度递减
  text:     'rgba(0,0,0,0.88)',
  text2:    'rgba(0,0,0,0.55)',
  text3:    'rgba(0,0,0,0.38)',
  text4:    'rgba(0,0,0,0.22)',
  // Accent：深色背景下更深的绿调
  accent:   '#4a8a76',
  accentFg: '#2e6b58',
  accentBg: 'rgba(74,138,118,0.08)',
  green:    '#2e7a52',   greenBg:  'rgba(46,122,82,0.08)',
  amber:    '#a86020',   amberBg:  'rgba(168,96,32,0.08)',
  red:      '#b83232',   redBg:    'rgba(184,50,50,0.08)',
  error:    '#b83232',   errorBg:  'rgba(184,50,50,0.08)',
  primaryContainer:     'rgba(74,138,118,0.12)',
  onPrimaryContainer:   'rgba(0,0,0,0.80)',
  secondaryContainer:   'rgba(74,138,118,0.08)',
  onSecondaryContainer: '#2e6b58',
  genderM:  '#2e5fbf',   genderF:  '#b83232',   genderN: '#2e7a52',
};

// Mutable palette — mutated by applyTheme(), read by all StyleSheet.create calls
export const colors = { ...darkColors };

export function applyTheme(isDark) {
  const src = isDark ? darkColors : lightColors;
  Object.assign(colors, src);
}

export const fonts = {
  serif: 'Georgia',
  sans:  'System',
};

export const radius = {
  sm:   6,
  md:   12,
  lg:   18,
  xl:   26,
  full: 999,
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  40,
  xxl: 64,
};
