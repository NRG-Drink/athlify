import { chakra, type BoxProps } from '@chakra-ui/react'
import { useId } from 'react'
import { gradientStops } from '../theme/palette'

// The Athlify mark from public/favicon.svg, cropped to the shape. It is
// decorative: the visible "Athlify" wordmark next to it names the link.
export function BrandMark({ boxSize = '7' }: { boxSize?: BoxProps['boxSize'] }) {
  // useId() output can contain characters that break url(#…) references.
  const gradientId = `athlify-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [top, middle, bottom] = gradientStops.volt

  return (
    <chakra.svg viewBox="0 24 340 342" boxSize={boxSize} flexShrink="0" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.5" stopColor={middle} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        fillRule="evenodd"
        d="M0 362 L133 40 Q137 30 148 30 L222 30 Q233 30 237 40 L336 340 L272 340 L228 205 L50 340 Z M185 95 L212 172 L251 158 L225 184 L130 222 Z"
      />
    </chakra.svg>
  )
}
