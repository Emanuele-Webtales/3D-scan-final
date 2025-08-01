import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

//Working version Lalala

interface PixelateSvgFilterProps {
    id: string
    size?: number
    crossLayers?: boolean
    debug?: boolean
}

function PixelateSvgFilter({
    id = "pixelate-filter",
    size = 16,
    crossLayers = false,
}: PixelateSvgFilterProps) {
    return (
        <svg style={{ userSelect: "none" }}>
            <defs>
                <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
                    {"First layer: Normal pixelation effect"}
                    <feConvolveMatrix
                        kernelMatrix="1 1 1
                                      1 1 1
                                      1 1 1"
                        result="AVG"
                    />
                    <feFlood x="1" y="1" width="1" height="1" />
                    <feComposite
                        operator="arithmetic"
                        k1="0"
                        k2="1"
                        k3="0"
                        k4="0"
                        width={size}
                        height={size}
                    />
                    <feTile result="TILE" />
                    <feComposite
                        in="AVG"
                        in2="TILE"
                        operator="in"
                        k1="0"
                        k2="1"
                        k3="0"
                        k4="0"
                    />
                    <feMorphology
                        operator="dilate"
                        radius={size / 2}
                        result={"NORMAL"}
                    />
                    <feOffset dx="0" dy="0" />
                    <feMerge>
                        <feMergeNode in="NORMAL" />
                    </feMerge>
                    {crossLayers && (
                        <>
                            {"Second layer: Fallback with full-width tiling"}
                            <feConvolveMatrix
                                kernelMatrix="1 1 1
                                            1 1 1
                                            1 1 1"
                                result="AVG"
                            />
                            <feFlood x="1" y="1" width="1" height="1" />
                            <feComposite
                                in2="SourceGraphic"
                                operator="arithmetic"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                                width={size / 2}
                                height={size}
                            />
                            <feTile result="TILE" />
                            <feComposite
                                in="AVG"
                                in2="TILE"
                                operator="in"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                            />
                            <feMorphology
                                operator="dilate"
                                radius={size / 2}
                                result={"FALLBACKX"}
                            />
                            {"Third layer: Fallback with full-height tiling"}
                            <feConvolveMatrix
                                kernelMatrix="1 1 1
                                            1 1 1
                                            1 1 1"
                                result="AVG"
                            />
                            <feFlood x="1" y="1" width="1" height="1" />
                            <feComposite
                                in2="SourceGraphic"
                                operator="arithmetic"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                                width={size}
                                height={size / 2}
                            />
                            <feTile result="TILE" />
                            <feComposite
                                in="AVG"
                                in2="TILE"
                                operator="in"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                            />
                            <feMorphology
                                operator="dilate"
                                radius={size / 2}
                                result={"FALLBACKY"}
                            />
                            <feMerge>
                                <feMergeNode in="FALLBACKX" />
                                <feMergeNode in="FALLBACKY" />
                                <feMergeNode in="NORMAL" />
                            </feMerge>
                        </>
                    )}
                    {!crossLayers && <feMergeNode in="NORMAL" />}
                </filter>
            </defs>
        </svg>
    )
}

// Mobile detection hook
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            // Check for touch capability and screen size
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
            const isSmallScreen = window.innerWidth <= 810
            setIsMobile(hasTouch || isSmallScreen)
        }

        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)
        
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    return isMobile
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 300
 */
export default function PixelateComponent(props: any) {
    const {
        image,
        video,
        useVideo,
        strength,
        pixelateMode,
        hoverArea,
        safeArea,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [isHovering, setIsHovering] = useState(false)

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const isMobile = useIsMobile()

    // Check if media is provided
    const hasMedia = useVideo
        ? video && (video.src || video)
        : image && (image.src || image)

    // Show ComponentMessage if no media is provided
    if (!hasMedia) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Pixelate Component"
                    subtitle={`Set up the component by adding ${useVideo ? "video" : "image"} to the component properties.`}
                />
            </div>
        )
    }

    // Calculate pixelation range based on strength
    const getPixelationRange = () => {
        const minPx = 1 // Minimum 1px to avoid SVG filter glitches
        const maxPx = Math.max(
            minPx + 1,
            Math.floor(1 + (strength / 100) * 127)
        )
        return { min: minPx, max: maxPx }
    }

    const { min: minPixelation, max: maxPixelation } = getPixelationRange()

    // Calculate initial pixelation based on mode
    const getInitialPixelation = () => {
        return pixelateMode === "depixelate" ? maxPixelation : minPixelation
    }

    // Motion values for smooth transitions
    const pixelationSize = useMotionValue(getInitialPixelation())
    const smoothedPixelation = useTransform(pixelationSize, (value) =>
        Math.max(minPixelation, Math.min(maxPixelation, value))
    )

    // Calculate distance from center and update pixelation
    const updatePixelation = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            // Calculate distance from center using global coordinates
            const distanceX = clientX - centerX
            const distanceY = clientY - centerY
            const distance = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY
            )

            // Calculate the expanded radius based on hover area percentage
            // Use diagonal distance to ensure corners are covered at 100%
            const diagonalDistance = Math.sqrt(
                rect.width * rect.width + rect.height * rect.height
            )
            const expandedRadius = (diagonalDistance / 2) * (hoverArea / 100)

            // Calculate safe area radius (inner zone with constant effect)
            const safeAreaRadius = (diagonalDistance / 2) * (safeArea / 100)

            // Calculate distance from safe area edge, not center
            const effectiveDistance = Math.max(0, distance - safeAreaRadius)
            const effectiveRadius = Math.max(1, expandedRadius - safeAreaRadius)

            // Normalize distance relative to the effective radius
            const normalizedDistance = Math.min(
                1,
                effectiveDistance / effectiveRadius
            )

            // Reverse the effect based on pixelate mode
            const finalDistance =
                pixelateMode === "depixelate"
                    ? normalizedDistance
                    : 1 - normalizedDistance

            const newPixelation =
                minPixelation + (maxPixelation - minPixelation) * finalDistance

            pixelationSize.set(newPixelation)

            // Set mouse position relative to component for debug display
            const mouseX = clientX - rect.left
            const mouseY = clientY - rect.top
            setMousePosition({ x: mouseX, y: mouseY })
        },
        [strength, pixelationSize, pixelateMode, hoverArea]
    )

    // Handle mouse events with expanded hover area
    const handleMouseMove = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (isCanvas || isMobile) return
            updatePixelation(event.clientX, event.clientY)
        },
        [isCanvas, isMobile, updatePixelation]
    )

    const handleMouseEnter = useCallback(() => {
        if (isCanvas || isMobile) return
        setIsHovering(true)
    }, [isCanvas, isMobile])

    const handleMouseLeave = useCallback(() => {
        if (isCanvas || isMobile) return
        setIsHovering(false)
        pixelationSize.set(getInitialPixelation())
    }, [isCanvas, isMobile, getInitialPixelation, pixelationSize])

    // Global mouse tracking for expanded hover area
    useEffect(() => {
        if (isCanvas || isMobile || !containerRef.current) return

        const handleGlobalMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            // Calculate the expanded radius based on hover area percentage
            // Use diagonal distance to ensure corners are covered at 100%
            const diagonalDistance = Math.sqrt(
                rect.width * rect.width + rect.height * rect.height
            )
            const expandedRadius = (diagonalDistance / 2) * (hoverArea / 100)

            // Calculate distance from component center
            const distanceX = event.clientX - centerX
            const distanceY = event.clientY - centerY
            const distance = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY
            )

            // Check if mouse is within the expanded hover area
            const isWithinHoverArea = distance <= expandedRadius

            if (isWithinHoverArea && !isHovering) {
                setIsHovering(true)
            } else if (!isWithinHoverArea && isHovering) {
                setIsHovering(false)
                pixelationSize.set(getInitialPixelation())
            }

            // Update pixelation if hovering
            if (isWithinHoverArea) {
                updatePixelation(event.clientX, event.clientY)
            }
        }

        window.addEventListener("mousemove", handleGlobalMouseMove)

        return () => {
            window.removeEventListener("mousemove", handleGlobalMouseMove)
        }
    }, [
        isCanvas,
        isMobile,
        hoverArea,
        isHovering,
        updatePixelation,
        pixelationSize,
        getInitialPixelation,
    ])

    // Measure container size
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setContainerSize({ width: rect.width, height: rect.height })
            }
        }

        updateSize()
        window.addEventListener("resize", updateSize)

        return () => window.removeEventListener("resize", updateSize)
    }, [])

    return (
        <motion.div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                userSelect: "none",
                userDrag: "none",
                //border: "1px solid red",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* SVG Filter - only render on non-mobile when pixelation > 1 */}
            {!isMobile && smoothedPixelation.get() > 1 && (
                <PixelateSvgFilter
                    id="pixelate-filter"
                    size={smoothedPixelation.get()}
                    crossLayers={false}
                />
            )}

            {/* Base unfiltered media */}
            {useVideo ? (
                <motion.video
                    src={video?.src || video}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                        position: "absolute",
                        inset: -(props.strength / 100) * 50,
                        width: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        height: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        objectFit: "cover",
                        backgroundPosition: "center center",
                        zIndex: 1,
                        
                        userSelect: "none",
                    }}
                />
            ) : (
                <motion.img
                    src={image?.src || image}
                    alt={image?.alt || "Base image"}
                    style={{
                        position: "absolute",
                        inset: -(props.strength / 100) * 50,
                        width: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        height: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        objectFit: "cover",
                        backgroundPosition: "center center",
                        zIndex: 1,
                       
                        userSelect: "none",
                    }}
                />
            )}

            {/* Filtered media with opacity transition - only on non-mobile */}
            {!isMobile && useVideo ? (
                <motion.video
                    src={video?.src || video}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                        position: "absolute",
                        inset: -(props.strength / 100) * 50,
                        width: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        height: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        objectFit: "cover",
                        backgroundPosition: "center center",
                        filter: "url(#pixelate-filter)",
                        zIndex: 2,
                        userSelect: "none",
                        opacity:
                            isCanvas || smoothedPixelation.get() <= 1
                                ? 0
                                : Math.min(
                                      1,
                                      Math.max(
                                          0,
                                          (smoothedPixelation.get() - 1) / 8
                                      )
                                  ),
                        transition: "opacity 0.1s ease-out",
                    }}
                />
            ) : !isMobile ? (
                <motion.img
                    src={image?.src || image}
                    alt={image?.alt || "Pixelated image"}
                    style={{
                        position: "absolute",
                        inset: -(props.strength / 100) * 50,
                        width: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        height: `calc(100% + ${(props.strength / 100) * 100}px)`,
                        objectFit: "cover",
                        backgroundPosition: "center center",
                        filter: "url(#pixelate-filter)",
                        zIndex: 2,
                        userSelect: "none",
                        opacity:
                            isCanvas || smoothedPixelation.get() <= 1
                                ? 0
                                : Math.min(
                                      1,
                                      Math.max(
                                          0,
                                          (smoothedPixelation.get() - 1) / 8
                                      )
                                  ),
                        transition: "opacity 0.1s ease-out",
                    }}
                />
            ) : null}
        </motion.div>
    )
}

// Default props
PixelateComponent.defaultProps = {
    useVideo: false,
    strength: 50,
    pixelateMode: "pixelate",
    hoverArea: 100,
    safeArea: 10,
    image: null,
    video: null,
}

// Property controls
addPropertyControls(PixelateComponent, {
    useVideo: {
        type: ControlType.Boolean,
        title: "Use Video",
        defaultValue: false,
        enabledTitle: "Video",
        disabledTitle: "Image",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        hidden: (props) => props.useVideo,
    },
    video: {
        type: ControlType.File,
        title: "Video",
        allowedFileTypes: ["video/*"],
        hidden: (props) => !props.useVideo,
    },
    strength: {
        type: ControlType.Number,
        title: "Strength",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 50,
        unit: "%",
    },
    pixelateMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["pixelate", "depixelate"],
        optionTitles: ["Pixelate", "Depixelate"],
        defaultValue: "pixelate",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    hoverArea: {
        type: ControlType.Number,
        title: "Hover Area",
        min: 50,
        max: 300,
        step: 5,
        defaultValue: 100,
        unit: "%",
    },
    safeArea: {
        type: ControlType.Number,
        title: "Safe Area",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 10,
        unit: "%",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

PixelateComponent.displayName = "Pixelate-Depixelate_Dev"
