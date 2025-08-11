import React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useRef, useState } from "react"

// Do not fix the import, these are the imports for framer.
import {
    gsap,
    useGSAP,
    SplitText,
    ScrambleTextPlugin,
    //@ts-ignore
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/text-area-hover-scramble.js"

gsap.registerPlugin(SplitText, ScrambleTextPlugin, useGSAP)

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //

interface ScrambleTextProps {
    text: string
    radius: number
    interval: number
    percentage: number
    color: string
    scrambleColor: string
    scrambleChars?: string
    className?: string
    style?: React.CSSProperties
    font?: React.CSSProperties
    tag?: string
}

const DEFAULT_SCRAMBLE_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicWidth auto
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 * @framerDisableUnlink
 */
export default function ScrambledText(props: ScrambleTextProps) {
    const {
        text = "Hover over this text to see the scramble effect",
        radius,
        interval,
        percentage,
        color,
        scrambleColor,
        scrambleChars = ".:",
        className = "",
        style = {},
        font = {},
        tag = "p",
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const charsRef = useRef<Element[]>([])
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isMouseOverText, setIsMouseOverText] = useState(false)
    const isMouseOverTextRef = useRef<boolean>(false)
    const currentMousePosRef = useRef({ x: 0, y: 0 })
    const scrambleIntervalRef = useRef<number | null>(null)
    const currentScrambledStates = useRef<Map<Element, string>>(new Map())
    const scrambledCharsRef = useRef<Set<Element>>(new Set()) // Track which chars are actually being scrambled
    const animationFrameRef = useRef<number | null>(null)

    const TAG = tag

    useGSAP(() => {
        if (!rootRef.current) return

        const paragraph = rootRef.current.querySelector(
            '[data-scramble-element]'
        ) as HTMLElement | null
        if (!paragraph) return

        // First split by words to maintain proper text wrapping
        const wordSplit = SplitText.create(paragraph, {
            type: "words",
            wordsClass: "word",
        })

        // Then split each word into characters for scrambling
        const charSplit = SplitText.create(wordSplit.words, {
            type: "chars",
            charsClass: "char",
        })

        charsRef.current = charSplit.chars

        // Set initial styles for each character
        charsRef.current.forEach((char: Element) => {
            gsap.set(char, {
                display: "inline-block",
                color: color,
                attr: { "data-content": char.innerHTML },
            })
            // Initialize scrambled state for each character
            currentScrambledStates.current.set(char, char.innerHTML)
        })

        // Function to generate a random scrambled character
        const getRandomChar = () => {
            const charsToUse = scrambleChars || DEFAULT_SCRAMBLE_CHARS
            return charsToUse[Math.floor(Math.random() * charsToUse.length)]
        }

        // Function to check if mouse is within radius of any character
        const isMouseNearAnyChar = () => {
            if (!rootRef.current) return false

            return charsRef.current.some((char: Element) => {
                const rect = char.getBoundingClientRect()
                const charCenterX = rect.left + rect.width / 2
                const charCenterY = rect.top + rect.height / 2
                const dx = currentMousePosRef.current.x - charCenterX
                const dy = currentMousePosRef.current.y - charCenterY
                const dist = Math.hypot(dx, dy)
                return dist < radius
            })
        }

        // Time-based scrambling function that only updates the scrambled states
        const updateScrambledStates = () => {
            if (!isMouseNearAnyChar()) return // Only scramble when mouse is near any character

            // Get all non-space characters that can be scrambled
            const scrambleableChars = charsRef.current.filter(
                (char: Element) => {
                    const originalChar = char.getAttribute("data-content") || ""
                    return originalChar.trim() !== "" // Don't scramble spaces
                }
            )

            // Calculate how many characters to scramble based on percentage
            const charsToScramble = Math.floor(
                (scrambleableChars.length * percentage) / 100
            )

            // Randomly select characters to scramble
            const shuffledChars = [...scrambleableChars].sort(
                () => Math.random() - 0.5
            )
            const charsToUpdate = shuffledChars.slice(0, charsToScramble)

            // Clear previous scrambled characters tracking
            scrambledCharsRef.current.clear()

            // Update only the selected characters
            charsToUpdate.forEach((char: Element) => {
                const scrambledChar = getRandomChar()
                currentScrambledStates.current.set(char, scrambledChar)
                scrambledCharsRef.current.add(char) // Track this character as being scrambled
            })

            // Update the display if needed (only for characters currently being scrambled)
            updateCharacterDisplay()
        }

        // Function to update character display based on current mouse position
        const updateCharacterDisplay = () => {
            if (!rootRef.current) return

            const isNearAnyChar = isMouseNearAnyChar()

            charsRef.current.forEach((char: Element) => {
                const rect = char.getBoundingClientRect()
                const charCenterX = rect.left + rect.width / 2
                const charCenterY = rect.top + rect.height / 2
                const dx = currentMousePosRef.current.x - charCenterX
                const dy = currentMousePosRef.current.y - charCenterY
                const dist = Math.hypot(dx, dy)

                if (dist < radius && isNearAnyChar) {
                    // Check if this character is actually being scrambled
                    const isBeingScrambled = scrambledCharsRef.current.has(char)

                    if (isBeingScrambled) {
                        // Show the scrambled state and set scramble color
                        const scrambledChar =
                            currentScrambledStates.current.get(char) ||
                            char.innerHTML
                        gsap.set(char, {
                            innerHTML: scrambledChar,
                            color: scrambleColor,
                        })
                    } else {
                        // Show the original character but keep normal color
                        const originalChar =
                            char.getAttribute("data-content") || ""
                        gsap.set(char, {
                            innerHTML: originalChar,
                            color: color,
                        })
                    }
                } else {
                    // Show the original character and restore normal color
                    const originalChar = char.getAttribute("data-content") || ""
                    gsap.set(char, {
                        innerHTML: originalChar,
                        color: color,
                    })
                }
            })

            // Update the visual state for the indicator
            setIsMouseOverText(isNearAnyChar)
            isMouseOverTextRef.current = isNearAnyChar
        }

        // Global mouse move handler using requestAnimationFrame
        const handleGlobalMove = (e: PointerEvent) => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                currentMousePosRef.current = { x: e.clientX, y: e.clientY }
                setMousePos({ x: e.clientX, y: e.clientY })
                updateCharacterDisplay()

                // Start/stop scrambling based on proximity to characters
                const isNearAnyChar = isMouseNearAnyChar()
                if (isNearAnyChar && !scrambleIntervalRef.current) {
                    // Start scrambling interval when mouse gets near any character
                    scrambleIntervalRef.current = window.setInterval(
                        updateScrambledStates,
                        interval * 1000 // Convert seconds to milliseconds
                    )
                } else if (!isNearAnyChar && scrambleIntervalRef.current) {
                    // Stop scrambling interval when mouse is far from all characters
                    window.clearInterval(scrambleIntervalRef.current)
                    scrambleIntervalRef.current = null
                }
            })
        }

        // Add global mouse move listener
        document.addEventListener("pointermove", handleGlobalMove)

        return () => {
            document.removeEventListener("pointermove", handleGlobalMove)

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            charSplit.revert()
            wordSplit.revert()

            // Clear the scrambling interval
            if (scrambleIntervalRef.current) {
                window.clearInterval(scrambleIntervalRef.current)
            }
            currentScrambledStates.current.clear()
        }
    }, [radius, interval, percentage, scrambleChars, color, scrambleColor, text, tag])

    return (
        <div
            ref={rootRef}
            className={`text-block ${className}`}
            style={{ ...font, ...style }}
        >
            {React.createElement(
                TAG,
                { style: { margin: 0, color }, "data-scramble-element": true },
                text
            )}

            {/* Visual indicator circle around cursor - only show when mouse is over text */}
            {isMouseOverText && (
                <div
                    style={{
                        position: "fixed",
                        left: mousePos.x - radius,
                        top: mousePos.y - radius,
                        width: radius * 2,
                        height: radius * 2,
                        //border: "1px solid rgba(136, 85, 255, 0.3)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                        zIndex: 9999,
                        transition: "opacity 0.2s ease",
                    }}
                />
            )}
        </div>
    )
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //

addPropertyControls(ScrambledText, {
    text: {
        type: ControlType.String,
        title: "Text",
        displayTextArea: true,
        defaultValue: "Hover over this text to see the scramble effect",
    },
    tag: {
        type: ControlType.Enum,
        title: "Tag",
        options: ["p", "h1", "h2", "h3", "h4", "h5", "h6"],
        defaultValue: "p",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        unit: "px",
        min: 10,
        max: 300,
        defaultValue: 100,
    },
    interval: {
        type: ControlType.Number,
        title: "Interval",
        unit: "s",
        min: 0.05,
        max: 2,
        step: 0.05,
        defaultValue: 0.5,
    },
    percentage: {
        type: ControlType.Number,
        title: "Percentage",
        min: 0,
        max: 100,
        defaultValue: 100,
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#000000",
    },
    scrambleColor: {
        type: ControlType.Color,
        title: "Scramble Color",
        defaultValue: "#8855FF",
    },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "monospace",
        defaultValue: {
            fontSize: 16,
            lineHeight: 1.5,
        },
    },
    scrambleChars: {
        type: ControlType.String,
        title: "Scramble Characters",
        placeholder: "Enter characters to use for scrambling",
        defaultValue: DEFAULT_SCRAMBLE_CHARS,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ScrambledText.displayName = "Scramble on hover"
