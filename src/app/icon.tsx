import { ImageResponse } from "next/og"

export const size        = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background:     "#7c3aed",
          width:          "100%",
          height:         "100%",
          borderRadius:   "8px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        {/* Letra d estilizada */}
        <div
          style={{
            color:      "white",
            fontSize:   "20px",
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
