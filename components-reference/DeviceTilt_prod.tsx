import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMotionValue, useSpring } from "framer-motion"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 *
 * @framerDisableUnlink
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 */
export default function DeviceTilt(props) {
    const { tiltLimit, smoothing } = props
    const [permissionGranted, setPermissionGranted] = useState(false)
    const [permissionRequested, setPermissionRequested] = useState(false)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const id = generateInstanceId()
    const transition = {
        damping: 100,
        stiffness: mapRange(smoothing, 0, 100, 2000, 50),
    }

    const ref = useRef(null)
    const parentRef = useRef(null)
    const styleRef = useRef(null)
    const transformRef = useRef(null)
    const hasSpringRef = useRef(smoothing !== 0)
    const debugRef = useRef(null)

    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const springX = useSpring(x, transition)
    const springY = useSpring(y, transition)

    useEffect(() => {
        hasSpringRef.current = smoothing !== 0
    }, [smoothing])

    useEffect(() => {
        let animationFrameId

        const updateTransform = () => {
            if (isCanvas) {
                return
            }

            animationFrameId = requestAnimationFrame(updateTransform)

            if (!parentRef.current || !styleRef.current) {
                return
            }

            const xValue = hasSpringRef.current ? springX.get() : x.get()
            const yValue = hasSpringRef.current ? springY.get() : y.get()

            // Get transform
            const transformValue = parentRef.current.style.transform
            const transform = `rotateX(${xValue}deg) rotateY(${yValue}deg)`

            let newTransform = transformValue
            if (transformValue === "none") {
                newTransform = transform
            } else {
                newTransform = `${transform} ${transformValue}`
            }

            transformRef.current = newTransform
            styleRef.current.textContent = `
				div[data-devicetilt="${id}"] { transform: ${newTransform} !important }
			`
        }

        if (ref.current) {
            const container = ref.current.parentElement
            if (container) {
                const parent = container.parentElement
                if (parent) {
                    parentRef.current = parent
                    parent.setAttribute("data-devicetilt", id)
                }
            }
        }

        // Start the animation loop
        updateTransform()

        // Cleanup function
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
            }
        }
    }, [])

    const requestPermission = async () => {
        if (
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof (DeviceOrientationEvent as any).requestPermission ===
                "function"
        ) {
            try {
                const permission = await (
                    DeviceOrientationEvent as any
                ).requestPermission()
                setPermissionGranted(permission === "granted")
            } catch (error) {
                console.error(
                    "Error requesting device orientation permission:",
                    error
                )
            }
        } else {
            // For devices/browsers that don't need explicit permission
            setPermissionGranted(true)
        }
        setPermissionRequested(true)
    }

    useEffect(() => {
        if (!permissionRequested) {
            requestPermission()
        }
    }, [permissionRequested])

    useEffect(() => {
        // Only add event listener if permission is granted
        if (!permissionGranted) return

        const handleOrientation = (event) => {
            // Get beta (x-axis) and gamma (y-axis) rotation
            x.set(Math.min(Math.max(-event.beta, -tiltLimit), tiltLimit))
            y.set(Math.min(Math.max(-event.gamma, -tiltLimit), tiltLimit))

            console.log(event)

            debugRef.current.innerHTML = `x: ${x.get()}\ny: ${y.get()}`
            console.log(`x: ${x.get()}\ny: ${y.get()}`)
        }

        window.addEventListener("deviceorientation", handleOrientation)
        return () =>
            window.removeEventListener("deviceorientation", handleOrientation)
    }, [tiltLimit, permissionGranted])

    return (
        <div ref={ref} style={{ ...props.style }}>
            <style ref={styleRef}></style>
            {!permissionGranted ? (
                <button onClick={requestPermission}>
                    Enable Device Orientation
                </button>
            ) : (
                <span style={{ whiteSpace: "pre" }} ref={debugRef}>
                    Nothing here :(
                </span>
            )}
        </div>
    )
}

DeviceTilt.displayName = "Device Tilt (Dev)"

addPropertyControls(DeviceTilt, {
    tiltLimit: {
        type: ControlType.Number,
        defaultValue: 30,
        min: 0,
        max: 90,
        unit: "°",
    },
    smoothing: {
        type: ControlType.Number,
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const generateInstanceId = () => {
    const id = useMemo(() => {
        let result = ""
        for (let i = 0; i < 13; i++) {
            result += CHARACTERS.charAt(
                Math.floor(Math.random() * CHARACTERS.length)
            )
        }
        return result
    }, [])
    return id
}

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
    if (fromLow === fromHigh) {
        return toLow
    }
    const percentage = (value - fromLow) / (fromHigh - fromLow)
    return toLow + percentage * (toHigh - toLow)
}
