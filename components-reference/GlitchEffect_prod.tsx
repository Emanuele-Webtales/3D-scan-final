import React from "react"
import { ControlType, addPropertyControls, RenderTarget } from "framer"
// import { ComponentMessage } from "../../utils/ComponentMessage";
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// import { useGlitch } from "react-powerglitch";
import { useGlitch } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/glitch-effect.js"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

enum PlayModes {
    Always = "always",
    Hover = "hover",
    Click = "click",
}

enum Easing {
    EaseInOut = "ease-in-out",
    EaseIn = "ease-in",
    EaseOut = "ease-out",
    Linear = "linear",
}

interface TimingProps {
    infinite: boolean
    duration: number
    smoothing: boolean
    easing: Easing
    iterations: number
}

interface TimeSpanProps {
    restrict: boolean
    start: number
    end: number
}

interface ShakeProps {
    enabled: boolean
    velocity: number
    amplitudeX: number
    amplitudeY: number
}

interface SliceProps {
    enabled: boolean
    count: number
    velocity: number
    minHeight: number
    maxHeight: number
    hueRotate: boolean
}

interface GlitchEffectProps {
    content: React.ReactNode[]
    contentWidth: "default" | "fill"
    // ---------------------- //
    playMode: PlayModes
    overflow: "hidden" | "visible"
    timing: TimingProps
    timeSpan: TimeSpanProps
    shake: ShakeProps
    slice: SliceProps
    // ---------------------- //
    canvasPreview: boolean
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //
addPropertyControls(GlitchEffect, {
    content: {
        type: ControlType.ComponentInstance,
    },
    contentWidth: {
        type: ControlType.Enum,
        title: "Width",
        options: ["default", "fill"],
        optionTitles: ["Default", "Fill"],
        defaultValue: "default",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },

    // ---------------------- //
    playMode: {
        type: ControlType.Enum,
        title: "Play Mode",
        options: [PlayModes.Always, PlayModes.Hover, PlayModes.Click],
        optionTitles: ["Always", "Hover", "Click"],
        defaultValue: PlayModes.Always,
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    overflow: {
        type: ControlType.Enum,
        title: "Overflow",
        options: ["hidden", "visible"],
        optionTitles: ["Hidden", "Visible"],
        defaultValue: "visible",
        displaySegmentedControl: true,
        // segmentedControlDirection: "vertical",
    },
    timing: {
        type: ControlType.Object,
        title: "Timing",
        controls: {
            duration: {
                type: ControlType.Number,
                title: "Duration",
                defaultValue: 2,
                min: 0,
                max: 10,
                step: 0.1,
                unit: "s",
            },
            infinite: {
                type: ControlType.Boolean,
                title: "Infinite",
                defaultValue: true,
            },
            repeat: {
                type: ControlType.Number,
                title: "Repeat",
                defaultValue: 1,
                min: 0,
                max: 60,
                step: 1,
                unit: "x",
                hidden: (props) => props.infinite,
            },
            smoothing: {
                type: ControlType.Boolean,
                title: "Smoothing",
                defaultValue: false,
            },
            easing: {
                type: ControlType.Enum,
                title: "Easing",
                options: [
                    Easing.EaseInOut,
                    Easing.EaseIn,
                    Easing.EaseOut,
                    Easing.Linear,
                ],
                optionTitles: ["Ease In Out", "Ease In", "Ease Out", "Linear"],
                defaultValue: Easing.EaseInOut,
                hidden: (props) => !props.smoothing,
            },
        },
    },
    timeSpan: {
        type: ControlType.Object,
        title: "Time Span",
        controls: {
            restrict: {
                type: ControlType.Boolean,
                title: "Restrict",
                defaultValue: true,
            },
            start: {
                type: ControlType.Number,
                title: "Start",
                defaultValue: 50,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.restrict,
            },
            end: {
                type: ControlType.Number,
                title: "End",
                defaultValue: 70,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.restrict,
            },
        },
    },
    shake: {
        type: ControlType.Object,
        title: "Shake",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: true,
            },
            velocity: {
                type: ControlType.Number,
                title: "Velocity",
                defaultValue: 15,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.enabled,
            },
            amplitudeX: {
                type: ControlType.Number,
                title: "X Amplitude",
                defaultValue: 20,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.enabled,
            },
            amplitudeY: {
                type: ControlType.Number,
                title: "Y Amplitude",
                defaultValue: 20,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.enabled,
            },
        },
    },
    slice: {
        type: ControlType.Object,
        title: "Slice",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: true,
            },
            count: {
                type: ControlType.Number,
                title: "Count",
                defaultValue: 6,
                min: 0,
                max: 50,
                step: 1,
                hidden: (props) => !props.enabled,
            },
            velocity: {
                type: ControlType.Number,
                title: "Velocity",
                defaultValue: 15,
                min: 0,
                max: 50,
                unit: "steps/s",
                hidden: (props) => !props.enabled,
            },
            minHeight: {
                type: ControlType.Number,
                title: "Min Height",
                defaultValue: 2,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.enabled,
            },
            maxHeight: {
                type: ControlType.Number,
                title: "Max Height",
                defaultValue: 15,
                min: 0,
                max: 100,
                unit: "%",
                hidden: (props) => !props.enabled,
            },
            hueRotate: {
                type: ControlType.Boolean,
                title: "Hue Rotate",
                defaultValue: true,
                hidden: (props) => !props.enabled,
            },
        },
    },
    canvasPreview: {
        type: ControlType.Boolean,
        defaultValue: true,
        title: "Preview",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// ------------------------------------------------------------ //
// DEFAULT PROPS
// ------------------------------------------------------------ //
GlitchEffect.defaultProps = {
    contentWidth: "default",
    playMode: PlayModes.Always,
    overflow: "visible",
    timing: {
        duration: 2,
        infinite: true,
        iterations: 1,
        smoothing: false,
        easing: Easing.EaseInOut,
    },
    timeSpan: {
        restrict: true,
        start: 50,
        end: 70,
    },
    shake: {
        enabled: true,
        velocity: 15,
        amplitudeX: 20,
        amplitudeY: 20,
    },
    slice: {
        enabled: true,
        count: 6,
        velocity: 15,
        minHeight: 2,
        maxHeight: 15,
        hueRotate: true,
    },
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function GlitchEffect(props: GlitchEffectProps) {
    const haveContent = props.content !== undefined && props.content.length > 0
    const isOnFramerCanvas = RenderTarget.hasRestrictions()
    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const hideOverflow = props.overflow === "hidden"

    const glitchOptions = React.useMemo(
        () => ({
            playMode: isOnFramerCanvas ? PlayModes.Always : props.playMode,
            hideOverflow: hideOverflow,
            timing: {
                duration: props.timing.duration * 1000,
                easing: props.timing.smoothing
                    ? props.timing.easing
                    : undefined,
                iterations: props.timing.infinite
                    ? Infinity
                    : props.timing.iterations,
            },
            glitchTimeSpan: props.timeSpan.restrict
                ? {
                      start: props.timeSpan.start / 100,
                      end: props.timeSpan.end / 100,
                  }
                : false,
            shake: props.shake.enabled
                ? {
                      velocity: props.shake.velocity,
                      amplitudeX: props.shake.amplitudeX / 100,
                      amplitudeY: props.shake.amplitudeY / 100,
                  }
                : false,
            slice: props.slice.enabled
                ? {
                      count: props.slice.count,
                      velocity: props.slice.velocity,
                      minHeight: props.slice.minHeight / 100,
                      maxHeight: props.slice.maxHeight / 100,
                      hueRotate: props.slice.hueRotate,
                  }
                : undefined,
            pulse: undefined,
        }),
        [props, hideOverflow]
    )

    // @ts-expect-error booleans & undefineds
    const glitch = useGlitch(glitchOptions)

    React.useEffect(() => {
        // @ts-expect-error booleans & undefineds
        glitch.setOptions(glitchOptions)
    }, [glitchOptions])

    React.useEffect(() => {
        if (wrapperRef.current && props.contentWidth === "fill") {
            // make the parent display flex
            wrapperRef.current.parentElement!.style.display = "flex"
            wrapperRef.current.parentElement!.style.justifyContent = "center"
            wrapperRef.current.parentElement!.style.alignItems = "center"
        }
    }, [wrapperRef, props.contentWidth])

    const mainStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    }

    if (!haveContent) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Glitch Effect"
                    subtitle="Set up the component by connecting content to the component or selecting the content from the component properties."
                />
            </div>
        )
    }

    if (isOnFramerCanvas && !props.canvasPreview) {
        return (
            <div
                style={{
                    ...mainStyle,
                    width:
                        props.contentWidth === "default"
                            ? "fit-content"
                            : "100%",
                    marginLeft: "auto",
                    marginRight: "auto",
                }}
            >
                {renderChildren({
                    content: props.content,
                    contentWidth: props.contentWidth,
                })}
            </div>
        )
    }

    return (
        <div
            ref={wrapperRef}
            id="glitch-effect-wrapper"
            style={
                props.contentWidth === "fill" ? { width: "100%" } : mainStyle
            }
        >
            <div
                id="glitch-effect-content"
                ref={glitch.ref}
                style={{
                    ...mainStyle,
                    width:
                        props.contentWidth === "default"
                            ? "fit-content"
                            : "100%",
                }}
            >
                {renderChildren({
                    content: props.content,
                    contentWidth: props.contentWidth,
                })}
            </div>
        </div>
    )
}

function renderChildren({
    content,
    contentWidth,
}: {
    content: React.ReactNode[]
    contentWidth: "default" | "fill"
}) {
    return (
        <>
            {React.Children.map(content, (child) => {
                return React.cloneElement(child as React.ReactElement, {
                    // @ts-expect-error this is Framer layer
                    style: {
                        // @ts-expect-error this is Framer layer
                        ...(child as React.ReactElement).props.style,
                        width:
                            contentWidth === "fill"
                                ? "100%"
                                : // @ts-expect-error this is Framer layer
                                  (child as React.ReactElement).props.width,
                    },
                })
            })}
        </>
    )
}

GlitchEffect.displayName = "Glitch Effect"
