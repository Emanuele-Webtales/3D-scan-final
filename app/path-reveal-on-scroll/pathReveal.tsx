import * as React from "react"
import {
    motion,
    useTransform,
    useViewportScroll,
    useMotionValue,
} from "framer-motion"
import {
    addPropertyControls,
    ControlType,
    FileControlDescription,
} from "framer"

// Function to extract path from SVG content
const extractPathFromSVG = (svgContent: string): string => {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const path = svgDoc.querySelector("path")
    return path ? path.getAttribute("d") || "" : ""
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 320
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

export default function PathReveal(props:any) {
    const {
        svgFile,
        svgCode,
        inputType,
        beamColor,
        beamWidth,
        opacity,
        progress,
        scrollSpeed,
        startPosition,
    } = props
    const { scrollY } = useViewportScroll()
    const drawProgress = useMotionValue(0)
    const triggerYRef = React.useRef<number | null>(null)

    // Start when the path reaches the chosen viewport anchor; then complete over `scrollSpeed` pixels
    React.useEffect(() => {
        const unsubscribe = scrollY.onChange((y) => {
            if (!pathRef.current) return
            const rect = pathRef.current.getBoundingClientRect()
            const vh = window.innerHeight
            const anchorY =
                startPosition === "top"
                    ? rect.top
                    : startPosition === "center"
                    ? rect.top + rect.height / 2
                    : rect.bottom
            // We want to trigger only when the chosen anchor crosses upward past the line
            const thresholdY =
                startPosition === "top" ? 0 : startPosition === "center" ? vh / 2 : vh

            // Reset trigger if element is above the threshold (before start)
            if (anchorY > thresholdY) {
                triggerYRef.current = null
                drawProgress.set(0)
                return
            }

            // Lock trigger only when the anchor is at or above the threshold (crossed)
            if (triggerYRef.current == null && anchorY <= thresholdY) {
                triggerYRef.current = y
            }

            const distance = Math.max(1, Number(scrollSpeed) || 1)
            const progressed = (y - (triggerYRef.current as number)) / distance
            const clamped = Math.max(0, Math.min(1, progressed))
            drawProgress.set(clamped)
        })

        return () => {
            unsubscribe()
        }
    }, [scrollY, startPosition, scrollSpeed])

    // Resolve opacity start/end from object prop
    const opacityStart: number =
        (opacity && typeof opacity.start === "number" ? opacity.start : 0) || 0
    const opacityEnd: number =
        (opacity && typeof opacity.end === "number" ? opacity.end : 1) || 1

    // Resolve path range [start, end] from progress object
    const rangeStart: number = Math.max(
        0,
        Math.min(1, progress?.start ?? 0)
    )
    const rangeEnd: number = Math.max(
        0,
        Math.min(1, progress?.end ?? 1)
    )

    // Map drawProgress -> path length and opacity
    const pathLengthMV = useTransform(drawProgress, (v) =>
        rangeStart + (rangeEnd - rangeStart) * v
    )
    const strokeOpacityMV = useTransform(drawProgress, (v) =>
        opacityStart + (opacityEnd - opacityStart) * v
    )

    const [svgPath, setSvgPath] = React.useState<string>("")
    const svgRef = React.useRef<SVGSVGElement>(null)
    const pathRef = React.useRef<SVGPathElement>(null)
    const [viewBox, setViewBox] = React.useState<string | undefined>(undefined)

    React.useEffect(() => {
        let cancelled = false
        const setPath = (pathStr: string) => {
            if (!cancelled) setSvgPath(pathStr)
        }

        if (inputType === "file" && svgFile) {
            fetch(svgFile)
                .then((response) => response.text())
                .then((svgContent) => {
                    const path = extractPathFromSVG(svgContent)
                    setPath(path)
                })
                .catch(() => setPath(""))
        } else if (inputType === "code" && svgCode) {
            const path = extractPathFromSVG(svgCode)
            setPath(path)
        } else {
            setPath("")
        }

        return () => {
            cancelled = true
        }
    }, [inputType, svgFile, svgCode])

    // Both path drawing and opacity are tied to the same drawProgress

    // Compute a proper viewBox from the actual path geometry once it's rendered
    React.useLayoutEffect(() => {
        if (!svgPath) return
        // Wait one frame to ensure the path is in the DOM
        const id = requestAnimationFrame(() => {
            if (pathRef.current) {
                const bbox = pathRef.current.getBBox()
                if (bbox && bbox.width > 0 && bbox.height > 0) {
                    setViewBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
                } else {
                    // Fallback to a sane default
                    setViewBox("0 0 100 100")
                }
            }
        })
        return () => cancelAnimationFrame(id)
    }, [svgPath])

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
        >
            <motion.path
                ref={pathRef}
                d={svgPath}
                stroke={beamColor}
                strokeWidth={beamWidth}
                strokeOpacity={strokeOpacityMV}
                fill="none"
                style={{ pathLength: pathLengthMV }}
            />
        </svg>
    )
}

PathReveal.defaultProps = {
    svgFile: "",
    svgCode: "",
    inputType: "file",
    beamColor: "#fc5025",
    beamWidth: 1,
    opacity: { start: 0, end: 1 },
    progress: { start: 0, end: 1 },
    // Pixels required after the start trigger to go from 0 -> 1
    scrollSpeed: 1000,
    startPosition: "center",
}

addPropertyControls(PathReveal, {
    inputType: {
        type: ControlType.Enum,
        title: "Type",
        options: ["file", "code"],
        optionTitles: ["File", "Code"],
        displaySegmentedControl: true,
        defaultValue: "file",
    },
    svgFile: {
        type: ControlType.File,
        title: "SVG File",
        allowedFileTypes: ["svg"],
        hidden: (props) => props.inputType !== "file",
    } as FileControlDescription,
    svgCode: {
        type: ControlType.String,
        title: " ",
        displayTextArea: true,
        hidden: (props) => props.inputType !== "code",
    },
    startPosition: {
        type: ControlType.Enum,
        title: "Start",
        defaultValue: "center",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
    },
    beamColor: { type: ControlType.Color, title: "Beam Color" },
    beamWidth: {
        type: ControlType.Number,
        title: "Beam Width",
        min: 0,
        max: 10,
        step: 0.1,
    },
    opacity: {
        type: ControlType.Object,
        title: "Opacity",
        controls: {
            start: {
                type: ControlType.Number,
                title: "Start",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0,
            },
            end: {
                type: ControlType.Number,
                title: "End",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 1,
            },
        },
    },
    progress: {
        type: ControlType.Object,
        title: "Path",
        controls: {
            start: {
                type: ControlType.Number,
                title: "Start",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0,
            },
            end: {
                type: ControlType.Number,
                title: "End",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 1,
            },
        },
    },
    scrollSpeed: {
        type: ControlType.Number,
        title: "Scroll Distance",
        min: 1,
        max: 10000,
        step: 1,
        displayStepper: true,
    },
})