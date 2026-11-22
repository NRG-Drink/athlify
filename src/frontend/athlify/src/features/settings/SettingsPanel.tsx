import { Heading, Stack } from '@chakra-ui/react'
import { useId, type ReactNode } from 'react'

interface SettingsPanelProps {
  title: string
  children: ReactNode
}

/** A titled panel of the Settings page; the form inside is named by the visible heading. */
export function SettingsPanel({ title, children }: SettingsPanelProps) {
  const headingId = useId()
  return (
    <Stack
      as="section"
      aria-labelledby={headingId}
      gap="4"
      p="6"
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="l3"
      alignSelf="start"
    >
      <Heading as="h2" id={headingId} size="xl">
        {title}
      </Heading>
      {children}
    </Stack>
  )
}
