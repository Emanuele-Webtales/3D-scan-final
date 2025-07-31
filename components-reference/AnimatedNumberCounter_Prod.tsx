import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useState, useRef } from "react"
import {
    motion,
    useMotionValue,
    animate,
    useTransform,
    useInView,
} from "framer-motion"
import React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 *
 * @framerDisableUnlink
 */
export default function AnimatedNumberCounter(props:any) {
    const { mode, start, end, value, decimals, commas, color, animation } =
        props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const Tag = props.tag
    const MotionTag = motion[props.tag]
    const isDefault = mode == "default"
    const initialValue = isDefault ? start : value
    const transition = isDefault ? animation.transition : props.transition

    const formatNumber = (number) => {
        let numberString = number.toFixed(decimals)
        if (commas) {
            numberString = numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        }
        return numberString
    }

    const [number, setNumber] = useState(initialValue)
    const [finalValue, setFinalValue] = useState(number)
    const [currentAnimation, setCurrentAnimation] = useState(null)
    const ref = useRef(null)
    const isInView = useInView(ref, {
        once: !props.animation.replay,
        amount: "some",
    })
    const motionValue = useMotionValue(value)

    const runAnimation = (from, to) => {
        if (!isCanvas) {
            if (currentAnimation) {
                currentAnimation.stop()
            }

            setFinalValue(to)
            setCurrentAnimation(
                animate(from, to, {
                    ...transition,
                    onUpdate: (latest) => {
                        setNumber(latest)
                    },
                })
            )
        }
    }

    useEffect(() => {
        if (isDefault && animation.trigger == "appear") {
            runAnimation(start, end)
        }
    }, [])

    useEffect(() => {
        if (isDefault && animation.trigger == "layerInView") {
            if (isInView) {
                runAnimation(start, end)
            } else {
                if (currentAnimation) {
                    currentAnimation.stop()
                }
                setNumber(start)
            }
        }
    }, [isInView])

    useEffect(() => {
        if (!isDefault) {
            runAnimation(number, value)
        }
    }, [value])

    return (
        <>
            <Tag
                style={{
                    ...props.style,
                    margin: 0,
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                    textWrap: props.balance ? "balance" : undefined,
                    fontVariantNumeric: props.monospace
                        ? "tabular-nums"
                        : undefined,
                    textAlign: "center",
                    ...props.font,
                }}
            >
                {props.prefix}
                {formatNumber(isCanvas ? initialValue : finalValue)}
                {props.suffix}
            </Tag>
            <MotionTag
                ref={ref}
                style={{
                    position: "absolute",
                    inset: 0,
                    userSelect: props.userSelect ? "auto" : "none",
                    fontVariantNumeric: props.monospace
                        ? "tabular-nums"
                        : undefined,
                    margin: 0,
                    ...(color.mode == "solid"
                        ? { color: color.color }
                        : {
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundImage: `linear-gradient(${color.angle}deg, ${color.startColor}, ${color.endColor})`,
                          }),
                    textDecoration: props.decoration,
                    textWrap: props.balance ? "balance" : undefined,
                    textAlign: "center",
                    ...props.font,
                    ...props.style,
                }}
            >
                {props.prefix}
                {formatNumber(isCanvas ? initialValue : number)}
                {props.suffix}
            </MotionTag>
        </>
    )
}

AnimatedNumberCounter.displayName = "Animated Number Counter"

addPropertyControls(AnimatedNumberCounter, {
    mode: {
        type: ControlType.Enum,
        options: ["default", "variants"],
        optionTitles: ["Default", "Variants"],
        displaySegmentedControl: true,
    },
    value: {
        type: ControlType.Number,
        defaultValue: 0,
        hidden: (props) => props.mode !== "variants",
    },
    start: {
        type: ControlType.Number,
        defaultValue: 0,
        hidden: (props) => props.mode !== "default",
    },
    end: {
        type: ControlType.Number,
        defaultValue: 100,
        hidden: (props) => props.mode !== "default",
    },
    animation: {
        type: ControlType.Object,
        icon: "effect",
        hidden: (props) => props.mode !== "default",
        controls: {
            trigger: {
                type: ControlType.Enum,
                defaultValue: "layerInView",
                options: ["appear", "layerInView"],
                optionTitles: ["Appear", "Layer in View"],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            replay: {
                type: ControlType.Boolean,
                defaultValue: true,
                hidden(props) {
                    return props.trigger !== "layerInView"
                },
            },
            transition: {
                type: ControlType.Transition,
                defaultValue: {
                    type: "spring",
                    duration: 1,
                    bounce: 0,
                },
            },
        },
    },
    transition: {
        type: ControlType.Transition,
        defaultValue: {
            type: "spring",
            duration: 1,
            bounce: 0,
        },
        hidden: (props) => props.mode !== "variants",
    },
    decimals: {
        type: ControlType.Enum,
        defaultValue: 0,
        options: [0, 1, 2, 3],
        optionTitles: ["Off", "1", "2", "3"],
        displaySegmentedControl: true,
    },
    commas: {
        type: ControlType.Boolean,
        defaultValue: true,
    },
    font: {
        type: "font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 16,
            lineHeight: 1,
        },
    },
    color: {
        type: ControlType.Object,
        controls: {
            mode: {
                type: ControlType.Enum,
                defaultValue: "solid",
                options: ["solid", "gradient"],
                optionTitles: ["Solid", "Gradient"],
                displaySegmentedControl: true,
            },
            color: {
                type: ControlType.Color,
                defaultValue: "#000",
                hidden: (props) => props.mode !== "solid",
            },
            startColor: {
                type: ControlType.Color,
                defaultValue: "#000",
                hidden: (props) => props.mode !== "gradient",
            },
            endColor: {
                type: ControlType.Color,
                defaultValue: "#FFF",
                hidden: (props) => props.mode !== "gradient",
            },
            angle: {
                type: ControlType.Number,
                defaultValue: 180,
                min: -360,
                max: 360,
                unit: "°",
                hidden: (props) => props.mode !== "gradient",
            },
        },
    },
    prefix: {
        type: ControlType.String,
        placeholder: "Prefix",
    },
    suffix: {
        type: ControlType.String,
        placeholder: "Suffix",
    },
    decoration: {
        type: ControlType.Enum,
        defaultValue: "none",
        options: ["none", "underline", "line-through"],
        optionTitles: ["None", "Underline", "Strikethrough"],
    },
    balance: {
        type: ControlType.Boolean,
        defaultValue: false,
    },
    userSelect: {
        type: ControlType.Boolean,
        defaultValue: true,
    },
    tag: {
        type: ControlType.Enum,
        defaultValue: "p",
        displaySegmentedControl: true,
        options: ["h1", "h2", "h3", "p"],
        optionTitles: ["H1", "H2", "H3", "P"],
    },
    monospace: {
        type: ControlType.Boolean,
        defaultValue: false,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
