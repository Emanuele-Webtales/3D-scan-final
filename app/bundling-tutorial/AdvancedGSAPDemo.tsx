import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)
}

interface AdvancedGSAPDemoProps {
  className?: string
  style?: React.CSSProperties
}

export default function AdvancedGSAPDemo({
  className = "",
  style = {}
}: AdvancedGSAPDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const morphingShapeRef = useRef<HTMLDivElement>(null)
  const pathElementRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const morphingShape = morphingShapeRef.current
    const pathElement = pathElementRef.current

    if (!container || !morphingShape || !pathElement) return

    // Complex timeline animation
    const mainTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top center",
        end: "bottom center",
        scrub: 1,
        markers: true,
        onEnter: () => setIsAnimating(true),
        onLeave: () => setIsAnimating(false),
        onEnterBack: () => setIsAnimating(true),
        onLeaveBack: () => setIsAnimating(false)
      }
    })

    // Morphing animation
    mainTimeline
      .to(morphingShape, {
        borderRadius: "50%",
        scale: 1.5,
        duration: 1,
        ease: "power2.inOut"
      })
      .to(morphingShape, {
        borderRadius: "0%",
        scale: 0.8,
        rotation: 45,
        duration: 1,
        ease: "power2.inOut"
      })
      .to(morphingShape, {
        borderRadius: "25%",
        scale: 1.2,
        rotation: 90,
        duration: 1,
        ease: "power2.inOut"
      })
      .to(morphingShape, {
        borderRadius: "0%",
        scale: 1,
        rotation: 0,
        duration: 1,
        ease: "power2.inOut"
      })

    // Path animation
    const pathTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top center",
        end: "bottom center",
        scrub: 1
      }
    })

    pathTimeline.to(pathElement, {
      motionPath: {
        path: [
          { x: 0, y: 0 },
          { x: 100, y: -50 },
          { x: 200, y: 0 },
          { x: 300, y: -100 },
          { x: 400, y: 0 },
          { x: 500, y: -50 },
          { x: 600, y: 0 }
        ],
        autoRotate: true,
        alignOrigin: [0.5, 0.5]
      },
      duration: 1
    })

    // Stagger animation for multiple elements
    const elements = container.querySelectorAll(".stagger-element")
    gsap.fromTo(elements, 
      {
        opacity: 0,
        y: 50,
        scale: 0.5
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: container,
          start: "top 80%",
          end: "bottom 20%",
          scrub: false
        }
      }
    )

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden ${className}`}
      style={style}
    >
      {/* Morphing shape */}
      <div
        ref={morphingShapeRef}
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-2xl"
        style={{
          transition: "all 0.3s ease"
        }}
      >
        <div className="w-full h-full flex items-center justify-center text-white font-bold">
          {isAnimating ? "Morphing!" : "Click Me"}
        </div>
      </div>

      {/* Path following element */}
      <div
        ref={pathElementRef}
        className="absolute top-1/2 left-0 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-lg"
      >
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
          Path
        </div>
      </div>

      {/* Stagger elements */}
      <div className="absolute top-3/4 left-1/2 transform -translate-x-1/2 flex gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="stagger-element w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-lg flex items-center justify-center text-white font-bold"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Floating particles with GSAP */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-white rounded-full opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-10 left-10 text-white text-lg opacity-80">
        <p>Scroll to see animations</p>
        <p className="text-sm opacity-60">Morphing • Path Following • Stagger</p>
      </div>
    </div>
  )
} 