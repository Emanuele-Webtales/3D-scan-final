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
<path d="M12.4952 18.5868L16.5874 20.7373C16.7603 20.8282 16.9552 20.8688 17.15 20.8544C17.3448 20.84 17.5316 20.7713 17.6893 20.656C17.847 20.5408 17.9692 20.3836 18.042 20.2023C18.1148 20.0211 18.1352 19.823 18.1011 19.6307L17.3181 15.0792C17.289 14.9114 17.3013 14.739 17.3541 14.577C17.4069 14.4151 17.4984 14.2685 17.6209 14.1501L20.9301 10.9243C21.0709 10.7888 21.1707 10.6166 21.2184 10.4271C21.2661 10.2377 21.2597 10.0387 21.1999 9.8527C21.14 9.66672 21.0292 9.50127 20.8801 9.37514C20.7309 9.24902 20.5493 9.16728 20.356 9.13923L15.7836 8.48155C15.6163 8.45643 15.4577 8.39105 15.3213 8.29103C15.1849 8.19102 15.0749 8.05936 15.0006 7.90739L12.9128 3.73168C12.8273 3.55518 12.6938 3.40633 12.5276 3.30218C12.3615 3.19803 12.1693 3.14279 11.9732 3.14279C11.7771 3.14279 11.585 3.19803 11.4188 3.30218C11.2526 3.40633 11.1192 3.55518 11.0337 3.73168L8.94584 7.90739C8.87161 8.05936 8.76156 8.19102 8.62518 8.29103C8.48879 8.39105 8.33015 8.45643 8.16289 8.48155L3.65312 9.13923C3.45894 9.16566 3.27611 9.24622 3.12556 9.37169C2.97502 9.49716 2.86283 9.66248 2.80183 9.84872C2.74084 10.035 2.73351 10.2346 2.78067 10.4248C2.82783 10.6151 2.92759 10.7882 3.06853 10.9243L6.37778 14.1501C6.5002 14.2685 6.5918 14.4151 6.64457 14.577C6.69734 14.739 6.70968 14.9114 6.68052 15.0792L5.89757 19.6307C5.86341 19.823 5.88388 20.0211 5.95667 20.2023C6.02946 20.3836 6.15164 20.5408 6.30932 20.656C6.46701 20.7713 6.65387 20.84 6.84867 20.8544C7.04347 20.8688 7.23838 20.8282 7.41126 20.7373L11.5035 18.5868C11.6558 18.5045 11.8262 18.4615 11.9993 18.4615C12.1724 18.4615 12.3428 18.5045 12.4952 18.5868Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

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
    const mappedPathLength = useTransform<number, number>(drawProgress, (v: number) => {
        // Compute base mapping inside [rangeStart, rangeEnd]
        const base = rangeStart + (rangeEnd - rangeStart) * v
        // Slightly overshoot at the very end to avoid a tiny gap on closed paths
        // when using stroke dashes for reveal (common with rounded line caps).
        const EPSILON = 0.03
        if (v >= 1 && rangeEnd >= 1) return 1 + EPSILON
        return base
    })
    const strokeOpacityMVBase = useTransform<number, number>(drawProgress, (v: number) =>
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
    const [computedStrokeWidth, setComputedStrokeWidth] = React.useState<number>(beamWidth)

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
                    // Pad by half the stroke width
                    const pad = Math.max(0, (computedStrokeWidth || beamWidth) / 2)
                    setViewBox(
                        `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
                    )
                } else {
                    // Fallback to a sane default
                    setViewBox("0 0 100 100")
                }
            }
        })
        return () => cancelAnimationFrame(id)
    }, [svgPaths, computedStrokeWidth, beamWidth])

    // Keep stroke width in screen pixels by adjusting based on SVG scale
    React.useEffect(() => {
        const updateStroke = () => {
            if (!svgRef.current || !viewBox) {
                setComputedStrokeWidth(beamWidth)
                return
            }
            const rect = svgRef.current.getBoundingClientRect()
            const parts = viewBox.split(" ").map(Number)
            const vbWidth = parts[2] || 0
            const vbHeight = parts[3] || 0
            if (vbWidth <= 0 || vbHeight <= 0) {
                setComputedStrokeWidth(beamWidth)
                return
            }
            const scaleX = rect.width / vbWidth
            const scaleY = rect.height / vbHeight
            const scale = Math.min(scaleX, scaleY) || 1
            setComputedStrokeWidth(beamWidth / scale)
        }

        updateStroke()
        const ro = new ResizeObserver(updateStroke)
        if (svgRef.current) ro.observe(svgRef.current)
        window.addEventListener("resize", updateStroke)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", updateStroke)
        }
    }, [beamWidth, viewBox])

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
                              strokeWidth={computedStrokeWidth}
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
                              strokeWidth={computedStrokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeOpacity={strokeOpacityMV}
                              fill="none"
                              // Normalize path units so 0..1 maps consistently across paths
                              pathLength={1}
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
        min: 1,
        max: 50,
        step: 1,
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

PathReveal.displayName = "Scroll Path Reveal"