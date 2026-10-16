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
          background: '#0c1020',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fafbfe',
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