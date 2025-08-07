//@ts-ignore
import {
    useAspect,
    useTexture,
    useFrame,
    Canvas,
    useThree,
    Mesh,
    ShaderMaterial,
    MeshBasicMaterial,
    SRGBColorSpace,
    Vector2,
    Vector3,
    AdditiveBlending, //@ts-ignore the errors are to be
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-scan-bundle.js"

//--------------------------------
//--------------------------------

import {
    useContext,
    useMemo,
    useRef,
    useState,
    useEffect,
    createContext,
    ReactNode,
} from "react"
import { motion, useAnimation, useMotionValue } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const WIDTH = 1600
const HEIGHT = 900

// Mobile/touch detection hook
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            // Check for touch capability and screen size
            const hasTouch =
                "ontouchstart" in window || navigator.maxTouchPoints > 0
            const isSmallScreen = window.innerWidth <= 810
            setIsMobile(hasTouch || isSmallScreen)
        }

        checkIsMobile()
        window.addEventListener("resize", checkIsMobile)

        return () => window.removeEventListener("resize", checkIsMobile)
    }, [])

    return isMobile
}

// Property Controls for Framer
addPropertyControls(Home, {
    // === BACKGROUND SECTION ===
    showTexture: {
        type: ControlType.Boolean,
        title: "Show Background Image",
        description: "Show the texture image as background",
        defaultValue: false, // Changed to false by default
    },
    textureMap: {
        type: ControlType.ResponsiveImage,
        title: "Background Image",
        description: "The main texture image for the 3D scan effect",
        hidden: (props) => !props.showTexture,
    },
    depthMap: {
        type: ControlType.ResponsiveImage,
        title: "Depth Map",
        description: "The depth map image that controls the 3D displacement effect",
        hidden: (props) => !props.showTexture,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background Color",
        description: "Background color when texture is hidden",
        defaultValue: "#000000", // Black background by default
        hidden: (props) => props.showTexture ?? false,
    },

    // === EFFECT SECTION ===
    effectType: {
        type: ControlType.Enum,
        title: "Effect Type",
        description: "Choose between dots or gradient line effect",
        options: ["gradient", "dots"],
        optionTitles: ["Gradient Line", "Dots"],
        defaultValue: "gradient",
    },
    dotColor: {
        type: ControlType.Color,
        title: "Effect Color",
        description: "The color of the scanning effect",
        defaultValue: "#ffffff", // Changed to white by default
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        description: "Intensity/brightness of the effect",
        min: 0.0,
        max: 5.0,
        step: 0.1,
        defaultValue: 1.0,
    },

    // === GRADIENT SETTINGS ===
    gradientWidth: {
        type: ControlType.Number,
        title: "Line Width",
        description: "Width of the gradient line effect",
        min: 0.0,
        max: 5.0,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props) => props.effectType !== "gradient",
    },

    // === DOTS SETTINGS ===
    dotSize: {
        type: ControlType.Number,
        title: "Dot Size",
        description: "Size of the dots when using dots effect",
        min: 0.01,
        max: 2.0,
        step: 0.01,
        defaultValue: 0.1,
        hidden: (props) => props.effectType !== "dots",
    },
    tilingScale: {
        type: ControlType.Number,
        title: "Tiling Scale",
        description: "Number of dots tiled across the surface",
        min: 20,
        max: 200,
        step: 10,
        defaultValue: 50,
        hidden: (props) => props.effectType !== "dots",
    },

    // === BLOOM EFFECTS ===
    bloomStrength: {
        type: ControlType.Number,
        title: "Bloom Strength",
        description: "Strength of the bloom glow effect",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.15,
    },
    bloomRadius: {
        type: ControlType.Number,
        title: "Bloom Radius",
        description: "Radius of the bloom glow effect",
        min: 0.0001,
        max: 0.01,
        step: 0.0001,
        defaultValue: 0.001,
    },

    // === ANIMATION SECTION ===
    loopEnabled: {
        type: ControlType.Boolean,
        title: "Auto Loop",
        description: "Enable automatic looping animation",
        defaultValue: false,
    },
    loopType: {
        type: ControlType.Enum,
        title: "Loop Type",
        description: "Type of loop animation",
        options: ["repeat", "mirror", "oneShot"],
        optionTitles: ["Repeat", "Mirror", "One Shot"],
        defaultValue: "repeat",
        hidden: (props) => !props.loopEnabled,
    },
    loopDuration: {
        type: ControlType.Number,
        title: "Loop Duration",
        description: "Duration of each loop cycle in seconds",
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 3,
        hidden: (props) => !props.loopEnabled,
    },
    loopEasing: {
        type: ControlType.Enum,
        title: "Loop Easing",
        description: "Easing function for the loop animation",
        options: ["easeInOut", "easeIn", "easeOut", "power2.inOut", "power2.in", "power2.out"],
        optionTitles: ["Ease In Out", "Ease In", "Ease Out", "Power2 In Out", "Power2 In", "Power2 Out"],
        defaultValue: "easeInOut",
        hidden: (props) => !props.loopEnabled,
    },

    // === INTERACTION SECTION ===
    hoverEnabled: {
        type: ControlType.Boolean,
        title: "Hover Control",
        description: "Enable mouse hover to control the scan effect",
        defaultValue: true,
    },
    progressDirection: {
        type: ControlType.Enum,
        title: "Hover Direction",
        description: "Direction of the scanning effect when hovering",
        options: ["topToBottom", "bottomToTop", "leftToRight", "rightToLeft", "centerOutward", "outwardToCenter"],
        optionTitles: ["Top to Bottom", "Bottom to Top", "Left to Right", "Right to Left", "Center Outward", "Outward to Center"],
        defaultValue: "topToBottom",
        hidden: (props) => !props.hoverEnabled,
    },
})

// Global Context
interface GlobalContextType {
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}

export const GlobalContext = createContext<GlobalContextType>({
    isLoading: true,
    setIsLoading: () => {},
})

interface ContextProviderProps {
    children: ReactNode
}

export const ContextProvider: React.FC<ContextProviderProps> = ({
    children,
}) => {
    const [isLoading, setIsLoading] = useState(true)

    return (
        <GlobalContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
        </GlobalContext.Provider>
    )
}

// WebGPUCanvas Component
export const WebGPUCanvas = (props: any) => {
    return (
        <Canvas
            {...props}
            flat
            gl={{
                antialias: true,
                powerPreference: "high-performance",
                precision: "mediump",
                depth: true,
            }}
            style={{
                width: "100%",
                height: "100%",
            }}
            resize={{ offsetSize: true }}
            dpr={[1, 2]}
        >
            {props.children}
        </Canvas>
    )
}

// PostProcessing Component
export const PostProcessing = ({
    strength = 1,
    threshold = 1,
}: {
    strength?: number
    threshold?: number
}) => {
    const { gl, scene, camera } = useThree()

    // Simple post-processing setup that works with current Three.js version
    const render = useMemo(() => {
        // For now, just return the standard renderer
        return { gl, scene, camera }
    }, [gl, scene, camera])

    useFrame(() => {
        // Use standard rendering instead of renderAsync
        gl.setRenderTarget(null)
        gl.render(scene, camera)
    })

    return null
}

// UI Controls Component - now only for debugging/development
interface UIControlsProps {
    isVisible: boolean
    setIsVisible: (value: boolean) => void
}

const UIControls = ({
    isVisible,
    setIsVisible,
}: UIControlsProps) => {
    if (!isVisible) return null

    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                left: "20px",
                background: "rgba(0, 0, 0, 0.6)",
                padding: "20px",
                borderRadius: "24px",
                color: "white",
                fontFamily: "monospace",
                textTransform: "uppercase",
                fontSize: "13px",
                backdropFilter: "blur(10px)",
                zIndex: 1000,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                minWidth: "250px",
            }}
        >
            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>
                Development Controls
            </h3>
            
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 15px 0" }}>
                All effect controls are now available in Framer's property panel. This panel is for development only.
            </p>





            <button
                onClick={() => setIsVisible(false)}
                style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "12px",
                }}
            >
                Hide Controls
            </button>
        </div>
    )
}

interface SceneProps {
    dotSize: number
    dotColor: string
    tilingScale: number
    effectType: "dots" | "gradient"
    gradientWidth: number
    intensity: number
    bloomStrength: number
    bloomRadius: number
    showTexture: boolean
    backgroundColor: string
    progress: number
}

const Scene = ({
    dotSize,
    dotColor,
    tilingScale,
    effectType,
    gradientWidth,
    intensity,
    bloomStrength,
    bloomRadius,
    showTexture,
    backgroundColor,
    progress,
    textureMap,
    depthMap,
}: SceneProps & { textureMap?: any; depthMap?: any }) => {
    const { setIsLoading } = useContext(GlobalContext)
    const materialRef = useRef<Mesh>(null)

    // Log dotColor changes (not every frame!) - removed for performance

    // Convert Framer image objects to URLs
    const textureMapUrl =
        textureMap?.src ||
        textureMap ||
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlPC90ZXh0Pjwvc3ZnPg=="
    const depthMapUrl =
        depthMap?.src ||
        depthMap ||
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzY2NjY2NiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRlcHRoPC90ZXh0Pjwvc3ZnPg=="

    // Load the textures
    const [rawMap, depthMapTexture] = useTexture(
        [textureMapUrl, depthMapUrl],
        () => {
            setIsLoading(false)
            if (rawMap) {
                rawMap.colorSpace = SRGBColorSpace
            }
        }
    )

    // Memoized color conversion - only recalculates when dotColor changes
    const rgbColor = useMemo(() => {
    const hexToRgb = (hex: string) => {
        // Handle rgb() format
        const rgbMatch = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (rgbMatch) {
                return {
                r: parseInt(rgbMatch[1]) / 255,
                g: parseInt(rgbMatch[2]) / 255,
                b: parseInt(rgbMatch[3]) / 255,
            }
        }
        
        // Handle hex format
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result
            ? {
                  r: parseInt(result[1], 16) / 255,
                  g: parseInt(result[2], 16) / 255,
                  b: parseInt(result[3], 16) / 255,
              }
            : { r: 1, g: 0, b: 0 }
    }
        
        return hexToRgb(dotColor || "#ffffff")
    }, [dotColor])

    // Create background material for when texture is hidden
    const backgroundMaterial = useMemo(() => {
        return new MeshBasicMaterial({
            color: backgroundColor,
            transparent: false,
        })
    }, [backgroundColor])

    // Use MeshBasicMaterial for bright base image
    const material = useMemo(() => {
        return new MeshBasicMaterial({
            map: rawMap,
            transparent: false,
        })
    }, [rawMap])

    // Create uniform refs that persist between renders
    const uniformsRef = useRef({
        uProgress: { value: 0 },
        uDepthMap: { value: null as any },
        uColor: { value: new Vector3(0, 1, 0) },
        uEffectType: { value: effectType === "dots" ? 0.0 : 1.0 }, // Initialize with correct effect type
        uDotSize: { value: dotSize },
        uTilingScale: { value: tilingScale },
        uGradientWidth: { value: gradientWidth },
        uIntensity: { value: intensity }, // Renamed from uGradientIntensity
        uBloomStrength: { value: bloomStrength },
        uBloomRadius: { value: bloomRadius },
    })

    const [w, h] = useAspect(WIDTH, HEIGHT)

    // Store previous values to avoid unnecessary uniform updates
    const prevValuesRef = useRef({
        progress: -1,
        dotColor: '',
        effectType: '',
        dotSize: -1,
        tilingScale: -1,
        gradientWidth: -1,
        intensity: -1, // Renamed from gradientIntensity
        bloomStrength: -1,
        bloomRadius: -1,
    })

    // Initialize uniforms properly for both canvas and live environments
    useEffect(() => {
        const effectTypeValue = effectType === "dots" ? 0.0 : 1.0
        
        // Set initial uniforms - this ensures canvas environment shows correct values
        uniformsRef.current.uProgress.value = progress
        uniformsRef.current.uColor.value.set(rgbColor.r, rgbColor.g, rgbColor.b)
        uniformsRef.current.uEffectType.value = effectTypeValue
        uniformsRef.current.uDotSize.value = dotSize
        uniformsRef.current.uTilingScale.value = tilingScale
        uniformsRef.current.uGradientWidth.value = gradientWidth
        uniformsRef.current.uIntensity.value = intensity
        uniformsRef.current.uBloomStrength.value = bloomStrength
        uniformsRef.current.uBloomRadius.value = bloomRadius
        
        if (depthMapTexture) {
            uniformsRef.current.uDepthMap.value = depthMapTexture
        }
    }, [progress, rgbColor, effectType, dotSize, tilingScale, gradientWidth, intensity, bloomStrength, bloomRadius, depthMapTexture])

    // Update uniforms for the effects shader - optimized to only update when values change
    useFrame(() => {
        // For canvas environment, we already handle updates via useEffect above
        // For live environment, we need frame-by-frame updates for smooth animations
        if (RenderTarget.current() === RenderTarget.canvas) {
            return
        }
        
        const prev = prevValuesRef.current
        const effectTypeValue = effectType === "dots" ? 0.0 : 1.0

        // Only update uniforms that have actually changed
        if (prev.progress !== progress) {
        uniformsRef.current.uProgress.value = progress
            prev.progress = progress
        }

        if (prev.dotColor !== dotColor) {
        uniformsRef.current.uColor.value.set(rgbColor.r, rgbColor.g, rgbColor.b)
            prev.dotColor = dotColor
        }

        if (prev.effectType !== effectType) {
            uniformsRef.current.uEffectType.value = effectTypeValue
            prev.effectType = effectType
        }

        if (prev.dotSize !== dotSize) {
        uniformsRef.current.uDotSize.value = dotSize
            prev.dotSize = dotSize
        }

        if (prev.tilingScale !== tilingScale) {
        uniformsRef.current.uTilingScale.value = tilingScale
            prev.tilingScale = tilingScale
        }

                if (prev.gradientWidth !== gradientWidth) {
            uniformsRef.current.uGradientWidth.value = gradientWidth
            prev.gradientWidth = gradientWidth
        }

        if (prev.intensity !== intensity) {
            uniformsRef.current.uIntensity.value = intensity
            prev.intensity = intensity
        }

        if (prev.bloomStrength !== bloomStrength) {
        uniformsRef.current.uBloomStrength.value = bloomStrength
            prev.bloomStrength = bloomStrength
        }

        if (prev.bloomRadius !== bloomRadius) {
        uniformsRef.current.uBloomRadius.value = bloomRadius
            prev.bloomRadius = bloomRadius
        }

        // Update depth map when loaded (only once)
        if (
            depthMapTexture &&
            uniformsRef.current.uDepthMap.value !== depthMapTexture
        ) {
            uniformsRef.current.uDepthMap.value = depthMapTexture
        }
    })

    return (
        <>
            {/* Base layer - either texture image or background color */}
            {showTexture ? (
                <mesh scale={[w, h, 1]} material={material}>
                    <planeGeometry />
                </mesh>
            ) : (
                <mesh scale={[w, h, 1]} material={backgroundMaterial}>
                    <planeGeometry />
                </mesh>
            )}

            {/* Effects overlay mesh */}
            <mesh scale={[w, h, 1]} position={[0, 0, 0.01]} ref={materialRef}>
                <planeGeometry />
                <shaderMaterial
                    transparent={true}
                    blending={AdditiveBlending}
                    vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
                    fragmentShader={`
            uniform float uProgress;
            uniform sampler2D uDepthMap;
            uniform vec3 uColor;
            uniform float uEffectType;
            uniform float uDotSize;
            uniform float uTilingScale;
            uniform float uGradientWidth;
            uniform float uIntensity;
            uniform float uBloomStrength;
            uniform float uBloomRadius;
            varying vec2 vUv;
            
            // Noise functions removed for clean gradient lines
            
            void main() {
              vec2 uv = vUv;
              float depth = texture2D(uDepthMap, uv).r;
              
              // Use the exact working formula from reference-code.tsx
              float flow = 1.0 - smoothstep(0.0, 0.02, abs(depth - uProgress));
              
              // For dots effect - only render if explicitly in dots mode
              if (uEffectType < 0.5) {
                // Create tiled UV for dots
                vec2 aspect = vec2(1600.0 / 900.0, 1.0);
                vec2 tUv = vec2(uv.x * aspect.x, uv.y);
                vec2 tiling = vec2(uTilingScale);
                vec2 tiledUv = mod(tUv * tiling, 2.0) - 1.0;
                
                // Create dots (without noise for clean appearance)
                float dist = length(tiledUv);
                float dot = smoothstep(0.5, 0.49, dist);
                
                // Combine dots with flow, scale by dot size for better control
                float dotEffect = dot * flow * uDotSize;
                
                // Apply bloom effect to dots
                float bloomSize = uBloomRadius * 100.0;
                float dotBloom = 0.0;
                
                // Core bloom for dots
                float coreBloom = dot * flow * uBloomStrength;
                // Medium bloom - slightly larger area
                float mediumBloom = smoothstep(0.7, 0.3, dist) * flow * uBloomStrength * 0.6;
                // Outer bloom - largest area
                float outerBloom = smoothstep(0.9, 0.1, dist) * flow * uBloomStrength * 0.3;
                
                dotBloom = max(max(coreBloom, mediumBloom), outerBloom);
                
                // Combine dot effect with bloom and apply intensity
                float final = max(dotEffect, dotBloom) * uIntensity;
                gl_FragColor = vec4(uColor * final, final);
              } else {
                // For gradient line effect - high quality implementation from reference-code-old.tsx
                float exactProgress = abs(depth - uProgress);
                
                // Scale the gradient width to be less sensitive (like reference code)
                float scaledGradientWidth = uGradientWidth * 0.1;
                
                // Opacity pattern:
                // - Current progress band (exactProgress = 0): opacity = 1.0
                // - Bands within gradientWidth range: linear interpolation from 1.0 to 0.05
                // - Bands outside gradientWidth range: opacity = 0.0
                
                // Check if we're at the current progress band (very precise)
                bool isCurrentBand = exactProgress <= 0.001;
                
                // Check if we're within the gradient width range
                bool isWithinGradientRange = exactProgress <= scaledGradientWidth;
                
                // Calculate linear interpolation for bands within range
                // exactProgress goes from 0 to scaledGradientWidth
                // We want opacity to go from 1.0 to 0.05
                float normalizedDistance = exactProgress / scaledGradientWidth;
                float interpolatedOpacity = (1.0 - normalizedDistance) * 0.95 + 0.05;
                
                // Set opacity: 1.0 for current band, interpolated for bands within range, 0.0 for others
                float opacity = isCurrentBand ? 1.0 : (isWithinGradientRange ? interpolatedOpacity : 0.0);
                
                // Intensity-based bloom effect - brighter areas create more bloom like reference code
                float bloomStrength = uBloomStrength;
                float bloomSize = uBloomRadius * 100.0; // Scale up for better control
                
                // Create multiple layers of bloom at different sizes for realistic glow
                float bloom = 0.0;
                
                // Core bloom - closest to the line
                float coreBloom = exactProgress <= (scaledGradientWidth + bloomSize * 0.5) ? 
                    (1.0 - smoothstep(0.0, scaledGradientWidth + bloomSize * 0.5, exactProgress)) * bloomStrength : 0.0;
                
                // Medium bloom - extends further
                float mediumBloom = exactProgress <= (scaledGradientWidth + bloomSize) ? 
                    (1.0 - smoothstep(0.0, scaledGradientWidth + bloomSize, exactProgress)) * bloomStrength * 0.6 : 0.0;
                
                // Outer bloom - softest and widest
                float outerBloom = exactProgress <= (scaledGradientWidth + bloomSize * 2.0) ? 
                    (1.0 - smoothstep(0.0, scaledGradientWidth + bloomSize * 2.0, exactProgress)) * bloomStrength * 0.3 : 0.0;
                
                // Combine all bloom layers
                bloom = max(max(coreBloom, mediumBloom), outerBloom);
                
                // Intensity-based boost - stronger intensity creates more bloom
                float intensityBoost = uIntensity * 0.5;
                bloom *= (1.0 + intensityBoost);
                
                // Combine main line with bloom
                float finalOpacity = max(opacity, bloom);
                
                // Apply color and intensity
                gl_FragColor = vec4(uColor * finalOpacity * uIntensity, finalOpacity);
              }
            }
          `}
                    uniforms={uniformsRef.current}
                />
            </mesh>
        </>
    )
}

const Html = ({
    textureMap,
    depthMap,
    dotColor,
    effectType: propEffectType,
    dotSize: propDotSize,
    tilingScale: propTilingScale,
    gradientWidth: propGradientWidth,
    intensity: propIntensity,
    bloomStrength: propBloomStrength,
    bloomRadius: propBloomRadius,
    showTexture: propShowTexture,
    backgroundColor: propBackgroundColor,
    loopEnabled: propLoopEnabled,
    loopType: propLoopType,
    loopDuration: propLoopDuration,
    loopEasing: propLoopEasing,
    hoverEnabled: propHoverEnabled,
    progressDirection: propProgressDirection,
}: {
    textureMap?: any
    depthMap?: any
    dotColor?: string
    effectType?: "dots" | "gradient"
    dotSize?: number
    tilingScale?: number
    gradientWidth?: number
    intensity?: number
    bloomStrength?: number
    bloomRadius?: number
    showTexture?: boolean
    backgroundColor?: string
    loopEnabled?: boolean
    loopType?: "oneShot" | "repeat" | "mirror"
    loopDuration?: number
    loopEasing?: string
    hoverEnabled?: boolean
    progressDirection?: "topToBottom" | "bottomToTop" | "leftToRight" | "rightToLeft" | "centerOutward" | "outwardToCenter"
}) => {
    // Debug logs removed for performance
    
    const { isLoading } = useContext(GlobalContext)
    const isMobile = useIsMobile()

    // Debug logs removed for performance

    // Effect-related props with defaults
    const dotSize = propDotSize ?? 0.1
    const tilingScale = propTilingScale ?? 50
    const effectType = propEffectType ?? "gradient"
    const gradientWidth = propGradientWidth ?? 0.5
    const intensity = propIntensity ?? 1.0 // Renamed from gradientIntensity
    const bloomStrength = propBloomStrength ?? 0.15
    const bloomRadius = propBloomRadius ?? 0.001
    const showTexture = propShowTexture ?? false // Changed to false by default
    const backgroundColor = propBackgroundColor ?? "#000000" // Black background by default
    
    // UI state that remains as state (not exposed as property controls)
    const [isVisible, setIsVisible] = useState(true)

    // Loop and hover props with defaults
    const loopEnabled = propLoopEnabled ?? false
    const loopType = propLoopType ?? "repeat"
    const loopDuration = propLoopDuration ?? 3
    const loopEasing = propLoopEasing ?? "easeInOut"
    const hoverEnabled = propHoverEnabled ?? !isMobile
    const progressDirection = propProgressDirection ?? "topToBottom"

    // Mouse and progress state
    const [progress, setProgress] = useState(0)
    const [isHovering, setIsHovering] = useState(false)
    const [loopProgress, setLoopProgress] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [transitionStartProgress, setTransitionStartProgress] = useState(0)
    const [transitionStartTime, setTransitionStartTime] = useState(0)
    const [mirrorDirection, setMirrorDirection] = useState<
        "forward" | "backward"
    >("forward")
    const containerRef = useRef<HTMLDivElement>(null)
    const loopAnimation = useAnimation()
    const loopProgressMotion = useMotionValue(0)

    // Convert GSAP easing to Framer Motion easing
    const getEasing = (easing: string) => {
        switch (easing) {
            case "power2.inOut":
                return "easeInOut"
            case "power2.in":
                return "easeIn"
            case "power2.out":
                return "easeOut"
            case "power1.inOut":
                return "easeInOut"
            case "power1.in":
                return "easeIn"
            case "power1.out":
                return "easeOut"
            default:
                return "easeInOut"
        }
    }

    // Loop animation with Framer Motion
    useEffect(() => {
        if (!loopEnabled) {
            loopAnimation.stop()
            return
        }

        // Stop any existing animation
        loopAnimation.stop()

        const animateLoop = async () => {
            if (loopType === "oneShot") {
                await loopAnimation.start({
                    x: [0, 1],
                    transition: {
                        duration: loopDuration,
                        ease: getEasing(loopEasing),
                    },
                })
            } else if (loopType === "repeat") {
                await loopAnimation.start({
                    x: [0, 1],
                    transition: {
                        duration: loopDuration,
                        ease: getEasing(loopEasing),
                        repeat: Infinity,
                        repeatType: "loop",
                    },
                })
            } else if (loopType === "mirror") {
                // Custom mirror implementation with direction tracking
                const runMirrorLoop = async () => {
                    setMirrorDirection("forward")

                    while (loopEnabled) {
                        // Forward animation: 0 -> 1
                        setMirrorDirection("forward")
                        await loopAnimation.start({
                            x: [0, 1],
                            transition: {
                                duration: loopDuration,
                                ease: getEasing(loopEasing),
                            },
                        })

                        if (!loopEnabled) break

                        // Backward animation: 1 -> 0
                        setMirrorDirection("backward")
                        await loopAnimation.start({
                            x: [1, 0],
                            transition: {
                                duration: loopDuration,
                                ease: getEasing(loopEasing),
                            },
                        })
                    }
                }

                runMirrorLoop()
            }
        }

        animateLoop()

        return () => {
            loopAnimation.stop()
        }
    }, [loopEnabled, loopDuration, loopType, loopEasing, loopAnimation])

    // Update progress based on loop animation
    useEffect(() => {
        const unsubscribe = loopProgressMotion.on("change", (latest) => {
            setLoopProgress(latest)
            // Only set the main progress if not hovering and not transitioning
            if (!isHovering && !isTransitioning) {
                setProgress(latest)
            }
        })

        return unsubscribe
    }, [loopProgressMotion, isHovering, isTransitioning])

    // Handle hover state changes for loop animation control
    useEffect(() => {
        if (!loopEnabled) return

        if (isHovering && hoverEnabled && !isMobile) {
            loopAnimation.stop()
        }
    }, [isHovering, hoverEnabled, loopEnabled, isMobile, loopAnimation])

    // Handle mouse movement to control the scanning effect
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current || !hoverEnabled || isMobile) return

        // Get the bounding rectangle of the container
        const rect = containerRef.current.getBoundingClientRect()

        // Calculate progress based on direction
        let relativeProgress: number

        switch (progressDirection) {
            case "topToBottom":
                relativeProgress = (e.clientY - rect.top) / rect.height
                break
            case "bottomToTop":
                relativeProgress = 1 - (e.clientY - rect.top) / rect.height
                break
            case "leftToRight":
                relativeProgress = (e.clientX - rect.left) / rect.width
                break
            case "rightToLeft":
                relativeProgress = 1 - (e.clientX - rect.left) / rect.width
                break
            case "centerOutward":
                const centerX = rect.width / 2
                const centerY = rect.height / 2
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top
                const distance = Math.sqrt(
                    Math.pow(mouseX - centerX, 2) +
                        Math.pow(mouseY - centerY, 2)
                )
                const maxDistance = Math.sqrt(
                    Math.pow(centerX, 2) + Math.pow(centerY, 2)
                )
                relativeProgress = Math.min(distance / maxDistance, 1)
                break
            case "outwardToCenter":
                const centerX2 = rect.width / 2
                const centerY2 = rect.height / 2
                const mouseX2 = e.clientX - rect.left
                const mouseY2 = e.clientY - rect.top
                const distance2 = Math.sqrt(
                    Math.pow(mouseX2 - centerX2, 2) +
                        Math.pow(mouseY2 - centerY2, 2)
                )
                const maxDistance2 = Math.sqrt(
                    Math.pow(centerX2, 2) + Math.pow(centerY2, 2)
                )
                relativeProgress = 1 - Math.min(distance2 / maxDistance2, 1)
                break
            default:
                relativeProgress = (e.clientY - rect.top) / rect.height
        }

        // Clamp the value between 0 and 1
        const clampedProgress = Math.max(0, Math.min(1, relativeProgress))

        // Handle smooth transition during hover
        if (isHovering) {
            if (isTransitioning) {
                // During transition from loop to hover, smoothly interpolate
                const elapsed = (Date.now() - transitionStartTime) / 1000
                const transitionProgress = Math.min(elapsed / 0.3, 1)

                // Apply ease-in-out easing
                const easedProgress =
                    transitionProgress < 0.5
                        ? 2 * transitionProgress * transitionProgress
                        : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2

                // Smooth interpolation from start to current target
                const interpolatedProgress =
                    transitionStartProgress +
                    (clampedProgress - transitionStartProgress) * easedProgress
                setProgress(interpolatedProgress)

                // Check if transition is complete
                if (transitionProgress >= 1) {
                    setIsTransitioning(false)
                }
            } else {
                // After transition or no loop - follow cursor directly
                setProgress(clampedProgress)
            }
        }
    }

    // Handle mouse entering the container
    const handleMouseEnter = () => {
        if (!hoverEnabled || isMobile) return
        setIsHovering(true)

        // If loop is active, start transition from current progress to hover
        if (loopEnabled) {
            setIsTransitioning(true)
            setTransitionStartProgress(progress)
            setTransitionStartTime(Date.now())
            // Pause the loop animation
            loopAnimation.stop()
        }
    }

    // Handle mouse leaving the container
    const handleMouseLeave = async () => {
        if (!hoverEnabled || isMobile) return
        setIsHovering(false)
        setIsTransitioning(false)

        if (loopEnabled) {
            // First, complete the current cycle from hover-out position to 1
            const remainingDuration = loopDuration * (1 - progress)

            // Set the current position and animate to complete the cycle
            loopAnimation.set({ x: progress })

            if (loopType === "oneShot") {
                // For one shot, just complete to 1 and stop
                loopAnimation.start({
                    x: 1,
                    transition: {
                        duration: remainingDuration,
                        ease: getEasing(loopEasing),
                    },
                })
            } else {
                // For repeat and mirror, complete current cycle then restart natural cycle
                await loopAnimation.start({
                    x: 1,
                    transition: {
                        duration: remainingDuration,
                        ease: getEasing(loopEasing),
                    },
                })

                // Then start the natural loop cycle from 0
                if (loopType === "repeat") {
                    loopAnimation.start({
                        x: [0, 1],
                        transition: {
                            duration: loopDuration,
                            ease: getEasing(loopEasing),
                            repeat: Infinity,
                            repeatType: "loop",
                        },
                    })
                } else if (loopType === "mirror") {
                    // For mirror mode, determine direction based on current progress and continue appropriately
                    const runMirrorLoop = async () => {
                        // Since we just completed to 1, we should now go backward (1 -> 0)
                        setMirrorDirection("backward")
                        await loopAnimation.start({
                            x: [1, 0],
                            transition: {
                                duration: loopDuration,
                                ease: getEasing(loopEasing),
                            },
                        })

                        // After reaching 0, continue with normal mirror loop
                        while (loopEnabled) {
                            // Forward animation: 0 -> 1
                            setMirrorDirection("forward")
                            await loopAnimation.start({
                                x: [0, 1],
                                transition: {
                                    duration: loopDuration,
                                    ease: getEasing(loopEasing),
                                },
                            })

                            if (!loopEnabled) break

                            // Backward animation: 1 -> 0
                            setMirrorDirection("backward")
                            await loopAnimation.start({
                                x: [1, 0],
                                transition: {
                                    duration: loopDuration,
                                    ease: getEasing(loopEasing),
                                },
                            })
                        }
                    }

                    runMirrorLoop()
                }
            }
        }
    }

    // Debug logs removed for performance

    return (
        <div style={{ height: "100%", width: "100%" }}>
            {/* Hidden motion div to track loop animation progress */}
            <motion.div
                style={{ display: "none" }}
                animate={loopAnimation}
                onUpdate={(latest: any) => {
                    if (typeof latest.x === "number") {
                        loopProgressMotion.set(latest.x)
                    }
                }}
            />

            {isLoading && (
                <div
                    style={{
                        height: "100%",
                        position: "fixed",
                        zIndex: 90,
                        backgroundColor: "#92400e",
                        pointerEvents: "none",
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: isLoading ? 1 : 0,
                        transition: "opacity 0.5s ease-out",
                    }}
                    data-loader
                >
                    <div
                        style={{
                            width: "1.5rem",
                            height: "1.5rem",
                            backgroundColor: "white",
                            borderRadius: "50%",
                            animation:
                                "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
                        }}
                    ></div>
                </div>
            )}

            <div
                style={{ height: "100%" }}
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    style={{
                        height: "100%",
                        textTransform: "uppercase",
                        alignItems: "center",
                        width: "100%",
                        position: "absolute",
                        zIndex: 60,
                        pointerEvents: "none",
                        padding: "0 2.5rem",
                        display: "flex",
                        justifyContent: "center",
                        flexDirection: "column",
                    }}
                ></div>

                <WebGPUCanvas>
                    <PostProcessing></PostProcessing>
                    <Scene
                        dotSize={dotSize}
                        dotColor={dotColor || "#ffffff"}
                        tilingScale={tilingScale}
                        effectType={effectType}
                        gradientWidth={gradientWidth / 10}
                        intensity={intensity}
                        bloomStrength={bloomStrength}
                        bloomRadius={bloomRadius}
                        showTexture={showTexture}
                        backgroundColor={backgroundColor}
                        progress={progress}
                        textureMap={textureMap}
                        depthMap={depthMap}
                    />
                </WebGPUCanvas>

                {/* Debug Panel */}
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        right: "20px",
                        background: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                        padding: "15px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        zIndex: 1000,
                        minWidth: "200px",
                    }}
                >
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                        Debug Panel
                    </h4>
                    <div style={{ marginBottom: "5px" }}>
                        Current Progress: {(progress * 100).toFixed(1)}%
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Loop Progress: {(loopProgress * 100).toFixed(1)}%
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Loop Enabled: {loopEnabled ? "YES" : "NO"}
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Hover Enabled: {hoverEnabled ? "YES" : "NO"}
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Is Hovering: {isHovering ? "YES" : "NO"}
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Is Transitioning: {isTransitioning ? "YES" : "NO"}
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Loop Type: {loopType}
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                        Mirror Direction: {mirrorDirection}
                    </div>
                </div>

                {/* Toggle button for controls */}
                {!isVisible && (
                    <button
                        onClick={() => setIsVisible(true)}
                        style={{
                            position: "fixed",
                            top: "20px",
                            right: "250px",
                            background: "rgba(0, 0, 0, 0.8)",
                            color: "white",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            padding: "8px 12px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "12px",
                            zIndex: 1000,
                        }}
                    >
                        Show Controls
                    </button>
                )}

                {/* UI Controls */}
                <UIControls
                    isVisible={isVisible}
                    setIsVisible={setIsVisible}
                />
            </div>
        </div>
    )
}

export default function Home(props: { 
    textureMap?: any; 
    depthMap?: any; 
    dotColor?: string; 
    effectType?: "dots" | "gradient";
    dotSize?: number;
    tilingScale?: number;
    gradientWidth?: number;
    intensity?: number;
    bloomStrength?: number;
    bloomRadius?: number;
    showTexture?: boolean;
    backgroundColor?: string;
    loopEnabled?: boolean;
    loopType?: "oneShot" | "repeat" | "mirror";
    loopDuration?: number;
    loopEasing?: string;
    hoverEnabled?: boolean;
    progressDirection?: "topToBottom" | "bottomToTop" | "leftToRight" | "rightToLeft" | "centerOutward" | "outwardToCenter";
}) {
    // Debug logs removed for performance
    
    return (
        <ContextProvider>
            <Html
                textureMap={props.textureMap}
                depthMap={props.depthMap}
                dotColor={props.dotColor}
                effectType={props.effectType}
                dotSize={props.dotSize}
                tilingScale={props.tilingScale}
                gradientWidth={props.gradientWidth}
                intensity={props.intensity}
                bloomStrength={props.bloomStrength}
                bloomRadius={props.bloomRadius}
                showTexture={props.showTexture}
                backgroundColor={props.backgroundColor}
                loopEnabled={props.loopEnabled}
                loopType={props.loopType}
                loopDuration={props.loopDuration}
                loopEasing={props.loopEasing}
                hoverEnabled={props.hoverEnabled}
                progressDirection={props.progressDirection}
            ></Html>
        </ContextProvider>
    )
}
