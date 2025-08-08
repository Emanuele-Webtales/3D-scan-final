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
import { animate } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Dynamic aspect ratio will be calculated from the actual images

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

// Hook to get image aspect ratio from a loaded Three.js texture (supports multiple sources)
const useImageAspectRatio = (texture: any) => {
    const [aspectRatio, setAspectRatio] = useState(16 / 9) // Default aspect ratio

    useEffect(() => {
        if (!texture) return

        // three@r150+ may store data on texture.source.data
        const source: any = (texture as any).image || (texture as any).source?.data
        if (!source) return

        const width =
            (source as any).videoWidth ||
            (source as any).naturalWidth ||
            (source as any).width
        const height =
            (source as any).videoHeight ||
            (source as any).naturalHeight ||
            (source as any).height

        if (width && height) {
            setAspectRatio(width / height)
        }
    }, [texture])

    return aspectRatio
}

// Property Controls for Framer
addPropertyControls(Home, {
    depthMap: {
        type: ControlType.ResponsiveImage,
        title: "Depth",
    },
    backgroundMode: {
        type: ControlType.Boolean,
        title: "Background",
        defaultValue: false, // false = Color, true = Image
    },
    textureMap: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        hidden: (props) => !props.backgroundMode,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
        hidden: (props) => !!props.backgroundMode,
    },
    effectType: {
        type: ControlType.Enum,
        title: "Type",
        options: ["gradient", "dots"],
        optionTitles: ["Gradient", "Dots"],
        defaultValue: "gradient",
    },
    dotColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0.1,
        max: 5.0,
        step: 0.1,
        defaultValue: 1.5,
    },

    gradient: {
        type: ControlType.Object,
        title: "Gradient",
        hidden: (props) => props.effectType !== "gradient",
        controls: {
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 0.0,
                max: 5.0,
                step: 0.1,
                defaultValue: 1.6,
            },
            bloomStrength: {
                type: ControlType.Number,
                title: "Bloom",
                min: 0.0,
                max: 1.0,
                step: 0.01,
                defaultValue: 0.49,
            },
            bloomRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0.0001,
                max: 0.01,
                step: 0.0001,
                defaultValue: 0.0053,
            },
        },
    },

    dots: {
        type: ControlType.Object,
        title: "Dots",
        hidden: (props) => props.effectType !== "dots",
        controls: {
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 0.01,
                max: 2.0,
                step: 0.01,
                defaultValue: 0.1,
            },
            tiling: {
                type: ControlType.Number,
                title: "Tiling",
                min: 20,
                max: 200,
                step: 10,
                defaultValue: 50,
            },
            bloomStrength: {
                type: ControlType.Number,
                title: "Bloom",
                min: 0.0,
                max: 1.0,
                step: 0.01,
                defaultValue: 0.15,
            },
            bloomRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0.0001,
                max: 0.01,
                step: 0.0001,
                defaultValue: 0.001,
            },
        },
    },

    loop: {
        type: ControlType.Object,
        title: "Loop",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: false,
            },
            type: {
                type: ControlType.Enum,
                title: "Type",
                options: ["repeat", "mirror", "oneShot"],
                optionTitles: ["Repeat", "Mirror", "One Shot"],
                defaultValue: "repeat",
                hidden: (props) => !props.enabled,
            },
            transition: {
                type: ControlType.Transition,
                title: "Timing",
                defaultValue: {
                    type: "tween",
                    duration: 3,
                    ease: "easeInOut",
                },
                hidden: (props) => !props.enabled,
            },
        },
    },

    hover: {
        type: ControlType.Object,
        title: "Hover",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: true,
            },
            direction: {
                type: ControlType.Enum,
                title: "Direction",
                options: [
                    "topToBottom",
                    "bottomToTop",
                    "leftToRight",
                    "rightToLeft",
                    "centerOutward",
                    "outwardToCenter",
                ],
                optionTitles: [
                    "Top Down",
                    "Bottom Up",
                    "Left Right",
                    "Right Left",
                    "Center Out",
                    "Out Center",
                ],
                defaultValue: "topToBottom",
                hidden: (props) => !props.enabled,
            },
        },
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
    const { viewport } = useThree()
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

    // Determine which provided asset should drive aspect ratio. If the user did not
    // provide a texture map, ignore the placeholder texture and use the real depth map.
    const hasTextureMapProp = !!(
        textureMap && (textureMap.src || typeof textureMap === "string")
    )
    const aspectSourceTexture = hasTextureMapProp ? rawMap : depthMapTexture
    const imageAspectRatio = useImageAspectRatio(aspectSourceTexture)

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
        uAspectRatio: { value: imageAspectRatio }, // Dynamic aspect ratio
    })

    // Calculate responsive scaling for COVER behavior - image fills entire container
    const { width: scaleX, height: scaleY } = useMemo(() => {
        const viewportAspectRatio = viewport.width / viewport.height

        if (imageAspectRatio > viewportAspectRatio) {
            // Image is wider than viewport - scale to fill viewport height (image will be cropped on sides)
            return {
                width: viewport.height * imageAspectRatio,
                height: viewport.height,
            }
        } else {
            // Image is taller than viewport - scale to fill viewport width (image will be cropped on top/bottom)
            return {
                width: viewport.width,
                height: viewport.width / imageAspectRatio,
            }
        }
    }, [viewport.width, viewport.height, imageAspectRatio])

    // Store previous values to avoid unnecessary uniform updates
    const prevValuesRef = useRef({
        progress: -1,
        dotColor: "",
        effectType: "",
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

        // Update aspect ratio uniform
        uniformsRef.current.uAspectRatio.value = imageAspectRatio
    }, [
        progress,
        rgbColor,
        effectType,
        dotSize,
        tilingScale,
        gradientWidth,
        intensity,
        bloomStrength,
        bloomRadius,
        depthMapTexture,
        imageAspectRatio,
    ])

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
            uniformsRef.current.uColor.value.set(
                rgbColor.r,
                rgbColor.g,
                rgbColor.b
            )
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
                <mesh scale={[scaleX, scaleY, 1]} material={material}>
                    <planeGeometry />
                </mesh>
            ) : (
                <mesh scale={[scaleX, scaleY, 1]} material={backgroundMaterial}>
                    <planeGeometry />
                </mesh>
            )}

            {/* Effects overlay mesh */}
            <mesh
                scale={[scaleX, scaleY, 1]}
                position={[0, 0, 0.01]}
                ref={materialRef}
            >
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
            uniform float uAspectRatio;
            varying vec2 vUv;
            
            // Noise functions removed for clean gradient lines
            
            void main() {
              vec2 uv = vUv;
              float depth = texture2D(uDepthMap, uv).r;
              
              // Use the exact working formula from reference-code.tsx
              float flow = 1.0 - smoothstep(0.0, 0.02, abs(depth - uProgress));
              
              // For dots effect - only render if explicitly in dots mode
              if (uEffectType < 0.5) {
                // Create tiled UV for dots using dynamic aspect ratio
                vec2 aspect = vec2(uAspectRatio, 1.0);
                vec2 tUv = vec2(uv.x * aspect.x, uv.y);
                vec2 tiling = vec2(uTilingScale);
                vec2 tiledUv = mod(tUv * tiling, 2.0) - 1.0;
                
                // Create dots with proper size control
                float dist = length(tiledUv);
                float dotRadius = 0.5 - (uDotSize * 0.4); // uDotSize controls actual dot size
                float dot = smoothstep(dotRadius, dotRadius - 0.01, dist);
                
                // Base dot effect (no multiplication by uDotSize)
                float dotEffect = dot * flow;
                
                // Apply bloom effect to dots
                float bloomSize = uBloomRadius * 100.0;
                float dotBloom = 0.0;
                
                // Core bloom for dots - use the same dot radius
                float coreBloom = dot * flow * uBloomStrength;
                // Medium bloom - extends from dot edge
                float mediumBloom = smoothstep(dotRadius + bloomSize * 0.3, dotRadius, dist) * flow * uBloomStrength * 0.6;
                // Outer bloom - largest area
                float outerBloom = smoothstep(dotRadius + bloomSize, dotRadius, dist) * flow * uBloomStrength * 0.3;
                
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
    intensity: propIntensity,
    showTexture: deprecatedShowTexture,
    backgroundMode: propBackgroundMode,
    backgroundColor: propBackgroundColor,
    gradient: propGradient,
    dots: propDots,
    loop: propLoop,
    hover: propHover,
}: {
    textureMap?: any
    depthMap?: any
    dotColor?: string
    effectType?: "dots" | "gradient"
    intensity?: number
    showTexture?: boolean // deprecated: kept for backwards compatibility
    backgroundMode?: boolean
    backgroundColor?: string
    gradient?: {
        width?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    dots?: {
        size?: number
        tiling?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    loop?: {
        enabled?: boolean
        type?: "oneShot" | "repeat" | "mirror"
        transition?: any // Full Framer Motion transition object
    }
    hover?: {
        enabled?: boolean
        direction?:
            | "topToBottom"
            | "bottomToTop"
            | "leftToRight"
            | "rightToLeft"
            | "centerOutward"
            | "outwardToCenter"
    }
}) => {
    // Debug logs removed for performance

    const { isLoading } = useContext(GlobalContext)
    const isMobile = useIsMobile()

    // Debug logs removed for performance

    // Effect-related props with defaults
    const effectType = propEffectType ?? "gradient"
    const intensity = propIntensity ?? 1.0
    const backgroundMode = propBackgroundMode ?? !!deprecatedShowTexture // true = Image, false = Color
    const showTexture = backgroundMode
    const backgroundColor = propBackgroundColor ?? "#000000"

    // Extract nested object props with defaults
    const dotSize = propDots?.size ?? 0.1
    const tilingScale = propDots?.tiling ?? 50
    const dotsBloomStrength = propDots?.bloomStrength ?? 0.15
    const dotsBloomRadius = propDots?.bloomRadius ?? 0.001

    const gradientWidth = propGradient?.width ?? 0.5
    const gradientBloomStrength = propGradient?.bloomStrength ?? 0.15
    const gradientBloomRadius = propGradient?.bloomRadius ?? 0.001

    const loopEnabled = propLoop?.enabled ?? false
    const loopType = propLoop?.type ?? "repeat"
    const loopTransition = propLoop?.transition ?? {
        type: "tween",
        duration: 3,
        ease: "easeInOut",
    }

    const hoverEnabled = propHover?.enabled ?? !isMobile
    const progressDirection = propHover?.direction ?? "topToBottom"

    // Use appropriate bloom values based on effect type
    const bloomStrength =
        effectType === "dots" ? dotsBloomStrength : gradientBloomStrength
    const bloomRadius =
        effectType === "dots" ? dotsBloomRadius : gradientBloomRadius

    // UI state that remains as state (not exposed as property controls)
    const [isVisible, setIsVisible] = useState(true)

    // Mouse and progress state
    const [progress, setProgress] = useState(0)
    const [isHovering, setIsHovering] = useState(false)
    const [loopProgress, setLoopProgress] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [transitionStartProgress, setTransitionStartProgress] = useState(0)
    const [transitionStartTime, setTransitionStartTime] = useState(0)

    const containerRef = useRef<HTMLDivElement>(null)
    const animationControlsRef = useRef<any>(null)

    // Loop animation function - defined outside useEffect so it can be called from hover handlers
    const startLoop = (startFrom = 0, forceProgressUpdate = false) => {
        console.log(
            "startLoop called with startFrom:",
            startFrom,
            "forceProgressUpdate:",
            forceProgressUpdate
        )

        if (
            !loopEnabled ||
            RenderTarget.current() === RenderTarget.canvas ||
            isLoading
        ) {
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
                animationControlsRef.current = null
            }
            // Keep progress at zero in canvas mode
            if (RenderTarget.current() === RenderTarget.canvas) {
                setProgress(0)
                setLoopProgress(0)
            }
            return
        }

        // Stop any existing animation
        if (animationControlsRef.current) {
            animationControlsRef.current.stop()
        }

        if (loopType === "oneShot") {
            animationControlsRef.current = animate(startFrom, 1, {
                ...loopTransition,
                onUpdate: (latest) => {
                    setLoopProgress(latest)
                    // Only set the main progress if not hovering and not transitioning, or if forcing update
                    if (
                        forceProgressUpdate ||
                        (!isHovering && !isTransitioning)
                    ) {
                        setProgress(latest)
                    }
                },
            })
        } else if (loopType === "repeat") {
            const animateForward = (currentValue = startFrom) => {
                animationControlsRef.current = animate(currentValue, 1, {
                    ...loopTransition,
                    onUpdate: (latest) => {
                        setLoopProgress(latest)
                        // Only set the main progress if not hovering and not transitioning
                        if (
                            forceProgressUpdate ||
                            (!isHovering && !isTransitioning)
                        ) {
                            setProgress(latest)
                        }
                    },
                    onComplete: () => {
                        if (loopEnabled && loopType === "repeat") {
                            animateForward(0) // Restart from 0 for next cycle
                        }
                    },
                })
            }
            animateForward()
        } else if (loopType === "mirror") {
            let direction = startFrom < 0.5 ? 1 : -1 // Determine direction based on start position
            let currentValue = startFrom

            const animateMirror = () => {
                const target = direction === 1 ? 1 : 0
                animationControlsRef.current = animate(currentValue, target, {
                    ...loopTransition,
                    onUpdate: (latest) => {
                        currentValue = latest
                        setLoopProgress(latest)
                        // Only set the main progress if not hovering and not transitioning, or if forcing update
                        if (
                            forceProgressUpdate ||
                            (!isHovering && !isTransitioning)
                        ) {
                            setProgress(latest)
                        }
                    },
                    onComplete: () => {
                        if (loopEnabled && loopType === "mirror") {
                            direction *= -1 // Reverse direction
                            animateMirror() // Continue mirror animation
                        }
                    },
                })
            }
            animateMirror()
        }
    }

    // Loop animation with Framer Motion animate function
    useEffect(() => {
        // Only auto-start loop if we're not hovering (prevents flash when mouse leaves)
        if (!isHovering) {
            startLoop(0, false)
        }

        return () => {
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
                animationControlsRef.current = null
            }
        }
    }, [loopEnabled, loopType, loopTransition, isTransitioning, isLoading]) // Removed isHovering from dependencies

    // Handle hover state changes for loop animation control
    useEffect(() => {
        if (
            !loopEnabled ||
            RenderTarget.current() === RenderTarget.canvas ||
            isLoading
        )
            return

        if (isHovering && hoverEnabled && !isMobile) {
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
            }
        }
    }, [isHovering, hoverEnabled, loopEnabled, isMobile, isLoading])

    // Handle mouse movement to control the scanning effect
    const handleMouseMove = (e: React.MouseEvent) => {
        if (
            !containerRef.current ||
            !hoverEnabled ||
            isMobile ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return

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
        if (
            !hoverEnabled ||
            isMobile ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return
        setIsHovering(true)

        // If loop is active, start transition from current progress to hover
        if (loopEnabled) {
            setIsTransitioning(true)
            setTransitionStartProgress(progress)
            setTransitionStartTime(Date.now())
            // Pause the loop animation
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
            }
        }
    }

    // Handle mouse leaving the container
    const handleMouseLeave = async () => {
        if (
            !hoverEnabled ||
            isMobile ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return

        // Capture the current progress before changing state
        const currentProgress = progress
        console.log("Mouse leave - current progress:", currentProgress)

        setIsHovering(false)
        setIsTransitioning(false)

        if (loopEnabled) {
            // Start the loop immediately from the current progress position
            startLoop(currentProgress, true)
        }
    }

    // Debug logs removed for performance

    return (
        <div style={{ height: "100%", width: "100%" }}>
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
            </div>
        </div>
    )
}

/**
 *
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 300
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */

export default function Home(props: {
    textureMap?: any
    depthMap?: any
    dotColor?: string
    effectType?: "dots" | "gradient"
    intensity?: number
    showTexture?: boolean // deprecated: kept for backwards compatibility
    backgroundMode?: boolean
    backgroundColor?: string
    gradient?: {
        width?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    dots?: {
        size?: number
        tiling?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    loop?: {
        enabled?: boolean
        type?: "oneShot" | "repeat" | "mirror"
        transition?: any // Full Framer Motion transition object
    }
    hover?: {
        enabled?: boolean
        direction?:
            | "topToBottom"
            | "bottomToTop"
            | "leftToRight"
            | "rightToLeft"
            | "centerOutward"
            | "outwardToCenter"
    }
}) {
    // Check if both images are missing
    const hasTextureMap =
        props.textureMap &&
        (props.textureMap.src || typeof props.textureMap === "string")
    const hasDepthMap =
        props.depthMap &&
        (props.depthMap.src || typeof props.depthMap === "string")

    // Show ComponentMessage if both images are missing
    if (!hasTextureMap && !hasDepthMap) {
        return (
            <ComponentMessage
                title="3D Scan Effect"
                description="Add an Image and Depth map to create stunning 3D scanning effects"
            />
        )
    }

    return (
        <ContextProvider>
            <Html
                textureMap={props.textureMap}
                depthMap={props.depthMap}
                dotColor={props.dotColor}
                effectType={props.effectType}
                intensity={props.intensity}
                showTexture={props.showTexture}
                backgroundMode={props.backgroundMode}
                backgroundColor={props.backgroundColor}
                gradient={props.gradient}
                dots={props.dots}
                loop={props.loop}
                hover={props.hover}
            ></Html>
        </ContextProvider>
    )
}

Home.displayName = "Image Scan"
