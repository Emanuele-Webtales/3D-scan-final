import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

interface GSAPSquareProps {
  size?: number
  color?: string
  text?: string
  onAnimationComplete?: () => void
  className?: string
  style?: React.CSSProperties
}

export default function GSAPSquare({
  size = 128,
  color = "linear-gradient(135deg, #fbbf24, #f59e0b)",
  text = "GSAP",
  onAnimationComplete,
  className = "",
  style = {}
}: GSAPSquareProps) {
  const squareRef = useRef<HTMLDivElement>(null)
  const [clickCount, setClickCount] = useState(0)

  useEffect(() => {
    const square = squareRef.current
    if (!square) return

    // Click animation
    const handleClick = () => {
      setClickCount(prev => prev + 1)
      
      gsap.to(square, {
        scale: 1.2,
        rotation: "+=180",
        backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
        duration: 0.6,
        ease: "back.out(1.7)",
        yoyo: true,
        repeat: 1,
        onComplete: onAnimationComplete
      })
    }

    // Scroll animations
    const scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: square,
        start: "top center",
        end: "bottom center",
        scrub: 1,
        onUpdate: (self) => {
          // Parallax effect
          gsap.set(square, {
            y: self.progress * -50,
            rotation: self.progress * 180
          })
        }
      }
    })

    // Add click event listener
    square.addEventListener("click", handleClick)

    // Cleanup
    return () => {
      square.removeEventListener("click", handleClick)
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [onAnimationComplete])

  return (
    <div
      ref={squareRef}
      className={`rounded-lg shadow-2xl cursor-pointer transform transition-all duration-300 hover:shadow-3xl ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        backdropFilter: "blur(10px)",
        ...style
      }}
    >
      <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
        {text}
      </div>
      {clickCount > 0 && (
        <div className="absolute -top-8 -right-8 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {clickCount}
        </div>
      )}
    </div>
  )
} 