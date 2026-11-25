import { useRef, useState, type FormEvent } from 'react'
import { useFocusFirstInvalid } from './useFocusFirstInvalid'

/**
 * The state shared by the Settings forms: values, field errors, focus on the first invalid field,
 * and a submit that validates first and runs `run` only when every field is valid.
 */
export function useSettingsForm<V, E extends object>(initialValues: V, validate: (values: V) => E) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<V>(initialValues)
  const [errors, setErrors] = useState<Partial<E>>({})
  useFocusFirstInvalid(formRef, errors)

  const handleSubmit = (run: (values: V) => void) => (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    run(values)
  }

  return { formRef, values, setValues, errors, setErrors, handleSubmit }
}
