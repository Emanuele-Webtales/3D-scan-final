import React, { useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ElectricBorderProps {
    borderColor?: string
    preview?: boolean
    showGlow?: boolean
    speed?:number
    glowIntensity?: number
    borderRadius?: number
    borderThickness?: number
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ElectricBorder(props: ElectricBorderProps) {
    const {
        borderColor = "#dd8448",
        preview = false,
        showGlow = true,
        glowIntensity = 0.6,
        borderRadius = 24,
        borderThickness = 2,
        speed = 6
    } = props

    // Ensure unique filter id per instance to avoid DOM collisions and slow starts
    const filterId = useMemo(
        () => `turbulent-displace-${Math.random().toString(36).slice(2)}`,
        []
    )

    const shouldAnimate =
        RenderTarget.current() === RenderTarget.preview ||
        (preview && RenderTarget.current() === RenderTarget.canvas)



    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
            }}
        >
            <svg
                style={{
                    position: "absolute",
                    overflow: "hidden",
                    width: 0,
                    height: 0,
                }}
                aria-hidden
            >
                <defs>
                    <filter
                        id={filterId}
                        colorInterpolationFilters="sRGB"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                    >
                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.015"
                            numOctaves="8"
                            result="noise1"
                            seed="1"
                        />
                        <feOffset
                            in="noise1"
                            dx="0"
                            dy="0"
                            result="offsetNoise1"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dy"
                                    values="700; 0"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.02"
                            numOctaves="10"
                            result="noise2"
                            seed="1"
                        />
                        <feOffset
                            in="noise2"
                            dx="0"
                            dy="0"
                            result="offsetNoise2"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dy"
                                    values="0; -700"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.02"
                            numOctaves="10"
                            result="noise1"
                            seed="2"
                        />
                        <feOffset
                            in="noise1"
                            dx="0"
                            dy="0"
                            result="offsetNoise3"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dx"
                                    values="490; 0"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.02"
                            numOctaves="10"
                            result="noise2"
                            seed="2"
                        />
                        <feOffset
                            in="noise2"
                            dx="0"
                            dy="0"
                            result="offsetNoise4"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dx"
                                    values="0; -490"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feComposite
                            in="offsetNoise1"
                            in2="offsetNoise2"
                            result="part1"
                        />
                        <feComposite
                            in="offsetNoise3"
                            in2="offsetNoise4"
                            result="part2"
                        />
                        <feBlend
                            in="part1"
                            in2="part2"
                            mode="color-dodge"
                            result="combinedNoise"
                        />

                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="combinedNoise"
                            scale="20"
                            xChannelSelector="R"
                            yChannelSelector="B"
                        />
                    </filter>

                    {/* Fallback filter for better consistency */}
                    <filter
                        id="turbulent-displace-fallback"
                        colorInterpolationFilters="sRGB"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                    >
                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.02"
                            numOctaves="6"
                            result="noise"
                            seed="3"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="15"
                            xChannelSelector="R"
                            yChannelSelector="B"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                style={{
                    borderRadius: `${borderRadius}px`,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    overflow: "visible",
                    margin: "0",
                    padding: "0",
                }}
            >
                {/* Electric border layer with filter applied */}
                {/* Pre-warm the filter on a tiny element to compile before main usage */}
                <div
                    style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        opacity: 0,
                        filter: `url(#${filterId})`,
                        pointerEvents: "none",
                    }}
                />
                <svg
                    style={{
                        position: "absolute",
                        top: `calc(-${borderThickness / 2}px - 4px)`,
                        left: `calc(-${borderThickness / 2}px - 4px)`,
                        right: `calc(-${borderThickness / 2}px + 2px)`,
                        bottom: `calc(-${borderThickness / 2}px + 2px)`,
                        pointerEvents: "none",
                        zIndex: 10,
                        margin: "0",
                        padding: "0",
                        willChange: "filter",
                        contain: "paint",
                        backfaceVisibility: "hidden",
                        transform: "translateZ(0)",
                    }}
                    width="100%"
                    height="100%"
                >
                    <rect
                        x={0}
                        y={0}
                        width="100%"
                        height="100%"
                        rx={borderRadius}
                        ry={borderRadius}
                        fill="none"
                        stroke={borderColor}
                        strokeWidth={borderThickness}
                        filter={`url(#${filterId})`}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                {/* Glow layers - only shown when showGlow is true */}
                {showGlow && (
                    <>
                        {/* Glow layer 1 - subtle blur */}
                        <div
                            style={{
                                border: `${borderThickness}px solid ${borderColor}${Math.floor(
                                    glowIntensity * 255
                                )
                                    .toString(16)
                                    .padStart(2, "0")}`,
                                borderRadius: `${borderRadius}px`,
                                width: "100%",
                                height: "100%",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                filter: "blur(1px)",
                                pointerEvents: "none",
                                zIndex: 8,
                                margin: "0",
                                padding: "0",
                            }}
                        />

                        {/* Glow layer 2 - medium blur */}
                        <div
                            style={{
                                border: `${borderThickness}px solid ${borderColor}${Math.floor(
                                    glowIntensity * 255
                                )
                                    .toString(16)
                                    .padStart(2, "0")}`,
                                borderRadius: `${borderRadius}px`,
                                width: "100%",
                                height: "100%",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                filter: "blur(4px)",
                                pointerEvents: "none",
                                zIndex: 7,
                            }}
                        />

                        {/* Overlay effect 1 - using border color */}
                        <div
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: `${borderRadius}px`,
                                opacity: glowIntensity,
                                mixBlendMode: "overlay",
                                transform: "scale(1.1)",
                                filter: "blur(16px)",
                                background: `linear-gradient(-30deg, ${borderColor}, transparent 30%, transparent 70%, ${borderColor})`,
                                pointerEvents: "none",
                                zIndex: 6,
                            }}
                        />

                        {/* Overlay effect 2 - using border color */}
                        <div
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: `${borderRadius}px`,
                                opacity: glowIntensity * 0.5,
                                mixBlendMode: "overlay",
                                transform: "scale(1.1)",
                                filter: "blur(16px)",
                                background: `linear-gradient(-30deg, ${borderColor}, transparent 30%, transparent 70%, ${borderColor})`,
                                pointerEvents: "none",
                                zIndex: 5,
                            }}
                        />

                        {/* Background glow - using border color */}
                        <div
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: `${borderRadius}px`,
                                filter: "blur(32px)",
                                transform: "scale(1.1)",
                                opacity: glowIntensity * 0.3,
                                zIndex: 1,
                                background: `linear-gradient(-30deg, ${borderColor}, transparent, ${borderColor})`,
                                pointerEvents: "none",
                            }}
                        />
                    </>
                )}

                {/* Border effect container - transparent so it can overlay any content */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "12px",
                        boxSizing: "border-box",
                        position: "relative",
                        zIndex: 15,
                        pointerEvents: "none",
                    }}
                />

                {/* Simple glow effect */}
                {/* <div
                    style={{
                        position: "absolute",
                        top: "-4px",
                        left: "-4px",
                        right: "-4px",
                        bottom: "-4px",
                        border: `2px solid ${borderColor}`,
                        borderRadius: "12px",
                        filter: "blur(8px)",
                        opacity: 0.3,
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                /> */}
            </div>
        </div>
    )
}

// Property Controls
addPropertyControls(ElectricBorder, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
    },
    showGlow: {
        type: ControlType.Boolean,
        title: "Glow",
        defaultValue: true,
    },
    glowIntensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.6,

        hidden: (props) => !props.showGlow,
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 24,
        unit:"px"
    },
    speed:{
        type:ControlType.Number,
        title:"Speed",
        min:0,
        max:10,
        step:0.1,
        defaultValue:1,
    },
    borderThickness: {
        type: ControlType.Number,
        title: "Border",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2,
        unit: "px",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#dd8448",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ElectricBorder.displayName = "Electric Border"
