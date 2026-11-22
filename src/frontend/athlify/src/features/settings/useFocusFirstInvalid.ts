import { useEffect, type RefObject } from 'react'

/** Moves focus to the first invalid field of the form whenever a new set of errors appears. */
export function useFocusFirstInvalid(
  formRef: RefObject<HTMLFormElement | null>,
  errors: Record<string, string | undefined>,
) {
  const hasErrors = Object.values(errors).some(Boolean)
  useEffect(() => {
    if (hasErrors) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors, hasErrors, formRef])
}
