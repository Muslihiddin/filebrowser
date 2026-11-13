// Options of frontend/src/components/settings/Languages.vue
export const languages: Record<string, string> = {
  ar: 'العربية',
  bg: 'български език',
  ca: 'Català',
  cs: 'Čeština',
  de: 'Deutsch',
  el: 'Ελληνικά',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  he: 'עברית',
  hr: 'Hrvatski',
  hu: 'Magyar',
  is: 'Icelandic',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  no: 'Norsk',
  nl: 'Nederlands (Nederland)',
  'nl-be': 'Nederlands (België)',
  lv: 'Latviešu',
  pl: 'Polski',
  'pt-br': 'Português (Brasil)',
  'pt-pt': 'Português (Portugal)',
  ro: 'Romanian',
  ru: 'Русский',
  sk: 'Slovenčina',
  'sv-se': 'Swedish (Sweden)',
  tr: 'Türkçe',
  uk: 'Українська',
  vi: 'Tiếng Việt',
  'zh-cn': '中文 (简体)',
  'zh-tw': '中文 (繁體)',
}

// Theme list of ace-builds/src-noconflict/ext-themelist (ace-builds 1.44),
// used by frontend/src/components/settings/AceEditorTheme.vue. The React app
// does not ship the editor yet, so the list is copied here.
const themeData: [caption: string, name?: string][] = [
  ['Chrome'],
  ['Clouds'],
  ['Crimson Editor'],
  ['Dawn'],
  ['Dreamweaver'],
  ['Eclipse'],
  ['GitHub Light Default'],
  ['GitHub (Legacy)', 'github'],
  ['IPlastic'],
  ['Solarized Light'],
  ['TextMate'],
  ['Tomorrow'],
  ['XCode'],
  ['Kuroir'],
  ['KatzenMilch'],
  ['SQL Server', 'sqlserver'],
  ['CloudEditor', 'cloud_editor'],
  ['Ambiance', 'ambiance'],
  ['Chaos', 'chaos'],
  ['Clouds Midnight', 'clouds_midnight'],
  ['Dracula', ''],
  ['Cobalt', 'cobalt'],
  ['Gruvbox', 'gruvbox'],
  ['Green on Black', 'gob'],
  ['idle Fingers', 'idle_fingers'],
  ['krTheme', 'kr_theme'],
  ['Merbivore', 'merbivore'],
  ['Merbivore Soft', 'merbivore_soft'],
  ['Mono Industrial', 'mono_industrial'],
  ['Monokai', 'monokai'],
  ['Nord Dark', 'nord_dark'],
  ['One Dark', 'one_dark'],
  ['Pastel on dark', 'pastel_on_dark'],
  ['Solarized Dark', 'solarized_dark'],
  ['Terminal', 'terminal'],
  ['Tomorrow Night', 'tomorrow_night'],
  ['Tomorrow Night Blue', 'tomorrow_night_blue'],
  ['Tomorrow Night Bright', 'tomorrow_night_bright'],
  ['Tomorrow Night 80s', 'tomorrow_night_eighties'],
  ['Twilight', 'twilight'],
  ['Vibrant Ink', 'vibrant_ink'],
  ['GitHub Dark', 'github_dark'],
  ['CloudEditor Dark', 'cloud_editor_dark'],
]

export interface AceTheme {
  /** Shown in the select, like the Vue app. */
  name: string
  /** Stored value, e.g. "ace/theme/chrome". */
  theme: string
}

export const aceThemes: AceTheme[] = themeData.map(([caption, name]) => {
  const themeName = name || caption.replace(/ /g, '_').toLowerCase()
  return { name: themeName, theme: 'ace/theme/' + themeName }
})
