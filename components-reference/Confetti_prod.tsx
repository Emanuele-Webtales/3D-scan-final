import * as React from "react"
import { Frame, addPropertyControls, ControlType } from "framer"
import confetti from "canvas-confetti"
import { useIsOnFramerCanvas } from "framer"
import { ComponentMessage } from "../ZUtility/Utils.tsx"

function extractRGBColorFromString(str) {
    const rgbRegex = /(rgba|rgb)\(.*?\)/g
    const match = str.match(rgbRegex)
    return match ? match[0] : str
}

function rgbToHex(rgb) {
    if (rgb.startsWith("#")) {
        return rgb
    }
    let [r, g, b] = rgb.match(/\d+/g).map(Number)
    return (
        "#" +
        [r, g, b]
            .map((x) => {
                const hex = x.toString(16)
                return hex.length === 1 ? "0" + hex : hex
            })
            .join("")
    )
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */

export default function Confetti({
    delayInSeconds,
    amount,
    coverArea,
    explosion,
    color,
}) {
    const frameRef = React.useRef(null)
    const [hasTriggered, setHasTriggered] = React.useState(false)
    const isOnCanvas = useIsOnFramerCanvas()

    React.useEffect(() => {
        if (!hasTriggered && !isOnCanvas) {
            const timer = setTimeout(() => {
                triggerConfetti()
                setHasTriggered(true)
            }, delayInSeconds * 1000)
            return () => clearTimeout(timer)
        }
    }, [delayInSeconds, hasTriggered, isOnCanvas])

    const triggerConfetti = () => {
        if (!frameRef.current) return

        const explosionSettings = {
            S: { velocity: 5, decay: 0.95 },
            M: { velocity: 15, decay: 0.95 },
            L: { velocity: 35, decay: 0.95 },
            XL: { velocity: 60, decay: 0.95 },
        }[explosion]

        const rect = frameRef.current.getBoundingClientRect()
        const origin = {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
        }

        confetti({
            particleCount: Math.floor(200 * (amount / 100)),
            spread: coverArea,
            startVelocity: explosionSettings.velocity,
            decay: explosionSettings.decay,
            scalar: 1,
            origin: origin,
            shapes: ["circle", "square"],
            colors: getColorConfig(color),
        })
    }

    function getColorConfig({ mode, singleColor, colors }) {
        if (mode === "Random") return undefined
        if (mode === "Single") {
            const formattedColor = extractRGBColorFromString(singleColor)
            return [rgbToHex(formattedColor)]
        }
        return colors.map((color) => rgbToHex(extractRGBColorFromString(color)))
    }

    if (isOnCanvas) {
        return (
            <ComponentMessage
                title="Confetti Component"
                subtitle="Preview the website and the confetti will appear here."
            />
        )
    }

    return (
        <Frame
            ref={frameRef}
            style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxSizing: "border-box",
                background: "none",
            }}
        />
    )
}

Confetti.displayName = "Confetti"

Confetti.defaultProps = {
    delayInSeconds: 0,
    amount: 30,
    coverArea: 360,
    explosion: "M",
    color: {
        mode: "Random",
        singleColor: "#2060DF",
        colors: ["#2060DF", "#986BEF"],
    },
}

addPropertyControls(Confetti, {
    amount: {
        type: ControlType.Number,
        title: "Amount",
        min: 1,
        max: 200,
        defaultValue: 30,
        step: 1,
    },
    coverArea: {
        type: ControlType.Number,
        title: "Cover Area",
        min: 20,
        max: 360,
        defaultValue: 360,
        step: 1,
        unit: "°",
    },
    explosion: {
        type: ControlType.Enum,
        title: "Explosion",
        options: ["S", "M", "L", "XL"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    color: {
        type: ControlType.Object,
        title: "Color",
        controls: {
            mode: {
                type: ControlType.Enum,
                title: "Color Mode",
                options: ["Random", "Single", "Multi"],
                defaultValue: "Random",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            singleColor: {
                type: ControlType.Color,
                title: "Single Color",
                hidden: ({ mode }) => mode !== "Single",
            },
            colors: {
                type: ControlType.Array,
                title: "Colors",
                propertyControl: { type: ControlType.Color },
                hidden: ({ mode }) => mode !== "Multi",
            },
        },
    },
    delayInSeconds: {
        type: ControlType.Number,
        title: "Delay",
        min: 0,
        max: 10,
        step: 0.1,
        displayStepper: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
