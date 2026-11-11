import { act, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { describe, expect, it } from 'vitest'
import { createFormatter, useFormat } from '../../i18n/useFormat'

const NBSP = ' '

describe('createFormatter', () => {
  const de = createFormatter('de')

  it('formats numbers with a fixed number of decimals and the unit', () => {
    expect(de.number(70.5, 1)).toBe('70.5')
    expect(de.number(70, 1)).toBe('70.0')
    expect(de.measure(70.5, 'kg', 1)).toBe(`70.5${NBSP}kg`)
  })

  it('shows a missing value as an em dash, never as zero', () => {
    expect(de.measure(undefined, '%', 1)).toBe('—')
  })

  it('signs changes with a real minus sign and leaves zero unsigned', () => {
    expect(de.signed(-0.7, 'kg', 1)).toBe(`−0.7${NBSP}kg`)
    expect(de.signed(0.3, '%', 1)).toBe(`+0.3${NBSP}%`)
    expect(de.signed(0.04, 'kg', 1)).toBe(`0.0${NBSP}kg`)
  })

  it('formats dates as DD.MM.YYYY and HH:MM (24 h) in every language', () => {
    const date = new Date(2026, 9, 2, 22, 31)
    const en = createFormatter('en')
    expect(de.date(date)).toBe('02.10.2026')
    expect(en.date(date)).toBe('02.10.2026')
    expect(de.dateTime(date)).toBe('02.10.2026, 22:31')
    expect(en.dateTime(date)).toBe('02.10.2026, 22:31')
    expect(de.axisDate(date.getTime(), 'days')).toBe('02.10.')
  })
})

describe('useFormat', () => {
  function Probe() {
    const format = useFormat()
    // Month names on chart axes still follow the language.
    return <p>{format.axisDate(new Date(2026, 9, 2).getTime(), 'months')}</p>
  }

  it('formats again when the language changes', async () => {
    render(<Probe />)
    expect(screen.getByText(/Okt/)).toBeInTheDocument()

    await act(() => i18n.changeLanguage('en'))

    expect(screen.getByText(/Oct/)).toBeInTheDocument()
  })
})
