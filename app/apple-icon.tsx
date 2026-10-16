import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: '#171614',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f3f2ef',
          fontWeight: 'bold',
          borderRadius: '20px',
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