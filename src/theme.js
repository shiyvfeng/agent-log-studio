// Geist foundations: https://vercel.com/geist/{colors,typography,materials}
// One palette for DOM controls and both Canvas rendering paths.
export const geist = Object.freeze({
  sans: 'Geist, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: '"Geist Mono", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", monospace',
  light: Object.freeze({
    'background-100':'#ffffff', 'background-200':'#fafafa',
    'gray-100':'#f2f2f2', 'gray-200':'#ebebeb', 'gray-300':'#e6e6e6',
    'gray-400':'#ebebeb', 'gray-500':'#c9c9c9', 'gray-600':'#a8a8a8',
    'gray-700':'#8f8f8f', 'gray-800':'#7d7d7d', 'gray-900':'#666666', 'gray-1000':'#171717',
    'blue-900':'#0068d6', 'red-900':'#e5484d', 'green-900':'#297a3a',
  }),
  dark: Object.freeze({background:'#0a0a0a',surface:'#111111',border:'#2e2e2e',muted:'#a1a1a1',text:'#ededed',blue:'#52a8ff',teal:'#0ac5b3',purple:'#bf7af0'}),
  darkPalette: Object.freeze({
    'background-100':'#0a0a0a', 'background-200':'#000000',
    'gray-100':'#1a1a1a', 'gray-200':'#1f1f1f', 'gray-300':'#292929',
    'gray-400':'#2e2e2e', 'gray-500':'#454545', 'gray-600':'#878787',
    'gray-700':'#8f8f8f', 'gray-800':'#7d7d7d', 'gray-900':'#a1a1a1', 'gray-1000':'#ededed',
    'blue-900':'#52a8ff', 'red-900':'#ff6166', 'green-900':'#62c073',
  }),
  radius: Object.freeze({base:6,modal:12}),
});
export function applyGeistTheme(){
  for(const [name,value] of Object.entries(geist.darkPalette))document.documentElement.style.setProperty(`--ds-${name}`,value);
  document.documentElement.style.setProperty('--font-sans',geist.sans);
  document.documentElement.style.setProperty('--font-mono',geist.mono);
}
export async function loadGeistFonts(){
  await Promise.all([document.fonts.load('400 26px Geist'),document.fonts.load('600 26px Geist'),document.fonts.load('400 18px "Geist Mono"')]);
}
