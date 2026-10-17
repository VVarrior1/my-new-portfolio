import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 14,
          background: '#171614',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f3f2ef',
          fontWeight: 'bold',
          borderRadius: '6px',
        }}
      >
        AM
      </div>
    ),
    {
      ...size,
    }
  )
}