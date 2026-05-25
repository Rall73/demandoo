import { ImageResponse } from "next/og"

export const size        = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background:     "linear-gradient(135deg, #7C3AED, #9333EA)",
          width:          "100%",
          height:         "100%",
          borderRadius:   "7px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 512 512" width="20" height="20">
          <polygon points="282,68 158,272 238,272 198,448 356,236 272,236" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
