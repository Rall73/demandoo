import { ImageResponse } from "next/og"

export const size        = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background:     "#7c3aed",
          width:          "100%",
          height:         "100%",
          borderRadius:   "40px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color:      "white",
            fontSize:   "110px",
            fontWeight: "800",
            fontFamily: "sans-serif",
            lineHeight: 1,
          }}
        >
          d
        </div>
      </div>
    ),
    { ...size }
  )
}
