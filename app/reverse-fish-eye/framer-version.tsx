import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Imports are to be considered correct
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    TextureLoader,
    Vector2,
    LinearFilter,
    SRGBColorSpace,
    ClampToEdgeWrapping,
    // @ts-ignore
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/bulge-effect.js"

type ResponsiveImage = {
    src: string
    srcSet?: string
    alt?: string
}

type Props = {
    image?: ResponsiveImage
    radius?: number
    strength?: number
    centerX?: number
    centerY?: number
    smoothing?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function BulgeDistortion(props: Props) {
    const {
        image,
        radius = 0.6, // normalized (0..1) as in tutorial
        strength = 1.1,
        centerX = 0.5,
        centerY = 0.5,
        smoothing = 0.7,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [textureLoaded, setTextureLoaded] = useState(false)

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return

        const scene = new Scene()
        const renderer = new WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Sizing helpers
        const setSize = () => {
            // Use clientWidth/clientHeight for more reliable sizing
            const w = Math.max(container.clientWidth, 2)
            const h = Math.max(container.clientHeight, 2)
            renderer.setSize(w, h, false)
            camera.aspect = w / h
            // Update camera field of view based on new height
            const perspective = 800
            camera.fov = (180 * (2 * Math.atan(h / 2 / perspective))) / Math.PI
            camera.updateProjectionMatrix()
            uniforms.uResolution.value.set(w, h)
        }

        // Camera
        const perspective = 800
        const camera = new PerspectiveCamera(
            (180 * (2 * Math.atan(container.clientHeight / 2 / perspective))) /
                Math.PI,
            1,
            1,
            5000
        )
        camera.position.set(0, 0, perspective)

        // Load texture
        const loader = new TextureLoader()
        const src = image?.src || "/random-assets/image.png"
        const tex = loader.load(src, () => {
            setTextureLoaded(true)
            if ((tex as any).image) {
                uniforms.uTextureResolution.value.set(
                    (tex as any).image.width,
                    (tex as any).image.height
                )
            }
            renderer.render(scene, camera)
        })
        // sampling
        tex.minFilter = LinearFilter
        tex.wrapS = ClampToEdgeWrapping
        tex.wrapT = ClampToEdgeWrapping

        // Uniforms (aligned with introSphere shader naming)
        const uniforms: Record<string, any> = {
            uTexture: { value: tex },
            uResolution: { value: new Vector2(1, 1) },
            uTextureResolution: { value: new Vector2(1, 1) },
            uMousePosition: { value: new Vector2(centerX, centerY) },
            uUnwrapProgress: { value: 1.0 },
            uRotation: { value: 0.0 },
            uAutoRotationX: { value: 0.0 },
            uZoom: { value: 1.0 },
        }

        // Mouse smoothing vectors
        const targetMouse = new Vector2(centerX, centerY)
        const currentMouse = new Vector2(centerX, centerY)
        uniforms.uMousePosition.value.copy(currentMouse)

        const vertexShader = `
            varying vec2 vUv;
            varying vec2 vScreenPosition;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                // Approximate NDC screen position from plane UV
                vScreenPosition = (uv * 2.0) - 1.0;
            }
        `

        // Adapted from introSphere shader for spherification/fisheye
        const fragmentShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vScreenPosition;
            uniform sampler2D uTexture;
            uniform vec2 uResolution;
            uniform vec2 uTextureResolution;
            uniform vec2 uMousePosition;
            uniform float uUnwrapProgress;
            uniform float uRotation;
            uniform float uAutoRotationX;
            uniform float uZoom;

            #define PI 3.1415926535897932384626433832795
            #define CAMERA_DIST 25.0

            vec3 getFishEye(vec2 uv, float level) {
                float len = max(length(uv), 1e-6);
                float a = len * level;
                return vec3(uv / len * sin(a), -cos(a));
            }

            vec3 getColor(vec2 p, sampler2D tex) {
                vec2 baseUV = (p + 1.0) * 0.5; // from [-1,1] => [0,1]
                float containerAspect = uResolution.x / uResolution.y;
                float scale = 1.0;
                if (containerAspect < 1.0) {
                    scale = containerAspect;
                    baseUV.x = baseUV.x * scale + (1.0 - scale) * 0.5;
                } else {
                    scale = 1.0 / containerAspect;
                    baseUV.y = baseUV.y * scale + (1.0 - scale) * 0.5;
                }
                vec3 baseColor = texture2D(tex, baseUV).xyz;
                return baseColor;
            }

            void main(){
                vec2 p = vScreenPosition.xy;
                vec4 fragColor = vec4(0.0);

                float t = clamp(uUnwrapProgress, 0.0, 1.0);
                float zoom = pow(2.0 * t, 5.0) + 1.0;
                zoom *= uZoom;

                float aspect = uResolution.x / uResolution.y;
                vec3 dir;
                if (aspect >= 1.0) {
                    dir = normalize(vec3(p.x * aspect * PI, p.y * PI, -zoom * (CAMERA_DIST - 1.0)));
                } else {
                    dir = normalize(vec3(p.x * PI, p.y / aspect * PI, -zoom * (CAMERA_DIST - 1.0)));
                }

                float b = CAMERA_DIST * dir.z;
                float h = b*b - CAMERA_DIST*CAMERA_DIST + 1.0;

                if (h >= 0.0) {
                    vec3 q = vec3(0.0, 0.0, CAMERA_DIST) - dir * (b + sqrt(h));

                    float cosRot = cos(uRotation * PI * 2.0);
                    float sinRot = sin(uRotation * PI * 2.0);
                    mat3 rotationMatrix = mat3(
                        cosRot, 0.0, -sinRot,
                        0.0, 1.0, 0.0,
                        sinRot, 0.0, cosRot
                    );
                    q = rotationMatrix * q;

                    vec3 normal = normalize(q);
                    float u = atan(normal.x, normal.z) / (2.0 * PI);
                    float v = 1.0 - acos(normal.y) / PI;
                    vec2 sphereCoords = vec2(u, v);

                    p = sphereCoords * zoom;
                    vec3 color = getColor(p, uTexture);

                    vec3 fisheyeDir = getFishEye(vScreenPosition.xy, 1.4);
                    float fisheyeMix = smoothstep(0.0, 1.0, t);
                    vec2 finalCoords = mix(sphereCoords, fisheyeDir.xy, fisheyeMix);
                    color = getColor(finalCoords, uTexture);

                    if (t >= 1.0) {
                        float mouseX = -(uMousePosition.x - 0.5);
                        float mouseY = -(uMousePosition.y - 0.5);
                        float mouseInfluenceX = 0.3;
                        float mouseInfluenceY = 0.2;
                        float mouseRotationX = mouseX * mouseInfluenceX * PI;
                        float mouseRotationY = mouseY * mouseInfluenceY * PI;
                        float autoRotation = uAutoRotationX;

                        mat2 mouseRotationMatrixX = mat2(cos(mouseRotationX), -sin(mouseRotationX), sin(mouseRotationX), cos(mouseRotationX));
                        mat2 mouseRotationMatrixY = mat2(cos(mouseRotationY), -sin(mouseRotationY), sin(mouseRotationY), cos(mouseRotationY));
                        mat2 autoRotationMatrix = mat2(cos(autoRotation), -sin(autoRotation), sin(autoRotation), cos(autoRotation));
                        fisheyeDir.xz = mouseRotationMatrixX * fisheyeDir.xz;
                        fisheyeDir.yz = mouseRotationMatrixY * fisheyeDir.yz;
                        fisheyeDir.xz = autoRotationMatrix * fisheyeDir.xz;
                        color = getColor(fisheyeDir.xy, uTexture);
                    }

                    float fish_eye = smoothstep(2.0, 1.6, length(vScreenPosition.xy)) * 0.15 + 1.0;
                    fragColor = vec4(color * fish_eye, 1.0);
                }

                gl_FragColor = fragColor;
            }
        `

        const geometry = new PlaneGeometry(1, 1, 1, 1)
        const material = new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: false,
        })
        const mesh = new Mesh(geometry, material)
        scene.add(mesh)

        // Initial sizing and plane scale to fill container
        const updatePlane = () => {
            // Use clientWidth/clientHeight instead of getBoundingClientRect for more reliable sizing
            const width = container.clientWidth
            const height = container.clientHeight
            // Ensure the plane fills the entire container without padding
            mesh.scale.set(width, height, 1)
            // Center the mesh exactly in the container
            mesh.position.set(0, 0, 0)
        }

        const render = () => {
            // Update animation uniforms if needed
            renderer.render(scene, camera)
        }

        // Mouse move handling (normalized to component coordinates)
        const updateMouse = (clientX: number, clientY: number) => {
            const rect = container.getBoundingClientRect()
            const x = (clientX - rect.left) / Math.max(rect.width, 1)
            const y = 1 - (clientY - rect.top) / Math.max(rect.height, 1)
            const clampedX = Math.max(0, Math.min(1, x))
            const clampedY = Math.max(0, Math.min(1, y))
            targetMouse.set(clampedX, clampedY)
        }

        const onMouseMove = (e: MouseEvent) => {
            updateMouse(e.clientX, e.clientY)
        }
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches && e.touches.length > 0) {
                updateMouse(e.touches[0].clientX, e.touches[0].clientY)
            }
        }

        // Resize observers
        const onResize = () => {
            setSize()
            updatePlane()
            render()
        }
        setSize()
        updatePlane()
        render()

        const resizeObserver = new ResizeObserver(onResize)
        resizeObserver.observe(container)
        window.addEventListener("resize", onResize)

        // In Canvas mode, force a couple of extra resizes to settle layout
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(onResize, 50)
            setTimeout(onResize, 150)
        }

        let raf = 0
        let lastTime = performance.now()
        const loop = () => {
            const now = performance.now()
            const dt = Math.max(0, (now - lastTime) / 1000)
            lastTime = now
            // smoothing semantics:
            //  - s = 0 => disabled (instant follow)
            //  - s in (0,1] => exponential smoothing with bounded time constant
            const s = Math.max(0, Math.min(1, smoothing))
            if (s === 0) {
                currentMouse.copy(targetMouse)
            } else {
                // Map s to a time constant in a safe range to avoid glacial motion
                // Smaller tau => snappier; larger tau => smoother
                const tauMin = 0.04 // ~fast catch-up
                const tauMax = 0.25 // smooth but still responsive
                const tau = tauMin + (tauMax - tauMin) * s
                const alpha = 1 - Math.exp(-dt / Math.max(1e-6, tau))
                currentMouse.lerp(targetMouse, alpha)
            }
            uniforms.uMousePosition.value.set(currentMouse.x, currentMouse.y)
            raf = requestAnimationFrame(loop)
            render()
        }
        // Always run animation loop
        loop()

        // Initialize mouse at props center
        targetMouse.set(centerX, centerY)
        currentMouse.set(centerX, centerY)
        uniforms.uMousePosition.value.set(centerX, centerY)
        // Listeners
        container.addEventListener("mousemove", onMouseMove)
        container.addEventListener("touchmove", onTouchMove, { passive: true })

        return () => {
            if (raf) cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            window.removeEventListener("resize", onResize)
            container.removeEventListener("mousemove", onMouseMove)
            container.removeEventListener("touchmove", onTouchMove)
            geometry.dispose()
            material.dispose()
            renderer.dispose()
        }
    }, [image?.src, radius, strength, centerX, centerY, smoothing])

    // If no image yet, show helpful message
    const hasImage = !!(image && image.src)

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "block",
                margin: 0,
                padding: 0,
                ...style,
            }}
        >
            {/* White background container */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",

                    margin: 0,
                    padding: 0,
                }}
            />

            {!hasImage ? (
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="3D Image Distortion"
                    description="Add an Image and to see a cool reverse fish eye effect"
                />
            ) : (
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        margin: 0,
                        padding: 0,
                        zIndex: 2,
                    }}
                />
            )}
        </div>
    )
}

addPropertyControls(BulgeDistortion, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    smoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        defaultValue: 0.7,
        min: 0,
        max: 1,
        step: 0.01,
        displayStepper: false,
        description: "0=off (instant), higher=smoother (capped for responsiveness)",
    },
})

BulgeDistortion.displayName = "3D Image Distortion"
