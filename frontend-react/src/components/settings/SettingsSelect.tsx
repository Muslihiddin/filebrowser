import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

interface Props {
  id: string
  name: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * Select bound to a value. When the value is not one of the options, the
 * select shows an empty choice like a Vue select does, instead of silently
 * showing the first option.
 */
export function SettingsSelect({ id, name, value, options, onChange }: Props) {
  const known = options.some((option) => option.value === value)
  return (
    <NativeSelect
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full"
    >
      {!known && <NativeSelectOption value={value} hidden disabled />}
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
