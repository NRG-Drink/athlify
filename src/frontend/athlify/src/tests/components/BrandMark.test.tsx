import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { BrandMark } from '../../components/BrandMark'
import { Provider } from '../../components/ui/provider'

describe('BrandMark', () => {
  test('each instance references its own gradient', () => {
    const { container } = render(
      <Provider>
        <BrandMark />
        <BrandMark />
      </Provider>,
    )
    const gradients = [...container.querySelectorAll('linearGradient')]
    const fills = [...container.querySelectorAll('path')].map((path) => path.getAttribute('fill'))

    expect(gradients).toHaveLength(2)
    expect(gradients[0].id).not.toBe(gradients[1].id)
    expect(fills).toEqual(gradients.map((gradient) => `url(#${gradient.id})`))
  })

  test('is hidden from assistive technology', () => {
    const { container } = render(
      <Provider>
        <BrandMark />
      </Provider>,
    )
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
