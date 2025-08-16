'use client'

import { useEffect, useRef } from "react"

// LIBRARIES WE NEED TO BUNDLE
// import {
//     Renderer,
//     Camera,
//     Mesh,
//     Plane,
//     Program,
//     RenderTarget,
//     resolveLygia,
//     Pane,
// } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/ascii-bundle.js"

import { Renderer, Camera, Mesh, Plane, Program, RenderTarget } from 'ogl';
import { resolveLygia } from 'resolve-lygia';
import { Pane } from 'tweakpane';
import { RenderTarget as FramerRenderTarget } from 'framer';

// Check if we're running in Framer's canvas environment
const isFramerCanvas = typeof window !== 'undefined' && FramerRenderTarget.current() === FramerRenderTarget.canvas;


// Inline shader sources to avoid special bundler config
const perlinVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`

const perlinFragmentShader = `#version 300 es
precision mediump float;
uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
in vec2 vUv;
out vec4 fragColor;

#include "lygia/generative/cnoise.glsl"

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float hue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
  vec3 rainbowColor = hsv2rgb(vec3(hue, 1.0, uValue));
  fragColor = vec4(rainbowColor, 1.0);
}`

const asciiVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`

const asciiFragmentShader = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform vec3 uBgColor;
uniform int uUseCustomPalette; // 0: Rainbow (use texture color), 1: Custom palette
uniform int uPaletteCount; // 1..3
uniform vec3 uPalette1;
uniform vec3 uPalette2;
uniform vec3 uPalette3;
uniform float uCellSize; // character cell size in pixels (base)
uniform float uGamma; // grayscale gamma
uniform float uPaletteBias; // shifts palette mapping -0.5..0.5
out vec4 fragColor;

float character(int n, vec2 p) {
  p = floor(p * vec2(-4.0, 4.0) + 2.5);
  if(clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
    int a = int(round(p.x) + 5.0 * round(p.y));
    if(((n >> a) & 1) == 1) return 1.0;
  }
  return 0.0;
}

void main() {
  vec2 pix = gl_FragCoord.xy;
  float quant = max(uCellSize * 2.0, 1.0);
  vec3 col = texture(uTexture, floor(pix / quant) * quant / uResolution.xy).rgb;
  float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
  gray = pow(clamp(gray, 0.0001, 1.0), uGamma);
  int n = 4096;
  if(gray > 0.2) n = 65600;
  if(gray > 0.3) n = 163153;
  if(gray > 0.4) n = 15255086;
  if(gray > 0.5) n = 13121101;
  if(gray > 0.6) n = 15252014;
  if(gray > 0.7) n = 13195790;
  if(gray > 0.8) n = 11512810;
  float cell = max(uCellSize, 1.0);
  vec2 p = mod(pix / cell, 2.0) - vec2(1.0);
  float charAlpha = character(n, p);
  
  float g = clamp(gray + uPaletteBias, 0.0, 1.0);
  vec3 paletteColor;
  if (uPaletteCount <= 1) {
    paletteColor = uPalette1;
  } else if (uPaletteCount == 2) {
    paletteColor = mix(uPalette1, uPalette2, g);
  } else {
    float t = g * 2.0;
    paletteColor = mix(uPalette1, uPalette2, clamp(t, 0.0, 1.0));
    paletteColor = mix(paletteColor, uPalette3, clamp(t - 1.0, 0.0, 1.0));
  }

  vec3 charColor = (uUseCustomPalette == 1) ? paletteColor : col;
  vec3 asciiCol = mix(uBgColor, charColor, charAlpha);
  fragColor = vec4(asciiCol, 1.0);
}`

export default function Page() {
    const canvasContainerRef = useRef<HTMLDivElement | null>(null)
    const paneContainerRef = useRef<HTMLDivElement | null>(null)
    const staticCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // If we're in Framer's canvas, show a static preview
    if (isFramerCanvas) {
        useEffect(() => {
            const canvas = staticCanvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Set canvas size
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height

            // Generate static perlin-like noise
            const width = canvas.width
            const height = canvas.height
            const cellSize = 8
            const cols = Math.ceil(width / cellSize)
            const rows = Math.ceil(height / cellSize)

            // Simple noise generation for static preview
            const noise = (x: number, y: number) => {
                const n = Math.sin(x * 0.1) * Math.cos(y * 0.1) + 
                          Math.sin(x * 0.05 + y * 0.05) * 0.5
                return (n + 1) / 2 // Normalize to 0-1
            }

            // Draw background
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, width, height)

            // Draw ASCII characters
            ctx.font = `${cellSize}px monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * cellSize
                    const y = j * cellSize
                    
                    // Generate noise value for this cell
                    const noiseVal = noise(i * 0.5, j * 0.5)
                    
                    // Select character based on brightness
                    const chars = " .:-=+*#%@"
                    let charIndex = 0
                    if (noiseVal > 0.2) charIndex = 1
                    if (noiseVal > 0.3) charIndex = 2
                    if (noiseVal > 0.4) charIndex = 3
                    if (noiseVal > 0.5) charIndex = 4
                    if (noiseVal > 0.6) charIndex = 5
                    if (noiseVal > 0.7) charIndex = 6
                    if (noiseVal > 0.8) charIndex = 7
                    
                    const char = chars[charIndex]
                    
                    // Set color based on noise value
                    const brightness = Math.floor(noiseVal * 255)
                    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
                    
                    // Draw character
                    ctx.fillText(char, x + cellSize/2, y + cellSize/2)
                }
            }
        }, [])

        return (
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    background: "#000",
                }}
            >
                <canvas
                    ref={staticCanvasRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                    }}
                />
            </div>
        )
    }

    useEffect(() => {
        let rafId = 0
        let resizeHandler: (() => void) | null = null

        const container = canvasContainerRef.current
        if (!container) return

        const renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio || 1, 2),
        })
        const gl = renderer.gl
        container.appendChild(gl.canvas)

        const camera = new Camera(gl, { near: 0.1, far: 100 })
        camera.position.set(0, 0, 3)

        const doResize = () => {
            const width = container.clientWidth || window.innerWidth
            const height = container.clientHeight || window.innerHeight
            renderer.setSize(width, height)
            camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
        }
        resizeHandler = doResize
        window.addEventListener("resize", doResize)
        doResize()

        // Perlin noise pass
        const perlinProgram = new Program(gl, {
            vertex: perlinVertexShader,
            fragment: resolveLygia(perlinFragmentShader),
            uniforms: {
                uTime: { value: 0 },
                uFrequency: { value: 5.0 },
                uSpeed: { value: 0.75 },
                uValue: { value: 1.0 },
            },
        })

        const perlinMesh = new Mesh(gl, {
            geometry: new Plane(gl, { width: 2, height: 2 }),
            program: perlinProgram,
        })

        const renderTarget = new RenderTarget(gl)

        // ASCII pass
        const DEFAULT_BG_COLOR: [number, number, number] = [0.0, 0.0, 0.0] // edit me
        const DEFAULT_P1: [number, number, number] = [1.0, 1.0, 1.0]
        const DEFAULT_P2: [number, number, number] = [1.0, 0.5, 0.0]
        const DEFAULT_P3: [number, number, number] = [0.2, 0.6, 1.0]
        const asciiProgram = new Program(gl, {
            vertex: asciiVertexShader,
            fragment: asciiFragmentShader,
            uniforms: {
                uResolution: { value: [gl.canvas.width, gl.canvas.height] },
                uTexture: { value: renderTarget.texture },
                uBgColor: { value: DEFAULT_BG_COLOR },
                uUseCustomPalette: { value: 0 },
                uPaletteCount: { value: 3 },
                uPalette1: { value: DEFAULT_P1 },
                uPalette2: { value: DEFAULT_P2 },
                uPalette3: { value: DEFAULT_P3 },
                uCellSize: { value: 8.0 },
                uGamma: { value: 1.0 },
                uPaletteBias: { value: 0.0 },
            },
        })

        const asciiMesh = new Mesh(gl, {
            geometry: new Plane(gl, { width: 2, height: 2 }),
            program: asciiProgram,
        })

        // Controls
        let pane: any | null = null
        if (paneContainerRef.current) {
            pane = new Pane({ container: paneContainerRef.current } as any)
            ;(pane as any).addBinding(
                perlinProgram.uniforms.uFrequency,
                "value",
                { min: 0, max: 10, label: "Frequency" }
            )
            ;(pane as any).addBinding(perlinProgram.uniforms.uSpeed, "value", {
                min: 0,
                max: 2,
                label: "Speed",
            })
            

            const uiParams: any = {
                mode: "Rainbow" as "Rainbow" | "Custom",
                paletteCount: 3,
                bgColor: {
                    r: (asciiProgram.uniforms.uBgColor.value as number[])[0],
                    g: (asciiProgram.uniforms.uBgColor.value as number[])[1],
                    b: (asciiProgram.uniforms.uBgColor.value as number[])[2],
                },
                color1: { r: DEFAULT_P1[0], g: DEFAULT_P1[1], b: DEFAULT_P1[2] },
                color2: { r: DEFAULT_P2[0], g: DEFAULT_P2[1], b: DEFAULT_P2[2] },
                color3: { r: DEFAULT_P3[0], g: DEFAULT_P3[1], b: DEFAULT_P3[2] },
            }

            const bgBinding: any = (pane as any).addBinding(uiParams, "bgColor", {
                color: { type: "float" },
                label: "Background",
            })
            bgBinding.on("change", (ev: any) => {
                asciiProgram.uniforms.uBgColor.value = [
                    ev.value.r,
                    ev.value.g,
                    ev.value.b,
                ]
            })

            const modeBinding: any = (pane as any).addBinding(uiParams, "mode", {
                options: { Rainbow: "Rainbow", Custom: "Custom" },
                label: "Characters",
            })
            modeBinding.on("change", (ev: any) => {
                const isCustom = ev.value === "Custom"
                asciiProgram.uniforms.uUseCustomPalette.value = isCustom ? 1 : 0
                paletteCountBinding.hidden = !isCustom
                color1Binding.hidden = !isCustom
                color2Binding.hidden = !isCustom || uiParams.paletteCount < 2
                color3Binding.hidden = !isCustom || uiParams.paletteCount < 3
            })

            const paletteCountBinding: any = (pane as any).addBinding(
                uiParams,
                "paletteCount",
                { min: 1, max: 3, step: 1, label: "Palette Size" }
            )
            paletteCountBinding.on("change", (ev: any) => {
                const count = ev.value as number
                asciiProgram.uniforms.uPaletteCount.value = count
                color2Binding.hidden = uiParams.mode !== "Custom" || count < 2
                color3Binding.hidden = uiParams.mode !== "Custom" || count < 3
            })

            const color1Binding: any = (pane as any).addBinding(
                uiParams,
                "color1",
                { color: { type: "float" }, label: "Color 1" }
            )
            color1Binding.on("change", (ev: any) => {
                asciiProgram.uniforms.uPalette1.value = [
                    ev.value.r,
                    ev.value.g,
                    ev.value.b,
                ]
            })

            const color2Binding: any = (pane as any).addBinding(
                uiParams,
                "color2",
                { color: { type: "float" }, label: "Color 2" }
            )
            color2Binding.on("change", (ev: any) => {
                asciiProgram.uniforms.uPalette2.value = [
                    ev.value.r,
                    ev.value.g,
                    ev.value.b,
                ]
            })

            const color3Binding: any = (pane as any).addBinding(
                uiParams,
                "color3",
                { color: { type: "float" }, label: "Color 3" }
            )
            color3Binding.on("change", (ev: any) => {
                asciiProgram.uniforms.uPalette3.value = [
                    ev.value.r,
                    ev.value.g,
                    ev.value.b,
                ]
            })

            // Initialize hidden states based on defaults
            paletteCountBinding.hidden = uiParams.mode !== "Custom"
            color1Binding.hidden = uiParams.mode !== "Custom"
            color2Binding.hidden =
                uiParams.mode !== "Custom" || uiParams.paletteCount < 2
            color3Binding.hidden =
                uiParams.mode !== "Custom" || uiParams.paletteCount < 3

            // ASCII shader extra controls
            const cellSizeBinding: any = (pane as any).addBinding(
                asciiProgram.uniforms.uCellSize,
                "value",
                { min: 4, max: 48, step: 1, label: "Cell Size" }
            )
            const gammaBinding: any = (pane as any).addBinding(
                asciiProgram.uniforms.uGamma,
                "value",
                { min: 0.5, max: 2.5, step: 0.01, label: "Contrast" }
            )

            const paletteBiasBinding: any = (pane as any).addBinding(
                asciiProgram.uniforms.uPaletteBias,
                "value",
                { min: -0.5, max: 0.5, step: 0.01, label: "Palette Balance" }
            )
        }

        let lastTime = 0
        const frameInterval = 1000 / 30 // 30 FPS

        const update = (time: number) => {
            rafId = requestAnimationFrame(update)
            if (time - lastTime < frameInterval) return
            lastTime = time

            const elapsedTime = time * 0.001
            perlinProgram.uniforms.uTime.value = elapsedTime

            // Render to offscreen
            renderer.render({ scene: perlinMesh, camera, target: renderTarget })

            // Render ASCII to screen
            asciiProgram.uniforms.uResolution.value = [
                gl.canvas.width,
                gl.canvas.height,
            ]
            renderer.render({ scene: asciiMesh, camera })
        }
        rafId = requestAnimationFrame(update)

        return () => {
            cancelAnimationFrame(rafId)
            if (resizeHandler)
                window.removeEventListener("resize", resizeHandler)
            if (pane) pane.dispose()
            if (gl && gl.canvas && gl.canvas.parentElement === container) {
                container.removeChild(gl.canvas)
            }
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                width: "100vw",
                height: "100vh",
                background: "#000",
            }}
        >
            <div
                ref={canvasContainerRef}
                style={{ position: "absolute", inset: 0 }}
            />
            <div
                ref={paneContainerRef}
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    pointerEvents: "auto",
                    zIndex: 10,
                }}
            />
        </div>
    )
}
