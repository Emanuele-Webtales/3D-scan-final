"use client"

import { useRef } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

export default function BundlingTutorialPage() {
  const squareRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const square = squareRef.current
    if (!square) return

    // Create continuous loading animation
    const tl = gsap.timeline({ repeat: -1 })

    tl.to(square, {
      rotation: 360,
      scale: 1.2,
      duration: 2,
      ease: "power2.inOut",
    })
    .to(square, {
      scale: 0.8,
      duration: 1,
      ease: "power2.inOut",
    }, "-=0.5")
    .to(square, {
      scale: 1,
      duration: 1,
      ease: "power2.inOut",
    })
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div
        ref={squareRef}
        className="w-[120px] h-[120px] bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl shadow-2xl"
        style={{
          boxShadow: "0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 bg-white rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  )
}
