import { aceThemes } from './options'
import { SettingsSelect } from './SettingsSelect'

const options = aceThemes.map((theme) => ({ value: theme.theme, label: theme.name }))

// Port of frontend/src/components/settings/AceEditorTheme.vue
export function AceEditorTheme(props: {
  id: string
  aceEditorTheme: string
  onChange: (theme: string) => void
}) {
  return (
    <SettingsSelect
      id={props.id}
      name="selectAceEditorTheme"
      value={props.aceEditorTheme}
      options={options}
      onChange={props.onChange}
    />
  )
}
