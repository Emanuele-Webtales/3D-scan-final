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
    imageScale?: number
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
 */
export default function Page(props: Props) {
    const { 
        imageBase, 
        imageHover, 
        radius = 0.1,
        blur = 2.0,
        circleBoost = 2.5,
        noiseFreq = 8.0,
        noiseStrength = 0.6,
        timeSpeed = 0.1,
        imageScale = 1.05
    } = props
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const uniformsRef = useRef<any>(null)

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

        const loader = new TextureLoader()
        const baseSrc =
            imgEl.getAttribute("src") || "/random-assets/profile-image.png"
        const hoverSrc =
            imgEl.getAttribute("data-hover") ||
            "/random-assets/blue-profile-image.png"
        const baseTexture = loader.load(baseSrc, (tex: any) => {
            const w = (tex.image && tex.image.width) || 1
            const h = (tex.image && tex.image.height) || 1
            if (uniformsRef.current?.u_texResBase?.value)
                uniformsRef.current.u_texResBase.value.set(w, h)
        })
        const hoverTexture = loader.load(hoverSrc, (tex: any) => {
            const w = (tex.image && tex.image.width) || 1
            const h = (tex.image && tex.image.height) || 1
            if (uniformsRef.current?.u_texResHover?.value)
                uniformsRef.current.u_texResHover.value.set(w, h)
        })
        // Color space for modern three versions
        // @ts-ignore - guard older versions
        if (SRGBColorSpace) {
            // @ts-ignore
            baseTexture.colorSpace = SRGBColorSpace
            // @ts-ignore
            hoverTexture.colorSpace = SRGBColorSpace
        }
        baseTexture.minFilter = LinearFilter
        hoverTexture.minFilter = LinearFilter

        const uniforms: { [key: string]: any } = {
            u_time: { value: 0 },
            u_image: { value: baseTexture },
            u_imagehover: { value: hoverTexture },
            u_mouse: { value: new Vector2(0.5, 0.5) },
            u_progress: { value: 0 },
            u_resolution: {
                value: new Vector2(containerRect.width, containerRect.height),
            },
            u_res: {
                value: new Vector2(containerRect.width, containerRect.height),
            },
            u_pr: { value: Math.min(window.devicePixelRatio || 1, 2) },
            u_planeRes: { value: new Vector2(1, 1) },
            u_radius: { value: radius },
            u_blur: { value: blur },
            u_circleBoost: { value: circleBoost },
            u_noiseFreq: { value: noiseFreq },
            u_noiseStrength: { value: noiseStrength },
            u_timeSpeed: { value: timeSpeed },
            u_scaleMax: { value: imageScale },
            u_distortAmp: { value: 0.0 }, // keep defined, neutralized
            u_distortFreq: { value: 0.0 }, // keep defined, unused
            u_texResBase: { value: new Vector2(1, 1) },
            u_texResHover: { value: new Vector2(1, 1) },
            u_imagePosBase: { value: new Vector2(
                parseFloat(imageBase?.positionX || "50%") / 100,
                1.0 - parseFloat(imageBase?.positionY || "50%") / 100
            ) },
            u_imagePosHover: { value: new Vector2(
                parseFloat(imageHover?.positionX || "50%") / 100,
                1.0 - parseFloat(imageHover?.positionY || "50%") / 100
            ) },
        }
        uniformsRef.current = uniforms

        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

        // Simplex noise (3D) adapted for GLSL1
        const fragmentShader = `
      precision highp float;
      varying vec2 vUv;
      uniform float u_time;
      uniform sampler2D u_image;
      uniform sampler2D u_imagehover;
      uniform vec2 u_mouse;
      uniform float u_progress;
      uniform vec2 u_res;
      uniform float u_pr;
      uniform vec2 u_planeRes;
      uniform float u_radius;
      uniform float u_blur;
      uniform float u_circleBoost;
      uniform float u_noiseFreq;
      uniform float u_noiseStrength;
      uniform float u_timeSpeed;
      uniform float u_scaleMax;
    //   uniform float u_distortAmp;
    //   uniform float u_distortFreq;
      uniform vec2 u_texResBase;
      uniform vec2 u_texResHover;
      uniform vec2 u_imagePosBase;
      uniform vec2 u_imagePosHover;

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

        //  x0 = x0 - 0.0 + 0.0 * C.xxx;
        //  x1 = x0 - i1  + 1.0 * C.xxx;
        //  x2 = x0 - i2  + 2.0 * C.xxx;
        //  x3 = x0 - 1.0 + 3.0 * C.xxx;
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

      // Tutorial circle implementation in centered coordinates
      float circle_tutorial(vec2 _st, float _radius, float blurriness){
        vec2 dist = _st;
        return 1.0 - smoothstep(
          _radius - (_radius * blurriness),
          _radius + (_radius * blurriness),
          dot(dist, dist) * 4.0
        );
      }

      void main() {
        // Texture coordinates
        // Distortion (small flow field) on UVs for both textures
        vec2 uv = vUv;
        // float d1 = snoise(vec3(uv * u_distortFreq, u_time * 0.25));
        // float d2 = snoise(vec3((uv + 10.0) * (u_distortFreq * 0.7), u_time * 0.23));
        // vec2 flow = vec2(d1, d2) * u_distortAmp * u_progress;
        vec2 uvDistorted = uv;

        // Plane-centered coordinates (match tutorial logic but in local plane space)
        // Rebuild st from the distorted UVs so the gooey mask is also affected
        vec2 st = vUv - vec2(0.5);
        st.y *= u_planeRes.y / u_planeRes.x;
        vec2 stDist = uvDistorted - vec2(0.5);
        stDist.y *= u_planeRes.y / u_planeRes.x;

        // Adjust mouse to plane-centered/aspect-corrected coords
        vec2 mouse = (u_mouse - vec2(0.5));
        mouse.y *= u_planeRes.y / u_planeRes.x;
        mouse *= -1.0;

        vec2 circlePos = stDist + mouse;

         // Animated noise with lateral (left-right) drift
        float offx = uvDistorted.x + (u_time * 0.1) + sin(uvDistorted.y + u_time * 0.1);
        float offy = uvDistorted.y - cos(u_time * 0.001) * 0.01;
        float n = snoise(vec3(offx * u_noiseFreq, offy * u_noiseFreq, u_time * (u_timeSpeed * 0.1))) - 1.0;

        // Circle and merge using the tutorial's parameters
        float c = circle_tutorial(circlePos, u_radius, u_blur) * u_circleBoost * u_progress;
        float finalMask = smoothstep(0.4, 0.5, (n * u_noiseStrength) + pow(c, 2.0));

        // Subtle scale on hover image
        vec2 center = vec2(0.5);
        float scale = mix(1.0, u_scaleMax, u_progress);
        vec2 uvScaled = (uvDistorted - center) / scale + center;

        // cover-fit UVs (center-crop to square plane) with proper positioning
        vec2 coverBase;
        {
          float planeRatio = u_planeRes.x / u_planeRes.y;
          float texRatio = u_texResBase.x / u_texResBase.y;
          vec2 s = vec2(1.0);
          if (texRatio > planeRatio) {
            s.x = texRatio / planeRatio;
          } else {
            s.y = planeRatio / texRatio;
          }
          // Apply image positioning offset
          vec2 offset = (u_imagePosBase - vec2(0.5)) * (s - 1.0);
          coverBase = (uvDistorted - 0.5) * s + 0.5 + offset;
        }
        vec2 coverHover;
        {
          float planeRatio = u_planeRes.x / u_planeRes.y;
          float texRatio = u_texResHover.x / u_texResHover.y;
          vec2 s = vec2(1.0);
          if (texRatio > planeRatio) {
            s.x = texRatio / planeRatio;
          } else {
            s.y = planeRatio / texRatio;
          }
          // Apply image positioning offset and scaling
          vec2 offset = (u_imagePosHover - vec2(0.5)) * (s - 1.0);
          coverHover = (uvScaled - 0.5) * s + 0.5 + offset;
        }

        vec4 img = texture2D(u_image, coverBase);
        vec4 hover = texture2D(u_imagehover, coverHover);
        
        // Make the entire shader output transparent so only the DOM image shows through
        // Only show the hover image in the gooey effect areas
        vec4 color = vec4(0.0, 0.0, 0.0, 0.0); // Completely transparent
        
        // Only show hover image where the gooey mask exists
        if (finalMask > 0.01) { // Small threshold to avoid artifacts
            color = hover;
            color.a = finalMask; // Use mask value for alpha
        }
        
        gl_FragColor = color;
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
            const rect = imgEl.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            sizes.set(rect.width, rect.height)
            offset.set(
                rect.left + rect.width / 2 - containerRect.left - containerRect.width / 2,
                -(rect.top + rect.height / 2 - containerRect.top - containerRect.height / 2)
            )
            mesh.position.set(offset.x, offset.y, 0)
            mesh.scale.set(sizes.x, sizes.y, 1)
            uniforms.u_planeRes.value.set(rect.width, rect.height)
        }
        updateFromDOM()

        let targetProgress = 0
        let rafId = 0
        const clock = new Clock()

        const render = () => {
            rafId = requestAnimationFrame(render)
            uniforms.u_time.value += clock.getDelta()
            // Update uniforms with current prop values
            uniforms.u_radius.value = radius
            uniforms.u_blur.value = blur
            uniforms.u_circleBoost.value = circleBoost
            uniforms.u_noiseFreq.value = noiseFreq
            uniforms.u_noiseStrength.value = noiseStrength
            uniforms.u_timeSpeed.value = timeSpeed
            uniforms.u_scaleMax.value = imageScale
            // ease progress
            uniforms.u_progress.value +=
                (targetProgress - uniforms.u_progress.value) * 0.08
            renderer.render(scene, camera)
        }
        render()

        const onResize = () => {
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
        }
        
        // Use ResizeObserver instead of window resize for container changes
        const resizeObserver = new ResizeObserver(onResize)
        resizeObserver.observe(container)

        const onMove = (e: MouseEvent) => {
            const rect = imgEl.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = 1 - (e.clientY - rect.top) / rect.height
            uniforms.u_mouse.value.set(
                Math.max(0.0, Math.min(1.0, x)),
                Math.max(0.0, Math.min(1.0, y))
            )
        }
        const onEnter = () => {
            targetProgress = 1
        }
        const onLeave = () => {
            targetProgress = 0
        }

        imgEl.addEventListener("mousemove", onMove)
        imgEl.addEventListener("mouseenter", onEnter)
        imgEl.addEventListener("mouseleave", onLeave)

        return () => {
            cancelAnimationFrame(rafId)
            resizeObserver.disconnect()
            imgEl.removeEventListener("mousemove", onMove)
            imgEl.removeEventListener("mouseenter", onEnter)
            imgEl.removeEventListener("mouseleave", onLeave)
            geometry.dispose()
            material.dispose()
            baseTexture.dispose()
            hoverTexture.dispose()
            renderer.dispose()
        }
    }, [radius, blur, circleBoost, noiseFreq, noiseStrength, timeSpeed, imageScale, imageBase?.positionX, imageBase?.positionY, imageHover?.positionX, imageHover?.positionY])

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
            {/* Show the DOM image in both canvas and preview modes with full opacity */}
            <figure style={{
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                flex: "0 0 auto",
                margin: 0,
                padding: 0,
                position: "absolute",
                zIndex: 1,
                opacity: 1, // Always show at full opacity
                pointerEvents: "auto" // Enable interactions
            }}>
                <img
                    ref={imgRef}
                    src={imageBase?.src}
                    srcSet={imageBase?.srcSet}
                    data-hover={imageHover?.src}
                    data-hover-srcset={imageHover?.srcSet}
                    alt={imageBase?.alt || "Profile"}
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
            
            {/* Three.js canvas - make it transparent so only the gooey effect is visible */}
            <canvas 
                ref={canvasRef} 
                id="stage" 
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 10,
                    pointerEvents: "none"
                }}
            />
        </div>
    )
}

addPropertyControls(Page, {
    imageBase: {
        type: ControlType.ResponsiveImage,
        title: "Base Image",
    },
    imageHover: {
        type: ControlType.ResponsiveImage,
        title: "Hover Image",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0.02,
        max: 0.35,
        step: 0.005,
        defaultValue: 0.1,
        unit: "",
        displayStepper: true,
    },
    blur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0.2,
        max: 3.0,
        step: 0.05,
        defaultValue: 2.0,
        unit: "",
        displayStepper: true,
    },
    circleBoost: {
        type: ControlType.Number,
        title: "Circle Boost",
        min: 0.5,
        max: 4.0,
        step: 0.05,
        defaultValue: 2.5,
        unit: "",
        displayStepper: true,
    },
    noiseFreq: {
        type: ControlType.Number,
        title: "Noise Frequency",
        min: 2.0,
        max: 16.0,
        step: 0.25,
        defaultValue: 8.0,
        unit: "",
        displayStepper: true,
    },
    noiseStrength: {
        type: ControlType.Number,
        title: "Noise Strength",
        min: 0.0,
        max: 3.0,
        step: 0.02,
        defaultValue: 0.6,
        unit: "",
        displayStepper: true,
    },
    timeSpeed: {
        type: ControlType.Number,
        title: "Time Speed",
        min: 0.02,
        max: 5.6,
        step: 0.01,
        defaultValue: 0.1,
        unit: "",
        displayStepper: true,
    },
    imageScale: {
        type: ControlType.Number,
        title: "Image Scale",
        min: 1.0,
        max: 1.5,
        step: 0.01,
        defaultValue: 1.05,
        unit: "",
        displayStepper: true,
    },
})
