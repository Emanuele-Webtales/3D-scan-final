import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
// import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

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
        <svg>
            <defs>
                <filter id={id} x="0" y="0" width="1" height="1">
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

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 300
 */
export default function PixelateComponent(props:any) {
    const {
        image,
        strength,
        pixelateMode,
        hoverArea,
        safeArea,
        removeFilterAtMin,
        debug,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [isHovering, setIsHovering] = useState(false)

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

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
        (clientX:number, clientY:number) => {
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
        (event:React.MouseEvent<HTMLDivElement>) => {
            if (isCanvas) return
            updatePixelation(event.clientX, event.clientY)
        },
        [isCanvas, updatePixelation]
    )

    const handleMouseEnter = useCallback(() => {
        if (isCanvas) return
        setIsHovering(true)
    }, [isCanvas])

    const handleMouseLeave = useCallback(() => {
        if (isCanvas) return
        setIsHovering(false)
        pixelationSize.set(getInitialPixelation())
    }, [isCanvas, getInitialPixelation, pixelationSize])

    // Global mouse tracking for expanded hover area
    useEffect(() => {
        if (isCanvas || !containerRef.current) return

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
                cursor: "crosshair",
                //border: "1px solid red",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* SVG Filter - conditional rendering based on user preference */}
            {(!removeFilterAtMin || smoothedPixelation.get() > 1) && (
                <PixelateSvgFilter
                    id="pixelate-filter"
                    size={smoothedPixelation.get()}
                    crossLayers={false}
                />
            )}

            {/* Image with conditional filter */}
            <motion.img
                src={image?.src || image}
                alt={image?.alt || "Pixelated image"}
                style={{
                    position: "absolute",
                    inset: -(props.strength / 100) * 64,
                    width: `calc(100% + ${(props.strength / 100) * 128}px)`,
                    height: `calc(100% + ${(props.strength / 100) * 128}px)`,
                    objectFit: "cover",
                    backgroundPosition: "center center",
                    filter:
                        isCanvas ||
                        (removeFilterAtMin && smoothedPixelation.get() <= 1)
                            ? "none"
                            : "url(#pixelate-filter)",
                    transition: "filter 0.1s ease-out",
                }}
            />

            {/* Debug overlay (only when hovering) */}
            {isHovering && debug && (
                <div
                    style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        background: "rgba(0,0,0,0.8)",
                        color: "white",
                        padding: "8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                    }}
                >
                    <div>
                        Mouse: ({Math.round(mousePosition.x)},{" "}
                        {Math.round(mousePosition.y)})
                    </div>
                    <div>
                        Pixelation: {Math.round(smoothedPixelation.get())}px
                    </div>
                    <div>
                        Distance:{" "}
                        {Math.round(
                            ((smoothedPixelation.get() - minPixelation) /
                                (maxPixelation - minPixelation)) *
                                100
                        )}
                        %
                    </div>
                    <div>
                        Hover Radius:{" "}
                        {Math.round(
                            (Math.max(
                                containerSize.width,
                                containerSize.height
                            ) /
                                2) *
                                (hoverArea / 100)
                        )}
                        px
                    </div>
                    <div>Hover Area: {hoverArea}%</div>
                </div>
            )}
        </motion.div>
    )
}

// Default props
PixelateComponent.defaultProps = {
    strength: 50,
    pixelateMode: "pixelate",
    hoverArea: 100,
    safeArea: 10,
    removeFilterAtMin: true,
    image: {
        src: "https://picsum.photos/400/300",
        alt: "Sample image",
    },
}

// Property controls
addPropertyControls(PixelateComponent, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
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
    },
    removeFilterAtMin: {
        type: ControlType.Boolean,
        title: "Remove Filter at Min",
        defaultValue: true,
        description:
            "When enabled, removes SVG filter at minimum pixelation for clean image. When disabled, keeps filter with lowest settings.",
    },
    debug: {
        type: ControlType.Boolean,
        title: "Debug panel",
        defaultValue: true,
    },
})

PixelateComponent.displayName = "Pixelate Component"
