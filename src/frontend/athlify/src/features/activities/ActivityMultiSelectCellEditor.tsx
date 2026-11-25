import { Button, Field, HStack, Input, NativeSelect, Popover, Stack } from '@chakra-ui/react'
import type { CustomCellEditorProps } from 'ag-grid-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { MAX_TAG_LENGTH } from './activityForm'
import type { FilterOption } from './activityFilters'
import type { ActivityRow } from './ActivitiesTable'

type Props = CustomCellEditorProps<ActivityRow, string[]> & {
  options: readonly FilterOption[]
  label: string
  onCreateTag?: (name: string, onCreated: (id: string) => void) => void
  isCreatingTag?: boolean
}

export function ActivityMultiSelectCellEditor({
  value,
  onValueChange,
  options,
  label,
  onCreateTag,
  isCreatingTag = false,
}: Props) {
  const { t } = useTranslation()
  const selectRef = useRef<HTMLSelectElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const selectedIds = value ?? []
  const trimmedTagName = tagName.trim()

  useEffect(() => selectRef.current?.focus(), [])

  return (
    <Stack gap="2">
      <NativeSelect.Root>
        <NativeSelect.Field
          ref={selectRef}
          aria-label={label}
          multiple
          value={selectedIds}
          onChange={(event) => {
            onValueChange(Array.from(event.currentTarget.selectedOptions, ({ value: id }) => id))
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {options.map(({ id, label: optionLabel }) => (
            <option key={id} value={id}>
              {optionLabel}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
      {onCreateTag && (
        <Popover.Root
          open={popoverOpen}
          onOpenChange={(details) => {
            setPopoverOpen(details.open)
            if (!details.open) setTagName('')
          }}
          initialFocusEl={() => inputRef.current}
          positioning={{ placement: 'bottom-start' }}
        >
          <Popover.Trigger asChild>
            <Button
              size="xs"
              rounded="full"
              variant="outline"
              borderStyle="dashed"
              color="fg.muted"
              onKeyDown={(event) => event.stopPropagation()}
            >
              <LuPlus aria-hidden />
              {t('activities.form.newTag')}
            </Button>
          </Popover.Trigger>
          <Popover.Positioner>
            <Popover.Content width="xs" maxWidth="calc(100vw - 2rem)" bg="bg.panel">
              <Popover.Body p="4">
                <Stack gap="3">
                  <Field.Root>
                    <Field.Label>{t('activities.form.tagName')}</Field.Label>
                    <Input
                      ref={inputRef}
                      size="sm"
                      maxLength={MAX_TAG_LENGTH}
                      value={tagName}
                      onChange={(event) => setTagName(event.target.value)}
                      onKeyDown={(event) => {
                        event.stopPropagation()
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        if (!trimmedTagName || isCreatingTag) return
                        onCreateTag(trimmedTagName, (id) => {
                          onValueChange([...new Set([...selectedIds, id])])
                          setTagName('')
                          setPopoverOpen(false)
                        })
                      }}
                    />
                  </Field.Root>
                  <HStack justify="flex-end" gap="2">
                    <Popover.CloseTrigger asChild>
                      <Button size="sm" variant="ghost">
                        {t('form.cancel')}
                      </Button>
                    </Popover.CloseTrigger>
                    <Button
                      size="sm"
                      disabled={!trimmedTagName}
                      loading={isCreatingTag}
                      onClick={() => {
                        if (!trimmedTagName || isCreatingTag) return
                        onCreateTag(trimmedTagName, (id) => {
                          onValueChange([...new Set([...selectedIds, id])])
                          setTagName('')
                          setPopoverOpen(false)
                        })
                      }}
                    >
                      {t('activities.form.createTag')}
                    </Button>
                  </HStack>
                </Stack>
              </Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Popover.Root>
      )}
    </Stack>
  )
}
