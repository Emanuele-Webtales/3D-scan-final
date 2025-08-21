import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ElectricBorderProps {
    borderColor?: string
    preview?: boolean
    showGlow?: boolean
    glowIntensity?: number
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 500
 * @framerDisableUnlink
 */
export default function ElectricBorder(props: ElectricBorderProps) {
    const { borderColor = "#dd8448", preview = false, showGlow = true, glowIntensity = 0.6 } = props

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
                    overflow: "visible",
                    width: "100%",
                    height: "100%",
                   
                }}
            >
                <defs>
                    <filter
                        id="turbulent-displace"
                        colorInterpolationFilters="sRGB"
                        x="-10%"
                        y="-10%"
                        width="120%"
                        height="120%"
                    >
                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.02"
                            numOctaves="10"
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
                            scale="30"
                            xChannelSelector="R"
                            yChannelSelector="B"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                style={{
                    borderRadius: "24px",
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
                <div
                    style={{
                        position: "absolute",
                        top: "-4px",
                        left: "-4px",
                        right: "4px",
                        bottom: "4px",
                        border: `2px solid ${borderColor}`,
                        borderRadius: "24px",
                        filter: "url(#turbulent-displace)",
                        pointerEvents: "none",
                        zIndex: 10,
                        margin: "0",
                        padding: "0",
                    }}
                />

                {/* Glow layers - only shown when showGlow is true */}
                {showGlow && (
                    <>
                        {/* Glow layer 1 - subtle blur */}
                        <div
                            style={{
                                border: `2px solid ${borderColor}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
                                borderRadius: "24px",
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
                                border: `2px solid ${borderColor}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
                                borderRadius: "24px",
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
                                borderRadius: "24px",
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
                                borderRadius: "24px",
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
                                borderRadius: "24px",
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
        title: "Show Glow",
        defaultValue: true,
        description: "Enable or disable the glow effects around the border"
    },
    glowIntensity: {
        type: ControlType.Number,
        title: "Glow Intensity",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.6,
        description: "Controls the intensity of the glow effects",
        hidden: (props) => !props.showGlow
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: "#dd8448",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ElectricBorder.displayName = "Electric Border"
