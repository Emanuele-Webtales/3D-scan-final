import { useMemo } from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

/**
 * @framerDisableUnlink
 *
 * @framerIntrinsicWidth 240
 * @framerIntrinsicHeight 240
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

function BlurGradient({ blur, borderRadius, direction, transition }) {
    const blurSteps = useMemo(
        () => [
            {
                blur: `${blur / 2 / 2 / 2 / 2 / 2 / 2 / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 37.5%`,
            },
            {
                blur: `${blur / 2 / 2 / 2 / 2 / 2 / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 0) 50%`,
            },
            {
                blur: `${blur / 2 / 2 / 2 / 2 / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 62.5%`,
            },
            {
                blur: `${blur / 2 / 2 / 2 / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 0) 75%`,
            },
            {
                blur: `${blur / 2 / 2 / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 87.5%`,
            },
            {
                blur: `${blur / 2 / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%`,
            },
            {
                blur: `${blur / 2}px`,
                gradient: `rgba(0, 0, 0, 0) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 1) 100%`,
            },
            {
                blur: `${blur}px`,
                gradient: `rgba(0, 0, 0, 0) 87.5%, rgba(0, 0, 0, 1) 100%`,
            },
        ],
        [blur]
    )

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
            }}
        >
            {blurSteps.map((step, index) => (
                <motion.div
                    key={index}
                    transition={transition}
                    initial={{ backdropFilter: `blur(${step.blur})` }}
                    animate={{ backdropFilter: `blur(${step.blur})` }}
                    style={{
                        opacity: 1,
                        position: "absolute",
                        inset: 0,
                        zIndex: index + 1,
                        maskImage: `linear-gradient(${direction}, ${step.gradient})`,
                        WebkitMaskImage: `linear-gradient(${direction}, ${step.gradient})`,
                        borderRadius: borderRadius,
                        pointerEvents: "none",
                    }}
                />
            ))}
        </div>
    )
}

BlurGradient.defaultProps = {
    blur: 10,
    borderRadius: "0px",
    direction: "toBottom",
    transition: { duration: 0.3 },
}

addPropertyControls(BlurGradient, {
    blur: {
        title: "Blur",
        type: ControlType.Number,
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 1,
        description: "Large blur values (10<) can impact performance.",
    },
    borderRadius: {
        title: "Radius",
        type: ControlType.BorderRadius,
        defaultValue: "0px",
        description:
            "Blur Gradient component's parent frame can't have border radius (it will break the component). If you need corner radius, apply it directly to the Blur Gradient component here.",
    },
    direction: {
        title: "Direction",
        type: ControlType.SegmentedEnum,
        options: ["to bottom", "to top", "to left", "to right"],
        optionTitles: ["↓", "↑", "←", "→"],
        defaultValue: "to bottom",
    },
    transition: {
        type: ControlType.Transition,
        defaultValue: { duration: 0.3 },
        title: "Transition",
        description:
            "Control how the blur animates when used on hover states or any othe interaction.\n\nMore components at [Framer University](https://frameruni.link/cc).",
    },
})

BlurGradient.displayName = "Blur Gradient"

export default BlurGradient
