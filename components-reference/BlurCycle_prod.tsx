import React, { useState, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence } from "framer-motion"

const MAX_SPEED = 20
const defaultTransition = {
    stiffness: 100,
    damping: 20,
    mass: 1,
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function BlurCycle({
    text,
    speed,
    delay,
    font,
    userSelect,
    color,
    tag,
    loop,
    alignment,
}) {
    const Tag = tag
    const content = text
        .split(", ")
        .map((phrase) => phrase.replace(/\s+/g, " ").trim())
    const [iteration, setIteration] = useState(0)
    const [isFirstRender, setIsFirstRender] = useState(true)

    const speedFormatted = ((MAX_SPEED - speed + 1) / 20) * 5
    const delayFormattedMs = delay * 1000
    const speedFormattedMs = speedFormatted * 1000
    const MAX_BLUR = parseInt(font.fontSize) * 0.2 || 4.8

    useEffect(() => {
        const timeout = isFirstRender
            ? delayFormattedMs + speedFormattedMs / 4
            : speedFormattedMs + delayFormattedMs

        const interval = setInterval(() => {
            setIsFirstRender(false)
            if (iteration < content.length - 1) {
                setIteration((prev) => prev + 1)
            } else if (loop) {
                setIteration(0)
            }
        }, timeout)

        return () => clearInterval(interval)
    }, [iteration, loop, isFirstRender])

    return (
        <div
            style={{
                userSelect: userSelect ? "auto" : "none",
                position: "relative",
                display: "flex",
                flexDirection: "row",
                overflow: "visible",
                width: "calc(100% + 10px)",
                justifyContent:
                    alignment === "center"
                        ? "center"
                        : alignment === "right"
                          ? "flex-end"
                          : "flex-start",
            }}
        >
            <Tag
                aria-hidden
                style={{
                    fontSize: "24px",
                    ...font,
                    marginBlockStart: "0px",
                    marginBlockEnd: "0px",
                    pointerEvents: "none",
                    opacity: 0,
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    textAlign: alignment,
                }}
            >
                {content.reduce((longest, current) =>
                    current.length > longest.length ? current : longest
                )}
            </Tag>

            {RenderTarget.current() === RenderTarget.canvas && (
                <Tag
                    style={{
                        fontSize: "24px",
                        ...font,
                        color,
                        marginBlockStart: "0px",
                        marginBlockEnd: "0px",
                        whiteSpace: "pre-wrap",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        textAlign: alignment,
                    }}
                >
                    {content[0]}
                </Tag>
            )}

            {RenderTarget.current() !== RenderTarget.canvas && (
                <>
                    {content.map((phrase, phraseIndex) => {
                        // Calculate the absolute index for each character up front
                        let charIndex = 0
                        const segments = phrase
                            .split(/(\s+|\b)/)
                            .map((segment) => ({
                                text: segment,
                                chars: segment.split("").map((char) => ({
                                    char,
                                    originalIndex: charIndex++,
                                })),
                            }))

                        return (
                            <div
                                key={phraseIndex}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    overflow: "visible",
                                    width: "100%",
                                    textAlign: alignment,
                                }}
                            >
                                <AnimatePresence mode="sync">
                                    {iteration === phraseIndex && (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                width: "100%",
                                                justifyContent:
                                                    alignment === "center"
                                                        ? "center"
                                                        : alignment === "right"
                                                          ? "flex-end"
                                                          : "flex-start",
                                                gap: 0,
                                            }}
                                        >
                                            {segments.map(
                                                (segment, segmentIndex) => (
                                                    <div
                                                        key={segmentIndex}
                                                        style={{
                                                            display:
                                                                "inline-flex",
                                                            flexWrap: "nowrap",
                                                            whiteSpace: "pre",
                                                        }}
                                                    >
                                                        {segment.chars.map(
                                                            ({
                                                                char,
                                                                originalIndex,
                                                            }) => {
                                                                const itemTransition =
                                                                    {
                                                                        hidden: {
                                                                            opacity: 0,
                                                                            filter: `blur(${MAX_BLUR}px)`,
                                                                            zIndex: 1,
                                                                            transition:
                                                                                {
                                                                                    ...defaultTransition,
                                                                                    duration:
                                                                                        speedFormatted /
                                                                                        2,
                                                                                    delay:
                                                                                        (speedFormatted /
                                                                                            2) *
                                                                                        0.5,
                                                                                },
                                                                        },
                                                                        show: {
                                                                            opacity: 1,
                                                                            filter: "blur(0px)",
                                                                            zIndex: 1,
                                                                            transition:
                                                                                {
                                                                                    ...defaultTransition,
                                                                                    duration:
                                                                                        speedFormatted /
                                                                                        2,
                                                                                    delay:
                                                                                        (speedFormatted /
                                                                                            2) *
                                                                                            0.5 +
                                                                                        (originalIndex /
                                                                                            (phrase.length -
                                                                                                1)) *
                                                                                            (speedFormatted /
                                                                                                3),
                                                                                },
                                                                        },
                                                                        exit: {
                                                                            opacity: 0,
                                                                            filter: `blur(${MAX_BLUR / 60}px)`,
                                                                            zIndex: 0,
                                                                            transition:
                                                                                {
                                                                                    ...defaultTransition,
                                                                                    duration:
                                                                                        speedFormatted /
                                                                                        2,
                                                                                },
                                                                        },
                                                                    }

                                                                return (
                                                                    <motion.div
                                                                        key={
                                                                            phrase +
                                                                            originalIndex
                                                                        }
                                                                        variants={
                                                                            itemTransition
                                                                        }
                                                                        initial={
                                                                            isFirstRender
                                                                                ? "show"
                                                                                : "hidden"
                                                                        }
                                                                        animate="show"
                                                                        exit="exit"
                                                                        style={{
                                                                            display:
                                                                                "inline-block",
                                                                        }}
                                                                    >
                                                                        <Tag
                                                                            style={{
                                                                                fontSize:
                                                                                    "24px",
                                                                                ...font,
                                                                                color,
                                                                                marginBlockStart:
                                                                                    "0px",
                                                                                marginBlockEnd:
                                                                                    "0px",
                                                                                opacity: 1,
                                                                            }}
                                                                        >
                                                                            {
                                                                                char
                                                                            }
                                                                        </Tag>
                                                                    </motion.div>
                                                                )
                                                            }
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </>
            )}
        </div>
    )
}

BlurCycle.displayName = "Blur Cycle"

addPropertyControls(BlurCycle, {
    text: {
        type: ControlType.String,
        title: "Text",
        defaultValue: "to learn Framer, to build websites",
        description:
            "Divide phrases with a comma (,) if you want to display them separately.",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: MAX_SPEED / 2,
        min: 1,
        max: MAX_SPEED,
    },
    delay: {
        type: ControlType.Number,
        title: "Delay",
        defaultValue: 1,
        min: 0,
        max: 10,
    },
    font: {
        title: "Font",
        type: ControlType.Font,
        controls: "extended",
    },
    color: {
        title: "Color",
        type: ControlType.Color,
        defaultValue: "#999",
    },
    alignment: {
        type: ControlType.Enum,
        displaySegmentedControl: true,
        title: "Alignment",
        defaultValue: "left",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
    },
    userSelect: {
        title: "User Select",
        type: ControlType.Boolean,
        defaultValue: false,
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        defaultValue: "p",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        options: ["h1", "h2", "h3", "p"],
        optionTitles: ["H1", "H2", "H3", "P"],
    },
    loop: {
        title: "Loop",
        type: ControlType.Boolean,
        defaultValue: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
