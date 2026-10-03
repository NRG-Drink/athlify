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

  it('formats dates in the language of the formatter', () => {
    const date = new Date(2026, 9, 2, 10, 31)
    expect(de.date(date)).toMatch(/2\.? Okt\.? 2026/)
    expect(createFormatter('en').date(date)).toMatch(/2 Oct 2026/)
  })
})

describe('useFormat', () => {
  function Probe() {
    const format = useFormat()
    return <p>{format.date(new Date(2026, 9, 2))}</p>
  }

  it('formats again when the language changes', async () => {
    render(<Probe />)
    expect(screen.getByText(/Okt/)).toBeInTheDocument()

    await act(() => i18n.changeLanguage('en'))

    expect(screen.getByText(/Oct/)).toBeInTheDocument()
  })
})
