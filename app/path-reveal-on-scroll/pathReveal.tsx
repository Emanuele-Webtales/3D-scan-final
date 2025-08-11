import * as React from "react"
import {
    motion,
    useTransform,
    useViewportScroll,
    useAnimation,
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
        beamColor,
        beamWidth,
        startOpacity,
        endOpacity,
        scrollSpeed,
    } = props
    const { scrollYProgress } = useViewportScroll()
    const pathLength = useTransform(
        scrollYProgress,
        [0, 1],
        [0, 1 * scrollSpeed]
    )
    const controls = useAnimation()

    const [svgPath, setSvgPath] = React.useState<string>("")
    const svgRef = React.useRef<SVGSVGElement>(null)
    const pathRef = React.useRef<SVGPathElement>(null)
    const [viewBox, setViewBox] = React.useState<string | undefined>(undefined)

    React.useEffect(() => {
        if (svgFile) {
            fetch(svgFile)
                .then((response) => response.text())
                .then((svgContent) => {
                    const path = extractPathFromSVG(svgContent)
                    setSvgPath(path)
                })
        }
    }, [svgFile])

    React.useEffect(() => {
        const unsubscribeY = scrollYProgress.onChange((latest) => {
            if (latest === 1) {
                controls.start({
                    pathLength: 1 * scrollSpeed,
                    transition: {
                        type: "spring",
                        stiffness: 100,
                        damping: 10,
                        mass: 0.5,
                    },
                })
            }
        })

        return () => {
            unsubscribeY()
        }
    }, [controls, scrollYProgress, scrollSpeed])

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
                strokeOpacity={useTransform(
                    scrollYProgress,
                    [0, 1],
                    [startOpacity, endOpacity]
                )}
                fill="none"
                style={{ pathLength }}
                animate={controls}
            />
        </svg>
    )
}

PathReveal.defaultProps = {
    svgFile: "",
    beamColor: "#fc5025",
    beamWidth: 1,
    startOpacity: 0,
    endOpacity: 1,
    scrollSpeed: 1,
}

addPropertyControls(PathReveal, {
    svgFile: {
        type: ControlType.File,
        title: "SVG File",
        allowedFileTypes: ["svg"],
        description:
            "Upload single node SVG. It will be used as the path for beam to follow",
    } as FileControlDescription,
    beamColor: { type: ControlType.Color, title: "Beam Color" },
    beamWidth: {
        type: ControlType.Number,
        title: "Beam Width",
        min: 0,
        max: 10,
        step: 0.1,
    },
    startOpacity: {
        type: ControlType.Number,
        title: "Start Opacity",
        min: 0,
        max: 1,
        step: 0.1,
    },
    endOpacity: {
        type: ControlType.Number,
        title: "End Opacity",
        min: 0,
        max: 1,
        step: 0.1,
    },
    scrollSpeed: {
        type: ControlType.Number,
        title: "Scroll Speed",
        min: 0.1,
        max: 10,
        step: 0.1,
    },
})