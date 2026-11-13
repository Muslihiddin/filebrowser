import { languages } from './options'
import { SettingsSelect } from './SettingsSelect'

const options = Object.entries(languages).map(([value, label]) => ({ value, label }))

// Port of frontend/src/components/settings/Languages.vue
export function Languages(props: { id: string; locale: string; onChange: (locale: string) => void }) {
  return (
    <SettingsSelect
      id={props.id}
      name="selectLanguage"
      value={props.locale}
      options={options}
      onChange={props.onChange}
    />
  )
}
