import React, { useEffect, useLayoutEffect } from "react"
import { motion, useTransform, useMotionValue, useScroll } from "framer-motion"
import {
    addPropertyControls,
    ControlType,
    FileControlDescription,
    RenderTarget,
} from "framer"

// Helpers
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

// Function to extract all paths from SVG content and measure their lengths precisely
const extractPathsFromSVG = (
    svgContent: string
): {
    paths: string[]
    lengths: number[]
    longestPathLength: number
    maxPathWidth: number
    maxPathHeight: number
} => {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const pathElements = Array.from(svgDoc.querySelectorAll("path"))
    const paths = pathElements
        .map((p) => p.getAttribute("d"))
        .filter((d): d is string => !!d)

    // Measure each path length and determine the longest
    const lengths: number[] = []
    let longestPathLength = 0
    let maxPathWidth = 0
    let maxPathHeight = 0
    if (pathElements.length > 0) {
        const tempSvg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        )
        tempSvg.style.position = "absolute"
        tempSvg.style.visibility = "hidden"
        document.body.appendChild(tempSvg)

        pathElements.forEach((pathEl) => {
            const tempPath = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            )
            tempPath.setAttribute("d", pathEl.getAttribute("d") || "")
            tempSvg.appendChild(tempPath)
            const length = tempPath.getTotalLength()
            lengths.push(length)
            longestPathLength = Math.max(longestPathLength, length)
            const bb = tempPath.getBBox()
            maxPathWidth = Math.max(maxPathWidth, bb.width)
            maxPathHeight = Math.max(maxPathHeight, bb.height)
        })

        document.body.removeChild(tempSvg)
    }

    // Keep paths separated; we'll animate each with its own length for precision
    return { paths, lengths, longestPathLength, maxPathWidth, maxPathHeight }
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

export default function PathReveal(props: any) {
    const {
        svgFile,
        svgCode,
        inputType,
        beamColor,
        beamWidth,
        opacity,
        progress,
        scrollSectionId,
        startAnchor,
        endAnchor,
        anchors,
        sticky,
    } = props
    const { scrollY } = useScroll()
    const groupRef = React.useRef<SVGGElement>(null)

    // State declarations (placed before effects that depend on them)
    const [svgPaths, setSvgPaths] = React.useState<string[]>([])
    const [pathLengths, setPathLengths] = React.useState<number[]>([])

    // Resolve effective settings (support both new grouped props and legacy top-level)
    const effectiveStartAnchor: "top" | "center" | "bottom" =
        anchors?.start || startAnchor || "center"
    const effectiveEndAnchor: "top" | "center" | "bottom" =
        anchors?.end || endAnchor || "top"
    const effectiveSectionId: string = sticky ? (scrollSectionId || "") : ""

    // When a scrollSectionId is provided, compute progress from that element's
    // scroll position through the viewport. Equivalent to offset ["start end", "end start"].
    const sectionProgressMV = useMotionValue(0)
    const sectionElRef = React.useRef<HTMLElement | null>(null)
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const specified = effectiveSectionId ? document.getElementById(effectiveSectionId) : null
        sectionElRef.current = specified || (containerRef.current as HTMLElement | null)
    }, [effectiveSectionId])

    // Warn when sticky is enabled but no section id is provided; we will gracefully fall back
    useEffect(() => {
        if (sticky && !effectiveSectionId) {
            console.warn(
                "[PathReveal] sticky is enabled but no scrollSectionId provided. Falling back to this component's container."
            )
        }
    }, [sticky, effectiveSectionId])

    // Keep section progress in sync on scroll and resize
    useEffect(() => {
        // Always compute based on the resolved target (either provided id or our container)
        const compute = () => {
            const el = sectionElRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const vh = window.innerHeight || 0
            const elementTop = rect.top
            const elementBottom = rect.bottom
            const startLine = effectiveStartAnchor === "top" ? 0 : effectiveStartAnchor === "center" ? vh / 2 : vh
            const endLine = effectiveEndAnchor === "top" ? 0 : effectiveEndAnchor === "center" ? vh / 2 : vh
            // Progress 0 at when elementTop reaches startLine; 1 when elementBottom reaches endLine
            const totalDistance = (elementBottom - endLine) - (elementTop - startLine)
            const traveled = (vh - startLine) - (elementTop - startLine)
            // Equivalent simpler form using rects:
            const totalPx = (rect.height + (startLine - endLine)) || rect.height
            const traveledPx = (startLine - elementTop)
            const p = clamp01(totalPx !== 0 ? traveledPx / totalPx : 0)
            sectionProgressMV.set(p)
        }
        // Compute once immediately and then on scroll/resize
        compute()
        const unsub = scrollY.onChange(compute)
        const onResize = () => compute()
        window.addEventListener("resize", onResize)
        return () => {
            unsub()
            window.removeEventListener("resize", onResize)
        }
    }, [effectiveSectionId, effectiveStartAnchor, effectiveEndAnchor, scrollY])

    // All progress is driven solely by the section element's position

    // Resolve opacity start/end from object prop
    const opacityStart: number =
        opacity && typeof opacity.start === "number" ? opacity.start : 0
    const opacityEnd: number =
        opacity && typeof opacity.end === "number" ? opacity.end : 1

    // Resolve path range [start, end] from progress object
    const rangeStart: number = Math.max(0, Math.min(1, progress?.start ?? 0))
    const rangeEnd: number = Math.max(0, Math.min(1, progress?.end ?? 1))

    // Calculate the visible portion of the path based on start and end progress
    const pathDrawProgress = useTransform<number, number>(
        sectionProgressMV,
        (scrollProgress: number) => {
            // Linear interpolation from rangeStart to rangeEnd
            return rangeStart + (rangeEnd - rangeStart) * scrollProgress
        }
    )

    // Keep a numeric snapshot of the mapped progress for per-path math
    const [pathProgressValue, setPathProgressValue] = React.useState<number>(
        () => {
            const initial = (pathDrawProgress as any)?.get?.()
            return typeof initial === "number" ? initial : rangeStart
        }
    )
    useEffect(() => {
        // Sync immediately when the range changes
        const current = (pathDrawProgress as any)?.get?.()
        if (typeof current === "number") setPathProgressValue(current)
        const unsub = pathDrawProgress.onChange((v) => setPathProgressValue(v))
        return () => unsub && unsub()
    }, [pathDrawProgress, rangeStart, rangeEnd])

    // Each path will compute its own dash values using its precise length

    // Restore animated opacity over the progress window

    // No combined path length needed
    const svgRef = React.useRef<SVGSVGElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const zoomProbeRef = React.useRef<HTMLDivElement>(null)
    const [viewBox, setViewBox] = React.useState<string | undefined>(undefined)
    const [computedStrokeWidth, setComputedStrokeWidth] =
        React.useState<number>(beamWidth)
    const [maxPathWidth, setMaxPathWidth] = React.useState<number>(0)
    const [maxPathHeight, setMaxPathHeight] = React.useState<number>(0)

    React.useEffect(() => {
        let cancelled = false
        const setPathsAndLength = (
            paths: string[],
            lengths: number[],
            _longest: number
        ) => {
            if (!cancelled) {
                setSvgPaths(paths)
                setPathLengths(lengths)
            }
        }

        if (inputType === "file" && svgFile) {
            fetch(svgFile)
                .then((response) => response.text())
                .then((svgContent) => {
                    const result = extractPathsFromSVG(svgContent)
                    setPathsAndLength(
                        result.paths,
                        result.lengths,
                        result.longestPathLength
                    )
                })
                .catch(() => setPathsAndLength([], [], 0))
        } else if (inputType === "code" && svgCode) {
            const result = extractPathsFromSVG(svgCode)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength
            )
        } else {
            // Use fallback svg when nothing is provided
            const result = extractPathsFromSVG(FALLBACK_SVG)
            setPathsAndLength(
                result.paths,
                result.lengths,
                result.longestPathLength
            )
        }

        return () => {
            cancelled = true
        }
    }, [inputType, svgFile, svgCode])

    // Both path drawing and opacity are tied to the same drawProgress

    // Compute a proper viewBox from the actual paths geometry once they're rendered
    useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0 || !groupRef.current) return
        const bbox = groupRef.current.getBBox()
        if (bbox && bbox.width > 0 && bbox.height > 0) {
            const pad = Math.max(0, (computedStrokeWidth || beamWidth) / 2)
            setViewBox(
                `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
            )
        } else {
            setViewBox("0 0 100 100")
        }
    }, [svgPaths, computedStrokeWidth, beamWidth])

    // Compute the widest and tallest individual path among all paths
    useLayoutEffect(() => {
        if (!svgPaths || svgPaths.length === 0 || !groupRef.current) return
        const paths = Array.from(groupRef.current.querySelectorAll("path"))
        if (paths.length === 0) return
        let widest = 0
        let tallest = 0
        for (const p of paths) {
            const bb = p.getBBox()
            widest = Math.max(widest, bb.width)
            tallest = Math.max(tallest, bb.height)
        }
        const pad = Math.max(0, (computedStrokeWidth || beamWidth) / 2)
        setMaxPathWidth(Math.ceil(widest + pad * 2))
        setMaxPathHeight(Math.ceil(tallest + pad * 2))
    }, [svgPaths, computedStrokeWidth, beamWidth])

    // Stroke width behavior with canvas zoom detection via 20x20 probe
    useEffect(() => {
        const compute = () => {
            const el = containerRef.current
            const svgEl = svgRef.current
            if (!el || !svgEl) {
                setComputedStrokeWidth(beamWidth)
                return
            }
            const probe = zoomProbeRef.current
            const zoom = probe ? (probe.getBoundingClientRect().width / 20) : 1
            const rect = svgEl.getBoundingClientRect()
            const parts = (viewBox || "0 0 100 100").split(" ").map(Number)
            const vbWidth = parts[2] || 100
            const vbHeight = parts[3] || 100
            const safeZoom = Math.max(zoom, 0.0001)
            // Remove editor zoom from the measured size so scale matches preview/live
            const scaleX = (rect.width / safeZoom) / vbWidth
            const scaleY = (rect.height / safeZoom) / vbHeight
            const scale = Math.min(scaleX, scaleY) || 1
            const next = beamWidth / scale
            setComputedStrokeWidth((prev) => (Math.abs(prev - next) > 0.05 ? next : prev))
        }

        if (RenderTarget.current() === RenderTarget.canvas) {
            let rafId = 0
            const last = { ts: 0, zoom: 0, w: 0, h: 0 }
            const TICK_MS = 250 // throttle to 4Hz to avoid unnecessary work
            const EPS_ZOOM = 0.001
            const EPS_SIZE = 0.5
            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                const svgEl = svgRef.current
                if (probe && svgEl) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const r = svgEl.getBoundingClientRect()
                    const timeOk = !last.ts || (now || performance.now()) - last.ts >= TICK_MS
                    const zoomChanged = Math.abs(currentZoom - last.zoom) > EPS_ZOOM
                    const sizeChanged = Math.abs(r.width - last.w) > EPS_SIZE || Math.abs(r.height - last.h) > EPS_SIZE
                    if (timeOk && (zoomChanged || sizeChanged)) {
                        last.ts = now || performance.now()
                        last.zoom = currentZoom
                        last.w = r.width
                        last.h = r.height
                        compute()
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        // Preview/Live: only respond to real size changes, not every animation frame
        compute()
        const ro = new ResizeObserver(() => compute())
        if (containerRef.current) ro.observe(containerRef.current)
        window.addEventListener("resize", compute)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", compute)
        }
    }, [beamWidth, viewBox])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                minWidth: maxPathWidth || undefined,
                minHeight: maxPathHeight || undefined,
            }}
        >
            <div style={{ position: "absolute", inset: 0 }}>
                {/* Invisible 20px probe to detect editor zoom in canvas */}
                <div
                    ref={zoomProbeRef}
                    style={{ position: "absolute", width: 20, height: 20, opacity: 0, pointerEvents: "none" }}
                />
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={viewBox}
                    preserveAspectRatio="xMidYMid meet"
                    overflow="visible"
                >
                    <g ref={groupRef}>
                        {svgPaths.map((d, i) => {
                            const len = pathLengths[i] ?? 0
                            const dasharray = len > 0 ? `${len}` : "1"
                            const isCanvas = RenderTarget.hasRestrictions()
                            const effectiveProgress = isCanvas ? 1 : pathProgressValue
                            const dashoffset =
                                len > 0 ? (1 - effectiveProgress) * len : 0
                            const opacityValue = isCanvas
                                ? 1
                                : opacityStart +
                                  (opacityEnd - opacityStart) *
                                      effectiveProgress
                            return (
                                <motion.path
                                    key={i}
                                    d={d}
                                    stroke={beamColor}
                                    strokeWidth={computedStrokeWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeOpacity={opacityValue as any}
                                    fill="none"
                                    strokeDasharray={dasharray}
                                    strokeDashoffset={dashoffset}
                                    
                                />
                            )
                        })}
                    </g>
                </svg>
            </div>
        </div>
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
    scrollSectionId: "",
    startAnchor: "center",
    endAnchor: "top",
    anchors: { start: "center", end: "top" },
    sticky: false,
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
    sticky: {
        type: ControlType.Boolean,
        title: "Sticky",
        enabledTitle: "Yes",
        disabledTitle: "No",
        defaultValue: false,
    },
    scrollSectionId: {
        type: ControlType.String,
        title: "Section ID",
        placeholder: "e.g. section-1",
        hidden: (props) => !props.sticky,
    },
    // Anchors group
    anchors: {
        type: ControlType.Object,
        title: "Anchors",
        controls: {
            start: {
        type: ControlType.Enum,
                title: "Start at",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
        defaultValue: "center",
            },
            end: {
                type: ControlType.Enum,
                title: "End at",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                defaultValue: "top",
            },
        },
    },
    // Removed legacy start/end mapping props in favor of scrollSectionId-driven progress
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
        title: "Progress",
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
        description:
        "More components at [Framer University](https://frameruni.link/cc).",
    }
    // Removed legacy distance and offset controls
})

PathReveal.displayName = "Scroll Path Reveal DEV"
