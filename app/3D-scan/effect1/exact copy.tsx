/**
 * 3D Scanning Effect with Mouse Control
 *
 * This component creates a 3D scanning effect that responds to mouse position.
 * The scanning effect progresses from top to bottom as the mouse moves down the page.
 *
 * Key Concepts:
 * - Three.js/React Three Fiber: 3D graphics library for web
 * - Shaders: GPU code that processes each pixel (written in TSL - Three.js Shader Language)
 * - Uniforms: Values passed from JavaScript to the GPU shader
 * - useFrame: Hook that runs every frame (60fps) for animations
 * - useTexture: Hook that loads image textures asynchronously
 * - useMemo: React hook for performance optimization
 *
 * The effect uses:
 * - A depth map to create 3D-like displacement
 * - A noise pattern for the scanning dots
 * - Mouse position to control scanning progress
 * - Framer Motion for smooth animations
 *
 * Combined Effects:
 * - Effect1: Original dot/line scanning with mouse control
 * - Effect2: Edge detection neon effect
 * - Effect3: Cross pattern scanning effect
 * 
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1600
 * @framerIntrinsicHeight 900
 * @framerDisableUnlink
 */


import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';

//-----------------------------------
// WE NEED TO BUNDLE THESE LIBRARIES IN A SINGLE FILE AND USE IT IN THE FRAMER PROJECT
//-----------------------------------


//FOR FRAMER: Import from bundles
import {
    THREE,
    WebGPURenderer,
    MeshBasicNodeMaterial,
    PostProcessing,
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/npm-bundles/three-core-bundle/dist/bundle.js"

import {
    useFrame,
    Canvas,
    useThree,
    extend,
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/npm-bundles/react-three-fiber-bundle/dist/bundle.js"

import {
    useAspect,
    useTexture,
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/npm-bundles/react-three-drei-bundle/dist/bundle.js"

import {
    bloom,
    pass,
    abs,
    blendScreen,
    float,
    Fn,
    max,
    mod,
    mx_cell_noise_float,
    oneMinus,
    select,
    ShaderNode,
    smoothstep,
    sub,
    texture,
    uniform,
    uv,
    vec2,
    vec3,
} from "https://cdn.jsdelivr.net/gh/Emanuele-Webtales/npm-bundles/three-tsl-bundle/dist/bundle.js"


//-----------------------------------
// Import Framer Property Controls
//-----------------------------------
import { addPropertyControls, ControlType } from "framer";

// Font definition - currently unused but kept for potential future use
// const tomorrow = Tomorrow({
// 	weight: '600',
// 	subsets: ['latin'],
// });

const WIDTH = 1600 ;
const HEIGHT = 900;

// Custom cross pattern function from effect3
const sdCross = Fn(
  ([p_immutable, b_immutable, r_immutable]: any[]) => {
    const r = float(r_immutable).toVar();
    const b = vec2(b_immutable).toVar();
    const p = vec2(p_immutable).toVar();
    p.assign(abs(p));
    p.assign(select(p.y.greaterThan(p.x), p.yx, p.xy));
    const q = vec2(p.sub(b)).toVar();
    const k = float(max(q.y, q.x)).toVar();
    const w = vec2(
      select(k.greaterThan(0.0), q, vec2(b.y.sub(p.x), k.negate()))
    ).toVar();
    const d = float(max(w, 0.0).length()).toVar();

    return select(k.greaterThan(0.0), d, d.negate()).add(r);
  }
);

// Debug controls interface - defines all the properties we can control
interface DebugControls {
	// Visual controls
	showImage: boolean;
	showDebugInfo: boolean;
	showControls: boolean;
	
	// Scan type and properties
	scanType: 'gradient' | 'dots' | 'cross'; // Removed 'edge'
	scanColor: [number, number, number];
	scanIntensity: number;
	
	// Type-specific properties
	gradientWidth: number;
	tilingAmount: number;
	dotSize: number;
	crossSize: number;
	crossThickness: number;
	
	// Hover options
	hoverEnabled: boolean;
	progressDirection: 'topToBottom' | 'bottomToTop' | 'leftToRight' | 'rightToLeft' | 'centerOutward' | 'outwardToCenter';
	
	// Loop options
	loopEnabled: boolean;
	loopType: 'oneShot' | 'repeat' | 'mirror';
	loopDuration: number;
	loopEasing: string;
}

// Mobile/touch detection hook (from pixelate component)
const useIsMobile = () => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkIsMobile = () => {
			// Check for touch capability and screen size
			const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
			const isSmallScreen = window.innerWidth <= 810;
			setIsMobile(hasTouch || isSmallScreen);
		};

		checkIsMobile();
		window.addEventListener('resize', checkIsMobile);
		
		return () => window.removeEventListener('resize', checkIsMobile);
	}, []);

	return isMobile;
};

// Inline WebGPUCanvas component
const WebGPUCanvas = (props: any) => {
  return (
    <Canvas
      {...props}
      flat
      gl={async (glProps: any) => {
        const renderer = new THREE.WebGPURenderer(glProps as any);
        await renderer.init();
        return renderer;
      }}
    >
      {props.children}
    </Canvas>
  );
};

// Inline PostProcessing component
const PostProcessing = ({
  strength = 1,
  threshold = 1,
}: {
  strength?: number;
  threshold?: number;
}) => {
  const { gl, scene, camera } = useThree();

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as any);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const final = scenePassColor.add(bloomPass);

    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold]);

  useFrame(() => {
    render.renderAsync();
  }, 1);

  return null;
};

// Scene component that renders the 3D scanning effect
// This component handles the Three.js material creation and uniform updates
const Scene = ({ 
	progress, 
	controls,
	textureMap,
	depthMap
}: { 
	progress: number;
	controls: DebugControls;
	textureMap?: any;
	depthMap?: any;
}) => {
	const [isLoading, setIsLoading] = useState(true);
	const [rawMap, setRawMap] = useState<any>(null);
	const [depthTexture, setDepthTexture] = useState<any>(null);

	// Manual texture loading to avoid useTexture hook issues
	useEffect(() => {
		const loader = new THREE.TextureLoader();
		let loadedCount = 0;
		const totalTextures = 2;
		
		const checkAllLoaded = () => {
			loadedCount++;
			if (loadedCount === totalTextures) {
				setIsLoading(false);
			}
		};
		
		if (textureMap?.src) {
			loader.load(textureMap.src, (texture: any) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				setRawMap(texture);
				checkAllLoaded();
			}, undefined, (error: any) => {
				console.error('Error loading texture map:', error);
				checkAllLoaded();
			});
		} else {
			checkAllLoaded();
		}
		
		if (depthMap?.src) {
			loader.load(depthMap.src, (texture: any) => {
				setDepthTexture(texture);
				checkAllLoaded();
			}, undefined, (error: any) => {
				console.error('Error loading depth map:', error);
				checkAllLoaded();
			});
		} else {
			checkAllLoaded();
		}
	}, [textureMap?.src, depthMap?.src]);

	// Return early if textures aren't loaded yet or required textures are missing
	if (!rawMap || !depthTexture) {
		return (
			<mesh>
				<planeGeometry />
				<meshBasicMaterial color={isLoading ? "gray" : "black"} />
			</mesh>
		);
	}

	// useMemo is used to create the material and uniforms only when dependencies change
	// This is important for performance in Three.js applications
	const { material, uniforms } = useMemo(() => {
		// Create uniforms - these are values that can be updated from JavaScript
		// and passed to the shader (GPU code)
		const uPointer = uniform(new THREE.Vector2(0)); // Mouse position
		const uProgress = uniform(0); // Scanning progress (0 to 1)

		// Strength of the displacement effect - fixed for now
		const strength = 0.01; // TODO: Make this configurable in UI

		// Create texture nodes from the maps
		const tDepthMap = texture(depthTexture);

		// Create the main texture with displacement based on depth
		// uv() gives us the current pixel coordinates (0-1 range)
		// We add a displacement based on the depth map and mouse position
		const tMap = !controls.showImage 
			? vec3(0, 0, 0) // Black background when images are hidden
			: texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)));

		// Calculate aspect ratio to maintain proper proportions
		const aspect = float(WIDTH).div(HEIGHT);
		// Create UV coordinates that account for aspect ratio
		const tUv = vec2(uv().x.mul(aspect), uv().y);

		// Get the depth value for the current pixel
		const depth = tDepthMap;

		// Create the scanning flow effect based on mode
		let flow;
		let mask;
		
		if (controls.scanType === 'dots') {
			// Dot-based scanning effect
			const tiling = vec2(controls.tilingAmount);
			const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

			// Generate noise for brightness variation
			const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2)).mul(0.1); // Fixed noise intensity

			// Calculate distance from center of each tile
			const dist = float(tiledUv.length());
			// Create dots using smoothstep - creates smooth circular shapes
			const dot = float(smoothstep(controls.dotSize, controls.dotSize - 0.01, dist)).mul(brightness);

			flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));
			// Apply color and intensity (reduced impact for dots mode)
			const dotsIntensity = controls.scanIntensity * 0.5;
			mask = dot.mul(flow).mul(vec3(...controls.scanColor)).mul(dotsIntensity);
		} else if (controls.scanType === 'gradient') {
			// Gradient line mode - central band at full opacity, linear falloff to 0.05
			const gradientWidth = float(controls.gradientWidth);
			
			// Use depth map to determine which band we're in
			const exactProgress = abs(depth.r.sub(uProgress));
			
			// Scale the gradient width to be less sensitive
			// The depth map values are very small, so we need to scale the gradient width accordingly
			const scaledGradientWidth = gradientWidth.mul(0.1); // Scale down by 100x
			
			// Opacity pattern:
			// - Current progress band (exactProgress = 0): opacity = 1.0
			// - Bands within gradientWidth range: linear interpolation from 1.0 to 0.05
			// - Bands outside gradientWidth range: opacity = 0.0
			
			// Check if we're at the current progress band
			const isCurrentBand = exactProgress.lessThanEqual(0.001);
			
			// Check if we're within the gradient width range
			const isWithinGradientRange = exactProgress.lessThanEqual(scaledGradientWidth);
			
			// Calculate linear interpolation for bands within range
			// exactProgress goes from 0 to scaledGradientWidth
			// We want opacity to go from 1.0 to 0.05
			const normalizedDistance = exactProgress.div(scaledGradientWidth);
			const interpolatedOpacity = oneMinus(normalizedDistance).mul(0.95).add(0.05);
			
			// Set opacity: 1.0 for current band, interpolated for bands within range, 0.0 for others
			const opacity = select(
				isCurrentBand,
				1.0, // Current band
				select(
					isWithinGradientRange,
					interpolatedOpacity, // Linear interpolation from 1.0 to 0.05
					0.0  // Bands outside gradient width
				)
			);
			
			// Apply color and intensity (reduced impact for gradient mode)
			const reducedIntensity = controls.scanIntensity * 0.04;
			mask = opacity.mul(vec3(...controls.scanColor)).mul(reducedIntensity);
		} else if (controls.scanType === 'cross') {
			// Cross pattern mode
			const tiling = vec2(controls.tilingAmount);
			const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

			const crossParams = vec2(float(controls.crossSize), float(controls.crossThickness));
			const dist = sdCross(tiledUv, crossParams, float(0.0));
			const cross = vec3(smoothstep(0.0, 0.02, dist));

			flow = sub(1, smoothstep(0, 0.02, abs(depth.sub(uProgress))));
			// Apply color and intensity (further reduced impact for cross mode)
			const crossIntensity = controls.scanIntensity * 0.1;
			mask = oneMinus(cross).mul(flow).mul(vec3(...controls.scanColor)).mul(crossIntensity);
		}

		// Blend the original texture with the scanning mask
		// blendScreen creates a bright overlay effect
		//@ts-ignore
		const final = blendScreen(tMap, mask);

		// Create the material that will render our effect
		// MeshBasicNodeMaterial is a material that uses node-based shaders
		const material = new THREE.MeshBasicNodeMaterial({
			colorNode: final, // Our final color calculation
		});

		return {
			material,
			uniforms: {
				uPointer,
				uProgress,
			},
		};
	}, [rawMap, depthTexture, controls]); // Updated dependencies

	// Manual aspect calculation to avoid useAspect hook
	const aspect = WIDTH / HEIGHT;
	const [w, h] = [aspect, 1];

	// useFrame is a React Three Fiber hook that runs every frame (60fps)
	// This is where we update the uniforms based on mouse position
	useFrame(() => {
		// Update the progress uniform with the current progress value
		// This controls where the scanning effect is active
		uniforms.uProgress.value = progress;
	});

	return (
		<mesh scale={[w, h, 1]} material={material}>
			<planeGeometry />
		</mesh>
	);
};

// Debug Controls Panel Component
const DebugPanel = ({ 
	controls, 
	setControls 
}: { 
	controls: DebugControls;
	setControls: (controls: DebugControls) => void;
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const isMobile = useIsMobile();

	const updateControl = (key: keyof DebugControls, value: any) => {
		setControls({ ...controls, [key]: value });
	};

	if (!controls.showControls) return null;

	return (
		/**
		 * The debug panel UI
		 */
		<div style={{
			position: 'fixed',
			top: '1rem',
			bottom: '1rem',
			overflowY: 'scroll',
			left: '1rem',
			backgroundColor: 'rgba(0, 0, 0, 0.6)',
			backdropFilter: 'blur(4px)',
			color: 'white',
			padding: '1rem',
			borderRadius: '0.5rem',
			fontSize: '0.875rem',
			fontFamily: 'monospace',
			zIndex: 50,
			maxWidth: '20rem'
		}}>
			{/* Header with collapse toggle */}
			<div style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				marginBottom: '1rem'
			}}>
				<h3 style={{
					fontWeight: 'bold',
					fontSize: '1.125rem'
				}}>Debug Controls</h3>
				<button 
					onClick={() => setIsCollapsed(!isCollapsed)}
					style={{
						fontSize: '0.75rem',
						backgroundColor: '#374151',
						padding: '0.25rem 0.5rem',
						borderRadius: '0.25rem',
						border: 'none',
						color: 'white',
						cursor: 'pointer'
					}}
				>
					{isCollapsed ? '▼' : '▲'}
				</button>
			</div>

			{!isCollapsed && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					{/* Visual Controls */}
					<div style={{
						borderBottom: '1px solid #4B5563',
						paddingBottom: '0.5rem'
					}}>
						<h4 style={{
							fontWeight: '600',
							marginBottom: '0.5rem'
						}}>Visual Controls</h4>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
							<label style={{ display: 'flex', alignItems: 'center' }}>
								<input
									type="checkbox"
									checked={controls.showImage}
									onChange={(e) => updateControl('showImage', e.target.checked)}
									style={{ marginRight: '0.5rem' }}
								/>
								Show Image
							</label>
							<label style={{ display: 'flex', alignItems: 'center' }}>
								<input
									type="checkbox"
									checked={controls.showDebugInfo}
									onChange={(e) => updateControl('showDebugInfo', e.target.checked)}
									style={{ marginRight: '0.5rem' }}
								/>
								Show Debug Info
							</label>
							<label style={{ display: 'flex', alignItems: 'center' }}>
								<input
									type="checkbox"
									checked={controls.showControls}
									onChange={(e) => updateControl('showControls', e.target.checked)}
									style={{ marginRight: '0.5rem' }}
								/>
								Show Controls
							</label>
						</div>
					</div>

					{/* Scan Type and Properties */}
					<div style={{
						borderBottom: '1px solid #4B5563',
						paddingBottom: '0.5rem'
					}}>
						<h4 style={{
							fontWeight: '600',
							marginBottom: '0.5rem'
						}}>Scan Type</h4>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
							<div>
								<label style={{
									display: 'block',
									fontSize: '0.75rem',
									marginBottom: '0.25rem'
								}}>Type</label>
								<select
									value={controls.scanType}
									onChange={(e) => updateControl('scanType', e.target.value as 'gradient' | 'dots' | 'cross')}
									style={{
										width: '100%',
										backgroundColor: '#374151',
										color: 'white',
										padding: '0.25rem 0.5rem',
										borderRadius: '0.25rem',
										fontSize: '0.75rem',
										border: 'none'
									}}
								>
									<option value="gradient">Gradient</option>
									<option value="dots">Dots</option>
									<option value="cross">Cross</option>
								</select>
							</div>
							
							<div>
								<label style={{
									display: 'block',
									fontSize: '0.75rem',
									marginBottom: '0.25rem'
								}}>Scan Intensity: {controls.scanIntensity.toFixed(2)}</label>
								<input
									type="range"
									min="0"
									max="5"
									step="0.05"
									value={controls.scanIntensity}
									onChange={(e) => updateControl('scanIntensity', parseFloat(e.target.value))}
									style={{ width: '100%' }}
								/>
							</div>
							
							<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
								<label style={{
									display: 'block',
									fontSize: '0.75rem',
									marginBottom: '0.25rem'
								}}>Scan Color (R, G, B)</label>
								<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
									<input
										type="range"
										min="0"
										max="20"
										step="0.5"
										value={controls.scanColor[0]}
										onChange={(e) => updateControl('scanColor', [parseFloat(e.target.value), controls.scanColor[1], controls.scanColor[2]])}
										style={{ flex: 1 }}
									/>
									<input
										type="range"
										min="0"
										max="20"
										step="0.5"
										value={controls.scanColor[1]}
										onChange={(e) => updateControl('scanColor', [controls.scanColor[0], parseFloat(e.target.value), controls.scanColor[2]])}
										style={{ flex: 1 }}
									/>
									<input
										type="range"
										min="0"
										max="20"
										step="0.5"
										value={controls.scanColor[2]}
										onChange={(e) => updateControl('scanColor', [controls.scanColor[0], controls.scanColor[1], parseFloat(e.target.value)])}
										style={{ flex: 1 }}
									/>
								</div>
							</div>

							{/* Type-specific controls */}
							{controls.scanType === 'gradient' && (
								<div>
									<label style={{
										display: 'block',
										fontSize: '0.75rem',
										marginBottom: '0.25rem'
									}}>Gradient Width: {controls.gradientWidth.toFixed(2)}</label>
									<input
										type="range"
										min="0"
										max="5.0"
										step="0.1"
										value={controls.gradientWidth}
										onChange={(e) => updateControl('gradientWidth', parseFloat(e.target.value))}
										style={{ width: '100%' }}
									/>
								</div>
							)}

							{controls.scanType !== 'gradient' && (
								<div>
									<label style={{
										display: 'block',
										fontSize: '0.75rem',
										marginBottom: '0.25rem'
									}}>Tiling Amount: {controls.tilingAmount.toFixed(0)}</label>
									<input
										type="range"
										min="10"
										max="200"
										step="5"
										value={controls.tilingAmount}
										onChange={(e) => updateControl('tilingAmount', parseFloat(e.target.value))}
										style={{ width: '100%' }}
									/>
								</div>
							)}

							{controls.scanType === 'dots' && (
								<div>
									<label style={{
										display: 'block',
										fontSize: '0.75rem',
										marginBottom: '0.25rem'
									}}>Dot Size: {controls.dotSize.toFixed(3)}</label>
									<input
										type="range"
										min="0.1"
										max="0.9"
										step="0.01"
										value={controls.dotSize}
										onChange={(e) => updateControl('dotSize', parseFloat(e.target.value))}
										style={{ width: '100%' }}
									/>
								</div>
							)}

							{controls.scanType === 'cross' && (
								<>
									<div>
										<label style={{
											display: 'block',
											fontSize: '0.75rem',
											marginBottom: '0.25rem'
										}}>Cross Size: {controls.crossSize.toFixed(2)}</label>
										<input
											type="range"
											min="0.1"
											max="0.8"
											step="0.01"
											value={controls.crossSize}
											onChange={(e) => updateControl('crossSize', parseFloat(e.target.value))}
											style={{ width: '100%' }}
										/>
									</div>
									<div>
										<label style={{
											display: 'block',
											fontSize: '0.75rem',
											marginBottom: '0.25rem'
										}}>Cross Thickness: {controls.crossThickness.toFixed(3)}</label>
										<input
											type="range"
											min="0.01"
											max="0.1"
											step="0.001"
											value={controls.crossThickness}
											onChange={(e) => updateControl('crossThickness', parseFloat(e.target.value))}
											style={{ width: '100%' }}
										/>
									</div>
								</>
							)}
						</div>
					</div>

					{/* Hover Options */}
					<div style={{
						borderBottom: '1px solid #4B5563',
						paddingBottom: '0.5rem'
					}}>
						<h4 style={{
							fontWeight: '600',
							marginBottom: '0.5rem'
						}}>Hover Options</h4>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
							<label style={{ display: 'flex', alignItems: 'center' }}>
								<input
									type="checkbox"
									checked={controls.hoverEnabled}
									onChange={(e) => updateControl('hoverEnabled', e.target.checked)}
									style={{ marginRight: '0.5rem' }}
								/>
								Enable Hover {isMobile && "(Disabled on mobile)"}
							</label>
							
							{controls.hoverEnabled && !isMobile && (
								<div>
									<label style={{
										display: 'block',
										fontSize: '0.75rem',
										marginBottom: '0.25rem'
									}}>Progress Direction</label>
									<select
										value={controls.progressDirection}
										onChange={(e) => updateControl('progressDirection', e.target.value)}
										style={{
											width: '100%',
											backgroundColor: '#374151',
											color: 'white',
											padding: '0.25rem 0.5rem',
											borderRadius: '0.25rem',
											fontSize: '0.75rem',
											border: 'none'
										}}
									>
										<option value="topToBottom">Top to Bottom</option>
										<option value="bottomToTop">Bottom to Top</option>
										<option value="leftToRight">Left to Right</option>
										<option value="rightToLeft">Right to Left</option>
										<option value="centerOutward">Center Outward</option>
										<option value="outwardToCenter">Outward to Center</option>
									</select>
								</div>
							)}
						</div>
					</div>

					{/* Loop Options */}
					<div>
						<h4 style={{
							fontWeight: '600',
							marginBottom: '0.5rem'
						}}>Loop Options</h4>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
							<label style={{ display: 'flex', alignItems: 'center' }}>
								<input
									type="checkbox"
									checked={controls.loopEnabled}
									onChange={(e) => updateControl('loopEnabled', e.target.checked)}
									style={{ marginRight: '0.5rem' }}
								/>
								Loop
							</label>
							
							{controls.loopEnabled && (
								<>
									<div>
										<label style={{
											display: 'block',
											fontSize: '0.75rem',
											marginBottom: '0.25rem'
										}}>Loop Type</label>
										<select
											value={controls.loopType}
											onChange={(e) => updateControl('loopType', e.target.value)}
											style={{
												width: '100%',
												backgroundColor: '#374151',
												color: 'white',
												padding: '0.25rem 0.5rem',
												borderRadius: '0.25rem',
												fontSize: '0.75rem',
												border: 'none'
											}}
										>
											<option value="oneShot">One Shot</option>
											<option value="repeat">Repeat</option>
											<option value="mirror">Mirror</option>
										</select>
									</div>
									<div>
										<label style={{
											display: 'block',
											fontSize: '0.75rem',
											marginBottom: '0.25rem'
										}}>Loop Duration: {controls.loopDuration}s</label>
										<input
											type="range"
											min="0.5"
											max="10"
											step="0.1"
											value={controls.loopDuration}
											onChange={(e) => updateControl('loopDuration', parseFloat(e.target.value))}
											style={{ width: '100%' }}
										/>
									</div>
									<div>
										<label style={{
											display: 'block',
											fontSize: '0.75rem',
											marginBottom: '0.25rem'
										}}>Loop Easing</label>
										<input
											type="text"
											value={controls.loopEasing}
											onChange={(e) => updateControl('loopEasing', e.target.value)}
											placeholder="e.g. power2.inOut, elastic.out"
											style={{
												width: '100%',
												backgroundColor: '#374151',
												color: 'white',
												padding: '0.25rem 0.5rem',
												borderRadius: '0.25rem',
												fontSize: '0.75rem',
												border: 'none'
											}}
										/>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// Html component that handles the UI layout and mouse tracking
// This component manages the overall page structure and mouse interactions
const Html = ({ textureMap, depthMap, style }: { textureMap?: any; depthMap?: any; style?: React.CSSProperties }) => {
	const [isLoading, setIsLoading] = useState(true);
	const isMobile = useIsMobile();
	
	// State to track mouse position and progress
	const [mouseY, setMouseY] = useState(0);
	const [progress, setProgress] = useState(0);
	const [isHovering, setIsHovering] = useState(false);
	const [loopProgress, setLoopProgress] = useState(0); // Track loop progress separately
	const [transitionComplete, setTransitionComplete] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionStartProgress, setTransitionStartProgress] = useState(0);
	const [transitionStartTime, setTransitionStartTime] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const loopAnimation = useAnimation();
	const loopProgressMotion = useMotionValue(0);

	// Debug controls state
	const [controls, setControls] = useState<DebugControls>({
		// Visual controls
		showImage: true,
		showDebugInfo: true,
		showControls: true,
		
		// Scan type and properties
		scanType: 'gradient',
		scanColor: [3, 3, 3],
		scanIntensity: 0.4,
		
		// Type-specific properties
		gradientWidth: 0.0,
		tilingAmount: 120,
		dotSize: 0.5,
		crossSize: 0.3,
		crossThickness: 0.02,
		
		// Hover options (disabled on mobile automatically)
		hoverEnabled: !isMobile,
		progressDirection: 'topToBottom',
		
		// Loop options
		loopEnabled: false,
		loopType: 'repeat',
		loopDuration: 3,
		loopEasing: 'power2.inOut',
	});

	// Convert GSAP easing to Framer Motion easing
	const getEasing = (easing: string) => {
		switch (easing) {
			case 'power2.inOut': return 'easeInOut';
			case 'power2.in': return 'easeIn';
			case 'power2.out': return 'easeOut';
			case 'power1.inOut': return 'easeInOut';
			case 'power1.in': return 'easeIn';
			case 'power1.out': return 'easeOut';
			default: return 'easeInOut'; // Default to power2.inOut
		}
	};

	// Loop animation with Framer Motion
	useEffect(() => {
		if (!controls.loopEnabled) {
			loopAnimation.stop();
			return;
		}

		// Stop any existing animation
		loopAnimation.stop();

		const animateLoop = async () => {
			const repeatCount = controls.loopType === 'repeat' ? Infinity : 
							   controls.loopType === 'oneShot' ? 0 : Infinity;
			
			await loopAnimation.start({
				x: [0, 1],
				transition: {
					duration: controls.loopDuration,
					ease: getEasing(controls.loopEasing),
					repeat: repeatCount,
					repeatType: controls.loopType === 'mirror' ? 'reverse' : 'loop',
				}
			});
		};

		animateLoop();

		return () => {
			loopAnimation.stop();
		};
	}, [controls.loopEnabled, controls.loopDuration, controls.loopType, controls.loopEasing, loopAnimation]);

	// Update progress based on loop animation
	useEffect(() => {
		const unsubscribe = loopProgressMotion.on('change', (latest) => {
			setLoopProgress(latest);
			// Only set the main progress if not hovering
			if (!isHovering) {
				setProgress(latest);
			}
		});

		return unsubscribe;
	}, [loopProgressMotion, isHovering]);

	// Handle hover state changes for loop animation control
	useEffect(() => {
		if (!controls.loopEnabled) return;
		
		if (isHovering && controls.hoverEnabled && !isMobile) {
			loopAnimation.stop();
		}
		// Don't auto-resume here - let handleMouseLeave handle it
	}, [isHovering, controls.hoverEnabled, controls.loopEnabled, isMobile, loopAnimation]);

	// Handle mouse movement to control the scanning effect
	const handleMouseMove = (e: React.MouseEvent) => {
		if (!containerRef.current || !controls.hoverEnabled || isMobile) return;
		
		// Get the bounding rectangle of the container
		const rect = containerRef.current.getBoundingClientRect();
		
		// Calculate progress based on direction
		let relativeProgress: number;
		
		switch (controls.progressDirection) {
			case 'topToBottom':
				relativeProgress = (e.clientY - rect.top) / rect.height;
				break;
			case 'bottomToTop':
				relativeProgress = 1 - (e.clientY - rect.top) / rect.height;
				break;
			case 'leftToRight':
				relativeProgress = (e.clientX - rect.left) / rect.width;
				break;
			case 'rightToLeft':
				relativeProgress = 1 - (e.clientX - rect.left) / rect.width;
				break;
			case 'centerOutward':
				const centerX = rect.width / 2;
				const centerY = rect.height / 2;
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;
				const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
				const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
				relativeProgress = Math.min(distance / maxDistance, 1);
				break;
			case 'outwardToCenter':
				const centerX2 = rect.width / 2;
				const centerY2 = rect.height / 2;
				const mouseX2 = e.clientX - rect.left;
				const mouseY2 = e.clientY - rect.top;
				const distance2 = Math.sqrt(Math.pow(mouseX2 - centerX2, 2) + Math.pow(mouseY2 - centerY2, 2));
				const maxDistance2 = Math.sqrt(Math.pow(centerX2, 2) + Math.pow(centerY2, 2));
				relativeProgress = 1 - Math.min(distance2 / maxDistance2, 1);
				break;
			default:
				relativeProgress = (e.clientY - rect.top) / rect.height;
		}
		
		// Clamp the value between 0 and 1
		const clampedProgress = Math.max(0, Math.min(1, relativeProgress));
		
		setMouseY(clampedProgress);
		
		// Handle smooth transition during hover
		if (isHovering) {
			if (controls.loopEnabled && isTransitioning) {
				// During transition from loop to hover, continuously update target and interpolate
				const elapsed = (Date.now() - transitionStartTime) / 1000;
				const transitionProgress = Math.min(elapsed / 0.3, 1);
		
				// Apply ease-in-out easing
				const easedProgress = transitionProgress < 0.5
					? 2 * transitionProgress * transitionProgress 
					: 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2;
				
				// Smooth interpolation from start to current target
				const interpolatedProgress = transitionStartProgress + (clampedProgress - transitionStartProgress) * easedProgress;
				setProgress(interpolatedProgress);
				
				// Check if transition is complete
				if (transitionProgress >= 1) {
					setIsTransitioning(false);
					setTransitionComplete(true);
				}
			} else if (controls.loopEnabled && transitionComplete) {
				// After transition from loop, follow cursor instantly
				setProgress(clampedProgress);
			} else if (!controls.loopEnabled) {
				// No loop active - direct cursor following
				setProgress(clampedProgress);
			}
		}
	};

	// Handle mouse entering the container
	const handleMouseEnter = () => {
		if (!controls.hoverEnabled || isMobile) return;
		setIsHovering(true);
		
		// If loop is active, start transition from current progress to hover
		if (controls.loopEnabled) {
			setTransitionComplete(false);
			setIsTransitioning(true);
			setTransitionStartProgress(progress);
			setTransitionStartTime(Date.now());
		}
	};

	// Handle mouse leaving the container
	const handleMouseLeave = () => {
		if (!controls.hoverEnabled || isMobile) return;
		setIsHovering(false);
		setTransitionComplete(false);
		setIsTransitioning(false);
		
		if (controls.loopEnabled) {
			// Set the loop progress to match current progress
			setLoopProgress(progress);
			// Resume the loop animation from current position
			loopAnimation.set({ x: progress });
			loopAnimation.start({
				x: [progress, 1],
				transition: {
					duration: controls.loopDuration * (1 - progress),
					ease: getEasing(controls.loopEasing),
					repeat: controls.loopType === 'repeat' ? Infinity : 
						   controls.loopType === 'oneShot' ? 0 : Infinity,
					repeatType: controls.loopType === 'mirror' ? 'reverse' : 'loop',
				}
			});
		}
	};

	// Loading animations with Framer Motion
	useEffect(() => {
		if (!isLoading) {
			// Note: The loading animations are currently commented out in the JSX
			// If you want to add them back, you can use motion components
			// For example: <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
		}
	}, [isLoading]);

	return (
		<div style={{
			...style,
			display: 'flex',
			backgroundColor: '#78716C',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			width: '100%',
			height: '100%',
			minHeight: '400px'
		}}>
			{/* Hidden motion div to track loop animation progress */}
			<motion.div
				style={{ display: 'none' }}
				animate={loopAnimation}
				onUpdate={(latest) => {
					if (typeof latest.x === 'number') {
						loopProgressMotion.set(latest.x);
					}
				}}
			/>
			
			{/* Debug Controls Panel */}
			<DebugPanel controls={controls} setControls={setControls} />
			
			{/* Main container with mouse tracking */}
			<div 
				style={{
					borderRadius: '1.5rem',
					overflow: 'hidden',
					position: 'relative',
					width: '100%',
					height: '100%',
					maxWidth: '1600px',
					maxHeight: '900px'
				}}
				ref={containerRef}
				onMouseMove={handleMouseMove}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
		

				{/* Three.js canvas with progress control */}
				<WebGPUCanvas>
					<PostProcessing />
					{/* Pass the progress value and controls to the Scene component */}
					<Scene progress={progress} controls={controls} textureMap={textureMap} depthMap={depthMap} />
				</WebGPUCanvas>
				
				{/* Debug indicator - shows current progress value */}
				{controls.showDebugInfo && (
					<div style={{
						position: 'fixed',
						top: '1rem',
						right: '1rem',
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						color: 'white',
						padding: '0.5rem 0.75rem',
						borderRadius: '0.25rem',
						fontSize: '0.875rem',
						fontFamily: 'monospace',
						zIndex: 50
					}}>
						<div>Progress: {(progress * 100).toFixed(1)}%</div>
						{controls.loopEnabled && <div>Loop Progress: {(loopProgress * 100).toFixed(1)}%</div>}
						<div>Mouse Y: {(mouseY * 100).toFixed(1)}%</div>
						<div>Loop: {controls.loopEnabled ? 'ON' : 'OFF'}</div>
						<div>Hover: {controls.hoverEnabled && !isMobile ? (isHovering ? 'ACTIVE' : 'ON') : 'OFF'}</div>
						{controls.loopEnabled && (
							<div>Animation: {isHovering ? 'PAUSED' : 'PLAYING'}</div>
						)}
						<div>Transitioning: {isTransitioning ? 'YES' : 'NO'}</div>
						<div>Mobile: {isMobile ? 'YES' : 'NO'}</div>
						<div>Type: {controls.scanType}</div>
						<div>Direction: {controls.progressDirection}</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default function ThreeDScanEffect(props: {
	textureMap?: any;
	depthMap?: any;
	style?: React.CSSProperties;
}) {
	const { textureMap, depthMap, style } = props;
	return (
		<Html textureMap={textureMap} depthMap={depthMap} style={style} />
	);
}

// Add Property Controls for Framer
addPropertyControls(ThreeDScanEffect, {
	textureMap: {
		type: ControlType.ResponsiveImage,
		title: "Texture Map",
		description: "The main texture image for the 3D scan effect"
	},
	depthMap: {
		type: ControlType.ResponsiveImage,
		title: "Depth Map",
		description: "The depth map image that controls the 3D displacement effect"
	}
});
