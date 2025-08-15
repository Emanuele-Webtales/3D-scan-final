'use client'

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Vertex shader (pass-through)
const vertexShader = /* glsl */ `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    vec3 pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

// Keep simplex noise inline to avoid bundler plugins; math matches the tutorial
const simplexNoise3D = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise3(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
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
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xzyw;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.xzyw;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
`

// Gooey fragment shader (reference gooeyShader.glsl adapted one-to-one)
const gooeyFragmentShader = /* glsl */ `
  precision highp float;
  const float PR = 1.0; // we'll pass device pixel ratio in u_res already

  uniform sampler2D u_map;
  uniform sampler2D u_hovermap;
  uniform float u_alpha;
  uniform float u_time;
  uniform float u_progressHover;
  uniform float u_progressClick;
  uniform vec2 u_res;
  uniform vec2 u_mouse;
  uniform vec2 u_ratio;
  uniform vec2 u_hoverratio;
  varying vec2 v_uv;

  ${simplexNoise3D}

  float circle(in vec2 _st, in float _radius, in float blurriness){
    vec2 dist = _st;
    return 1. - smoothstep(_radius-(_radius*blurriness), _radius+(_radius*blurriness), dot(dist,dist)*4.0);
  }

  void main() {
    vec2 resolution = u_res * PR;
    float time = u_time * 0.05;
    float progress = u_progressClick;

    float progressHover = u_progressHover;
    vec2 uv = v_uv;
    vec2 uv_h = v_uv;

    vec2 st = gl_FragCoord.xy / resolution.xy - vec2(.5);
    st.y *= resolution.y / resolution.x;

    vec2 mouse = vec2((u_mouse.x / u_res.x) * 2. - 1.,-(u_mouse.y / u_res.y) * 2. + 1.) * -.5;
    mouse.y *= resolution.y / resolution.x;

    vec2 cpos = st + mouse;

    float grd = 0.1 * progressHover;

    float sqr = 100. * ((smoothstep(0., grd, uv.x) - smoothstep(1. - grd, 1., uv.x)) * (smoothstep(0., grd, uv.y) - smoothstep(1. - grd, 1., uv.y))) - 10.;

    float c = circle(cpos, .04 * progressHover + progress * 0.8, 2.) * 50.;
    float c2 = circle(cpos, .01 * progressHover + progress * 0.5, 2.);

    float offX = uv.x + sin(uv.y + time * 2.);
    float offY = uv.y - time * .2 - cos(time * 2.) * 0.1;
    float nc = (snoise3(vec3(offX, offY, time * .5) * 8.)) * progressHover;
    float nh = (snoise3(vec3(offX, offY, time * .5 ) * 2.)) * .1;

    c2 = smoothstep(.1, .8, c2 * 5. + nc * 3. - 1.);

    uv_h -= vec2(0.5);
    uv_h *= 1. - u_progressHover * 0.1;
    uv_h += vec2(0.5);

    uv_h *= u_hoverratio;

    uv -= vec2(0.5);
    uv *= 1. - u_progressHover * 0.2;
    uv += mouse * 0.1 * u_progressHover;
    uv *= u_ratio;
    uv += vec2(0.5);

    vec4 color = vec4(0.0314, 0.0314, 0.2235, 1.);

    vec4 image = texture2D(u_map, uv);
    vec4 hover = texture2D(u_hovermap, uv_h + vec2(nh) * progressHover * (1. - progress));
    hover = mix(hover, color * hover, .8 * (1. - progress));

    float finalMask = smoothstep(.0, .1, sqr - c);

    image = mix(image, hover, clamp(c2 + progress, 0., 1.));

    gl_FragColor = vec4(image.rgb, u_alpha * finalMask);
  }
`



// R3F implementation removed; using raw Three.js in the Page component below.

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight, false)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x222222) // Dark gray background
    
    // Simplified camera setup - closer and simpler
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.set(0, 0, 5) // Much closer to the scene
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
    scene.add(ambientLight)
    
    console.log('Scene created, camera position:', camera.position)
    console.log('Camera FOV:', 45)

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
    const raycaster = new THREE.Raycaster()
    const pointerNDC = new THREE.Vector2()

    const loader = new THREE.TextureLoader()
    const baseURL = '/random-assets/profile-image.png'
    const hoverURL = '/random-assets/blue-profile-image.png'

    const makeFallbackTexture = (r: number, g: number, b: number) => {
      const data = new Uint8Array([r, g, b, 255])
      const tex = new THREE.DataTexture(data, 1, 1)
      tex.needsUpdate = true
      return tex
    }

    const loadTexture = (url: string, fallbackColor: [number, number, number]) =>
      new Promise<THREE.Texture>((resolve) => {
        loader.load(
          url,
          (tex) => {
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
            tex.needsUpdate = true
            resolve(tex)
          },
          undefined,
          () => {
            console.warn('Texture failed to load, using fallback:', url)
            resolve(makeFallbackTexture(...fallbackColor))
          }
        )
      })

    let material: THREE.Material | null = null
    let mesh: THREE.Mesh | null = null

    const uniforms = {
      u_map: { value: null as unknown as THREE.Texture },
      u_hovermap: { value: null as unknown as THREE.Texture },
      u_alpha: { value: 1.0 },
      u_time: { value: 0 },
      u_progressHover: { value: 1.0 },
      u_progressClick: { value: 0.0 },
      u_res: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_ratio: { value: new THREE.Vector2(1, 1) },
      u_hoverratio: { value: new THREE.Vector2(1, 1) },
    }

              const setup = async () => {
      try {
        console.log('Loading textures...')
        const [baseTex, hoverTex] = await Promise.all([
          loadTexture(baseURL, [30, 30, 60]),
          loadTexture(hoverURL, [200, 120, 120]),
        ])
        console.log('Textures loaded:', baseTex, hoverTex)
        
        uniforms.u_map.value = baseTex
        uniforms.u_hovermap.value = hoverTex

        const planeWidth = 8.0  // Much larger plane
        const planeHeight = 6.0  // Much larger plane

        // Try shader material first, fallback to basic material if it fails
        try {
          material = new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader: gooeyFragmentShader,
            transparent: true,
          })
          console.log('Shader material created successfully')
        } catch (shaderError) {
          console.error('Shader material failed, using fallback:', shaderError)
          material = new THREE.MeshBasicMaterial({ 
            map: baseTex,
            transparent: true,
            opacity: 0.8
          })
        }
        


        mesh = new THREE.Mesh(geometry, material)
        mesh.scale.set(planeWidth, planeHeight, 1)
        scene.add(mesh)
        
        console.log('Mesh added to scene:', mesh)
        console.log('Scene children count:', scene.children.length)
      } catch (error) {
        console.error('Setup error:', error)
      }
    }

    const updateResolutionUniform = () => {
      const dpr = renderer.getPixelRatio()
      const w = container.clientWidth * dpr
      const h = container.clientHeight * dpr
      uniforms.u_res.value.set(w, h)
      // compute image cover ratios similar to reference to avoid distortion
      if (uniforms.u_map.value) {
        const tex = uniforms.u_map.value as THREE.Texture
        const iw = tex.image?.width || 1
        const ih = tex.image?.height || 1
        const containerRatio = w / h
        const imageRatio = iw / ih
        const coverX = containerRatio > imageRatio ? containerRatio / imageRatio : 1.0
        const coverY = containerRatio > imageRatio ? 1.0 : imageRatio / containerRatio
        uniforms.u_ratio.value.set(coverX, coverY)
        uniforms.u_hoverratio.value.set(coverX, coverY)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const dpr = renderer.getPixelRatio()
      
      // Debug mouse coordinates
      console.log('Mouse position:', { clientX: e.clientX, clientY: e.clientY, rect: { left: rect.left, top: rect.top } })
      console.log('Relative position:', { x, y })
      
      // Update mouse in pixel coordinates (shader expects pixels)
      if (material && 'uniforms' in material) {
        const shaderMaterial = material as THREE.ShaderMaterial
        if (shaderMaterial.uniforms && shaderMaterial.uniforms.u_mouse) {
          shaderMaterial.uniforms.u_mouse.value.set(x * dpr, y * dpr)
          console.log('Updated mouse uniform (pixels):', x * dpr, y * dpr)
        }
      }
    }
    const onResize = () => {
      const wCss = container.clientWidth
      const hCss = container.clientHeight
      renderer.setSize(wCss, hCss, false)
      camera.aspect = wCss / hCss
      camera.updateProjectionMatrix()
      updateResolutionUniform()
    }

    container.addEventListener('pointermove', onPointerMove)
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize)
      resizeObserver.observe(container)
    } else {
      window.addEventListener('resize', onResize)
    }

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (material && 'uniforms' in material) {
        const shaderMaterial = material as THREE.ShaderMaterial
        if (shaderMaterial.uniforms && shaderMaterial.uniforms.u_time) {
          shaderMaterial.uniforms.u_time.value += 0.016
        }
      }
      
      // Debug: log scene state
      if (scene.children.length > 0) {
        console.log('Rendering frame, scene children:', scene.children.length)
      }
      
      renderer.render(scene, camera)
    }

    ;(async () => {
      try {
        await setup()
        updateResolutionUniform()
        tick()
      } catch (err) {
        console.error('LiquidMask initialization failed:', err)
      }
    })()

    return () => {
      cancelAnimationFrame(raf)
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', onResize)
      }
      container.removeEventListener('pointermove', onPointerMove)
      if (mesh) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else {
          ;(mesh.material as THREE.Material).dispose()
        }
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', padding:"120px 400px", background: '#05051c', position: 'relative' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', zIndex:1000, height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', opacity: 0.7, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        Hover to reveal, click to intensify
      </div>
    </div>
  )
}
