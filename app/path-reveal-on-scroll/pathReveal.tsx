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
    RenderTarget,
} from "framer"

// Function to extract all paths from SVG content
const extractPathsFromSVG = (svgContent: string): string[] => {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const paths = Array.from(svgDoc.querySelectorAll("path"))
        .map((p) => p.getAttribute("d"))
        .filter((d): d is string => !!d)
    return paths
}

// Fallback SVG (used when no SVG is provided)
const FALLBACK_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 7.2294C10.2671 3.30561 6.23596 2.95683 4.35874 4.66804C2.83049 6.04137 2.09645 9.33298 3.49233 12.363C5.89902 17.573 12 20.3087 12 20.3087C12 20.3087 18.101 17.573 20.5076 12.363C21.9036 9.33298 21.1695 6.04137 19.6413 4.66804C17.764 2.95683 13.7328 3.30561 12 7.2294Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

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
        speed,
        startPosition,
    } = props
    const { scrollY } = useViewportScroll()
    const drawProgress = useMotionValue(0)
    const triggerYRef = React.useRef<number | null>(null)
    const groupRef = React.useRef<SVGGElement>(null)

    // Start when the path reaches the chosen viewport anchor; then complete over computed distance
    React.useEffect(() => {
        const unsubscribe = scrollY.onChange((y) => {
            if (!groupRef.current) return
            const rect = groupRef.current.getBoundingClientRect()
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

            const speedFactor = Number(speed ?? scrollSpeed ?? 1) || 1
            const distance = Math.max(1, Math.round(window.innerHeight / speedFactor))
            const progressed = (y - (triggerYRef.current as number)) / distance
            const clamped = Math.max(0, Math.min(1, progressed))
            drawProgress.set(clamped)
        })

        return () => {
            unsubscribe()
        }
    }, [scrollY, startPosition, speed, scrollSpeed])

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

    // Map drawProgress -> overall pathLength within [rangeStart, rangeEnd]
    const mappedPathLength = useTransform(drawProgress, (v) => {
        const len = rangeStart + (rangeEnd - rangeStart) * v
        return len
    })
    const strokeOpacityMVBase = useTransform(drawProgress, (v) =>
        opacityStart + (opacityEnd - opacityStart) * v
    )
    // Hide initial sliver when near zero length
    const strokeOpacityMV = useTransform(
        [mappedPathLength, strokeOpacityMVBase],
        (values) => {
            const len = values[0] as number
            const o = values[1] as number
            return len <= 0.005 ? 0 : o
        }
    )

    const [svgPaths, setSvgPaths] = React.useState<string[]>([])
    const svgRef = React.useRef<SVGSVGElement>(null)
    const [viewBox, setViewBox] = React.useState<string | undefined>(undefined)

    React.useEffect(() => {
        let cancelled = false
        const setPaths = (paths: string[]) => {
            if (!cancelled) setSvgPaths(paths)
        }

        if (inputType === "file" && svgFile) {
            fetch(svgFile)
                .then((response) => response.text())
                .then((svgContent) => {
                    const paths = extractPathsFromSVG(svgContent)
                    setPaths(paths)
                })
                .catch(() => setPaths([]))
        } else if (inputType === "code" && svgCode) {
            const paths = extractPathsFromSVG(svgCode)
            setPaths(paths)
        } else {
            // Use fallback svg when nothing is provided
            const paths = extractPathsFromSVG(FALLBACK_SVG)
            setPaths(paths)
        }

        return () => {
            cancelled = true
        }
    }, [inputType, svgFile, svgCode])

    // Both path drawing and opacity are tied to the same drawProgress

    // Compute a proper viewBox from the actual paths geometry once they're rendered
    React.useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0) return
        // Wait one frame to ensure the path is in the DOM
        const id = requestAnimationFrame(() => {
            if (groupRef.current) {
                const bbox = groupRef.current.getBBox()
                if (bbox && bbox.width > 0 && bbox.height > 0) {
                    setViewBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
                } else {
                    // Fallback to a sane default
                    setViewBox("0 0 100 100")
                }
            }
        })
        return () => cancelAnimationFrame(id)
    }, [svgPaths])

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
        >
            <g ref={groupRef}>
                {RenderTarget.hasRestrictions()
                    ? svgPaths.map((d, i) => (
                          <motion.path
                              key={i}
                              d={d}
                              stroke={beamColor}
                              strokeWidth={beamWidth}
                              strokeLinecap="butt"
                              strokeLinejoin="round"
                              strokeOpacity={1}
                              fill="none"
                          />
                      ))
                    : svgPaths.map((d, i) => (
                          <motion.path
                              key={i}
                              d={d}
                              stroke={beamColor}
                              strokeWidth={beamWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeOpacity={strokeOpacityMV}
                              fill="none"
                              style={{ pathLength: mappedPathLength }}
                          />
                      ))}
            </g>
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
    // Back-compat: speed maps to viewportHeight / speed
    speed: 1,
    scrollSpeed: 0,
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
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 10,
        step: 0.1,
    },
})