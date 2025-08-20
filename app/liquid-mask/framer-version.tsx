import React, { useRef, useEffect, useState } from "react"

import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    LinearFilter,
    SRGBColorSpace,
    Clock,
    TextureLoader,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/liquid-mask.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ResponsiveImageValue {
    src: string
    srcSet?: string
    alt?: string
    positionX?: string
    positionY?: string
}

interface Props {
    imageBase?: ResponsiveImageValue
    imageHover?: ResponsiveImageValue
    radius?: number
    blur?: number
    circleBoost?: number
    noiseFreq?: number
    noiseStrength?: number
    timeSpeed?: number
    preview?: boolean
    style?: React.CSSProperties
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * 
 * Liquid Mask Component with Gooey Effect
 * 
 * How It Works:
 * - The DOM image is always visible at full opacity with proper cover behavior
 * - The Three.js canvas outputs a transparent result (no dark overlay)
 * - Only the hover image appears in the gooey effect areas
 * - This creates a clean effect where the base image shows through naturally
 * 
 * Canvas vs Preview Behavior:
 * - Both modes now show the same clean result
 * - No more double image or dark stretched overlay
 * - NEW: Preview mode shows effect in center when in Canvas mode
 */
export default function Page(props: Props) {
    const { 
        imageBase, 
        imageHover, 
        radius = 50,
        blur = 0.5,
        circleBoost = 0.5,
        noiseFreq = 5,
        noiseStrength = 0.3,
        timeSpeed = 5,
        preview = false
    } = props
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const uniformsRef = useRef<any>(null)

    // Value mapping functions to convert normalized property values to internal shader values
    const mapRadius = (normalizedRadius: number) => {
        // Map 10-1000px to 10-200px (current internal range)
        return 10 + (normalizedRadius - 10) * (190 / 990)
    }

    const mapBlur = (normalizedBlur: number) => {
        // Map 0-1 to 0.2-3.0 (current internal range)
        return 0.2 + normalizedBlur * 2.8
    }

    const mapCircleBoost = (normalizedCircleBoost: number) => {
        // Map 0-1 to 0.5-4.0 (current internal range)
        return 0.5 + normalizedCircleBoost * 3.5
    }

    const mapNoiseFreq = (normalizedNoiseFreq: number) => {
        // Map 1-10 to 2.0-16.0 (current internal range)
        return 2.0 + (normalizedNoiseFreq - 1) * (14.0 / 9.0)
    }

    const mapNoiseStrength = (normalizedNoiseStrength: number) => {
        // Map 0-1 to 0.0-3.0 (current internal range)
        return normalizedNoiseStrength * 3.0
    }

    const mapTimeSpeed = (normalizedTimeSpeed: number) => {
        // Map 0-10 to 0.0-1.0 for true linear mapping from static to fast
        return normalizedTimeSpeed * 0.1
    }



    useEffect(() => {
        const canvas = canvasRef.current
        const imgEl = imgRef.current
        const container = containerRef.current
        if (!canvas || !imgEl || !container) return

        // Scene setup
        const scene = new Scene()
        const perspective = 800
        const renderer = new WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        
        // Get container dimensions instead of viewport
        const containerRect = container.getBoundingClientRect()
        renderer.setSize(containerRect.width, containerRect.height)

        const computeFov = () => {
            const containerRect = container.getBoundingClientRect()
            return (180 * (2 * Math.atan(containerRect.height / 2 / perspective))) / Math.PI
        }
        
        const camera = new PerspectiveCamera(
            computeFov(),
            containerRect.width / containerRect.height,
            1,
            5000
        )
        camera.position.set(0, 0, perspective)

        // Load hover image texture for direct rendering
        const loader = new TextureLoader()
        const hoverSrc = imageHover?.src || "/random-assets/blue-profile-image.png"
        const hoverTexture = loader.load(hoverSrc, () => {
            // Update aspect ratio when texture loads
            if (hoverTexture.image) {
                const imageAspect = hoverTexture.image.width / hoverTexture.image.height
                uniforms.u_hoverImageAspect.value = imageAspect
            }
        })
        // Color space for modern three versions
        // @ts-ignore - guard older versions
        if (SRGBColorSpace) {
            // @ts-ignore
            hoverTexture.colorSpace = SRGBColorSpace
        }
        hoverTexture.minFilter = LinearFilter

        const uniforms: { [key: string]: any } = {
            u_time: { value: 0 },
            u_mouse: { value: new Vector2(0.5, 0.5) },
            u_progress: { value: 0 },
            u_planeRes: { value: new Vector2(1, 1) },
            u_radius: { value: mapRadius(radius) },
            u_blur: { value: mapBlur(blur) },
            u_circleBoost: { value: mapCircleBoost(circleBoost) },
            u_noiseFreq: { value: mapNoiseFreq(noiseFreq) },
            u_noiseStrength: { value: mapNoiseStrength(noiseStrength) },
            u_timeSpeed: { value: mapTimeSpeed(timeSpeed) },
            u_hoverImage: { value: hoverTexture },
            u_hoverImageAspect: { value: 1.0 },
            u_containerAspect: { value: 1.0 },
        }
        uniformsRef.current = uniforms

        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

        // Shader that renders the hover image masked by the gooey effect
        const fragmentShader = `
      precision highp float;
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_progress;
      uniform vec2 u_planeRes;
      uniform float u_radius;
      uniform float u_blur;
      uniform float u_circleBoost;
      uniform float u_noiseFreq;
      uniform float u_noiseStrength;
      uniform float u_timeSpeed;
      uniform sampler2D u_hoverImage;
      uniform float u_hoverImageAspect;
      uniform float u_containerAspect;

              // Simplex noise 3D from https://github.com/ashima/webgl-noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        // First corner
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0 * C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        // Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      // Pixel-based circle implementation
      float circle_pixel(vec2 pixelPos, vec2 mousePixel, float radiusPixels, float blurriness, vec2 resolution){
        float dist = length(pixelPos - mousePixel);
        return 1.0 - smoothstep(
          radiusPixels - (radiusPixels * blurriness),
          radiusPixels + (radiusPixels * blurriness),
          dist
        );
      }

      void main() {
        vec2 uv = vUv;

        // Convert UV coordinates to pixel coordinates
        vec2 pixelPos = uv * u_planeRes;
        vec2 mousePixel = u_mouse * u_planeRes;

        // Convert radius from normalized to pixels (u_radius is now in pixels)
        float radiusPixels = u_radius;

        // Aspect ratio corrected noise - uniform scale regardless of component proportions
        float aspectRatio = u_planeRes.x / u_planeRes.y;
        float correctedX = uv.x * aspectRatio;
        
        // Apply time speed to ALL time-based movement
        float offx = correctedX + (u_time * u_timeSpeed * 0.1) + sin(uv.y + u_time * u_timeSpeed * 0.1);
        float offy = uv.y - cos(u_time * u_timeSpeed * 0.001) * 0.01;
        
        // Apply time speed to multiple noise layers for more dramatic effect
        float n1 = snoise(vec3(offx * u_noiseFreq, offy * u_noiseFreq, u_time * u_timeSpeed)) - 1.0;
        float n2 = snoise(vec3(offx * u_noiseFreq * 0.5, offy * u_noiseFreq * 0.5, u_time * u_timeSpeed * 0.7)) - 1.0;
        float n = (n1 + n2 * 0.5) * 0.7;

        // Pixel-based circle calculation
        float c = circle_pixel(pixelPos, mousePixel, radiusPixels, u_blur, u_planeRes) * u_circleBoost * u_progress;
        float finalMask = smoothstep(0.4, 0.5, (n * u_noiseStrength) + pow(c, 2.0));

        // Responsive UV mapping for hover image (maintains aspect ratio like object-fit: cover)
        vec2 responsiveUV = uv;
        if (u_hoverImageAspect > u_containerAspect) {
          // Image is wider than container - scale to fit height
          float scale = u_containerAspect / u_hoverImageAspect;
          responsiveUV.x = (uv.x - 0.5) * scale + 0.5;
        } else {
          // Image is taller than container - scale to fit width
          float scale = u_hoverImageAspect / u_containerAspect;
          responsiveUV.y = (uv.y - 0.5) * scale + 0.5;
        }

        // Sample the hover image with responsive UV mapping and apply the mask
        vec4 hoverColor = texture2D(u_hoverImage, responsiveUV);
        
        // Output the hover image with mask applied as alpha
        gl_FragColor = vec4(hoverColor.rgb, hoverColor.a * finalMask);
      }
    `

        const geometry = new PlaneGeometry(1, 1, 1, 1)
        const material = new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
        })
        const mesh = new Mesh(geometry, material)
        scene.add(mesh)

        const sizes = new Vector2()
        const offset = new Vector2()

        const updateFromDOM = () => {
            const containerRect = container.getBoundingClientRect()
            // Make the mesh fill the entire container (not just the image)
            sizes.set(containerRect.width, containerRect.height)
            offset.set(0, 0) // Center in container
            mesh.position.set(0, 0, 0)
            mesh.scale.set(containerRect.width, containerRect.height, 1)
            uniforms.u_planeRes.value.set(containerRect.width, containerRect.height)
            
            // Update aspect ratio uniforms for responsive hover image
            const containerAspect = containerRect.width / containerRect.height
            uniforms.u_containerAspect.value = containerAspect
            
            // Calculate hover image aspect ratio when texture is loaded
            if (hoverTexture.image) {
                const imageAspect = hoverTexture.image.width / hoverTexture.image.height
                uniforms.u_hoverImageAspect.value = imageAspect
            }
        }
        updateFromDOM()

        let targetProgress = 0
        let rafId = 0
        const clock = new Clock()
        let isAnimating = false

        // Function to determine if we should animate
        const shouldAnimate = () => {
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            const isInView = container.getBoundingClientRect().top < window.innerHeight && 
                            container.getBoundingClientRect().bottom > 0
            
            // Only animate if:
            // 1. We're in Canvas mode AND preview is enabled, OR
            // 2. We're not in Canvas mode (live website) AND component is in view
            return (isCanvasMode && preview) || (!isCanvasMode && isInView)
        }

        const render = () => {
            // Check if we should continue animating
            if (!shouldAnimate()) {
                isAnimating = false
                return
            }

            isAnimating = true
            rafId = requestAnimationFrame(render)
            
            uniforms.u_time.value += clock.getDelta()
            // Update uniforms with current prop values (mapped to internal ranges)
            uniforms.u_radius.value = mapRadius(radius)
            uniforms.u_blur.value = mapBlur(blur)
            uniforms.u_circleBoost.value = mapCircleBoost(circleBoost)
            uniforms.u_noiseFreq.value = mapNoiseFreq(noiseFreq)
            uniforms.u_noiseStrength.value = mapNoiseStrength(noiseStrength)
            uniforms.u_timeSpeed.value = mapTimeSpeed(timeSpeed)

            // Check if we're in Canvas mode and preview is enabled
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && preview) {
                // In Canvas mode with preview enabled, show effect in center
                targetProgress = 1
                // Set mouse position to center (0.5, 0.5)
                uniforms.u_mouse.value.set(0.5, 0.5)
            } else {
                // Normal behavior - use mouse position and hover state
                // targetProgress will be updated by mouse events
            }

            // ease progress
            uniforms.u_progress.value +=
                (targetProgress - uniforms.u_progress.value) * 0.08
            renderer.render(scene, camera)
            
            // Canvas now renders hover image directly - no data URL needed
        }

        // Start animation if needed
        if (shouldAnimate()) {
            render()
        }

        // Throttled resize handler
        let resizeTimeout: NodeJS.Timeout | null = null
        const throttledResize = () => {
            if (resizeTimeout) return
            
            resizeTimeout = setTimeout(() => {
                const containerRect = container.getBoundingClientRect()
                renderer.setSize(containerRect.width, containerRect.height)
                camera.aspect = containerRect.width / containerRect.height
                camera.fov = computeFov()
                camera.updateProjectionMatrix()
                uniforms.u_resolution.value.set(
                    containerRect.width,
                    containerRect.height
                )
                uniforms.u_res.value.set(containerRect.width, containerRect.height)
                uniforms.u_pr.value = Math.min(window.devicePixelRatio || 1, 2)
                updateFromDOM()
                resizeTimeout = null
            }, 100) // 100ms throttle
        }
        
        // Use ResizeObserver for container changes
        const resizeObserver = new ResizeObserver(throttledResize)
        resizeObserver.observe(container)
        
        // Also listen to window resize for global changes
        window.addEventListener('resize', throttledResize)

        // Intersection Observer to pause rendering when out of view
        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isAnimating && shouldAnimate()) {
                        // Component came into view and should animate
                        render()
                    }
                })
            },
            {
                root: null,
                rootMargin: '50px', // Start animating 50px before component comes into view
                threshold: 0.01
            }
        )
        intersectionObserver.observe(container)

        const onMove = (e: MouseEvent) => {
            // Only handle mouse events if not in Canvas preview mode
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && preview) return
            
            // Start animation if not already running
            if (!isAnimating && shouldAnimate()) {
                render()
            }
            
            const containerRect = container.getBoundingClientRect()
            const x = (e.clientX - containerRect.left) / containerRect.width
            const y = 1 - (e.clientY - containerRect.top) / containerRect.height
            uniforms.u_mouse.value.set(
                Math.max(0.0, Math.min(1.0, x)),
                Math.max(0.0, Math.min(1.0, y))
            )
        }
        const onEnter = () => {
            // Only handle hover events if not in Canvas preview mode
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && preview) return
            
            targetProgress = 1
            
            // Start animation if not already running
            if (!isAnimating && shouldAnimate()) {
                render()
            }
        }
        const onLeave = () => {
            // Only handle hover events if not in Canvas preview mode
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && preview) return
            
            targetProgress = 0
        }

        container.addEventListener("mousemove", onMove)
        container.addEventListener("mouseenter", onEnter)
        container.addEventListener("mouseleave", onLeave)

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId)
            }
            resizeObserver.disconnect()
            intersectionObserver.disconnect()
            window.removeEventListener('resize', throttledResize)
            if (resizeTimeout) {
                clearTimeout(resizeTimeout)
            }
            container.removeEventListener("mousemove", onMove)
            container.removeEventListener("mouseenter", onEnter)
            container.removeEventListener("mouseleave", onLeave)
            geometry.dispose()
            material.dispose()
            renderer.dispose()
        }
            }, [radius, blur, circleBoost, noiseFreq, noiseStrength, timeSpeed, preview, imageBase?.positionX, imageBase?.positionY, imageHover?.positionX, imageHover?.positionY])

    return (
        <div 
            ref={containerRef} 
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...props.style
            }}
        >
            {/* Base image - always visible */}
            <figure style={{
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                flex: "0 0 auto",
                margin: 0,
                padding: 0,
                position: "absolute",
                zIndex: 1,
            }}>
                <img
                    ref={imgRef}
                    src={imageBase?.src}
                    srcSet={imageBase?.srcSet}
                    alt={imageBase?.alt || "Base image"}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `${imageBase?.positionX || "50%"} ${imageBase?.positionY || "50%"}`,
                        margin: 0,
                        padding: 0
                    }}
                />
            </figure>
            
            {/* Hover image rendered by canvas - no DOM element needed */}
            
            {/* Three.js canvas - temporarily visible for debugging */}
            <canvas 
                ref={canvasRef} 
                id="stage" 
                style={{
                    position: "absolute",
                    inset:0,
                    width: "100%",
                    height: "100%",
                    zIndex: 3,
                    pointerEvents: "none",
                    opacity: 1 // Now renders the hover image directly
                }}
            />
        </div>
    )
}

addPropertyControls(Page, {
    preview: {
      type: ControlType.Boolean,
      title: "Preview",
      defaultValue: false,
      enabledTitle: "On",
      disabledTitle: "Off",
  },
    imageBase: {
        type: ControlType.ResponsiveImage,
        title: "Base",
    },
    imageHover: {
        type: ControlType.ResponsiveImage,
        title: "Hover",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 10,
        max: 1000,
        step: 10,
        defaultValue: 50,
        unit: "px",
    },
    blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        unit: "",
    },
    circleBoost: {
        type: ControlType.Number,
        title: "Boost",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        unit: "",
    },
    noiseFreq: {
        type: ControlType.Number,
        title: "Frequency",
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        unit: "",
        
    },
    noiseStrength: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.3,
        unit: "",
        
    },
    timeSpeed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 5,
        unit: "",
    },


})
