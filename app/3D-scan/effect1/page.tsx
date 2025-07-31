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
 * - GSAP for smooth text animations
 * 
 * Combined Effects:
 * - Effect1: Original dot/line scanning with mouse control
 * - Effect2: Edge detection neon effect
 * - Effect3: Cross pattern scanning effect
 */

'use client';

import { WebGPUCanvas } from '@/app/3D-scan/3D-scan-components/canvas';
import { useAspect, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { Tomorrow } from 'next/font/google';
import gsap from 'gsap';

import {
  abs,
  blendScreen,
  float,
  Fn,
  max,
  mod,
  mx_cell_noise_float,
  oneMinus,
  select,
  ShaderNodeObject,
  smoothstep,
  sub,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';

import * as THREE from 'three/webgpu';
import { useGSAP } from '@gsap/react';
import { GlobalContext, ContextProvider } from '@/context';
import { PostProcessing } from '@/app/3D-scan/3D-scan-components/post-processing';
import TEXTUREMAP from '@/app/3D-scan/3D-scan-assets/raw-4.png';
import DEPTHMAP from '@/app/3D-scan/3D-scan-assets/depth-5.png';
import EDGEMAP from '@/app/3D-scan/3D-scan-assets/edge-2.png';

// Font definition - currently unused but kept for potential future use
// const tomorrow = Tomorrow({
// 	weight: '600',
// 	subsets: ['latin'],
// });

const WIDTH = 1600;
const HEIGHT = 900;

// Custom cross pattern function from effect3
const sdCross = Fn(
  ([p_immutable, b_immutable, r_immutable]: ShaderNodeObject<THREE.Node>[]) => {
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
	// Loop controls
	loopEnabled: boolean;
	loopDuration: number;
	
	// Scanning effect controls
	scanStrength: number;
	scanColor: [number, number, number];
	scanIntensity: number;
	scanMode: 'dots' | 'line' | 'edge' | 'cross';
	lineWidth: number;
	gradientWidth: number;
	
	// Tiling and pattern controls
	tilingAmount: number;
	dotSize: number;
	noiseIntensity: number;
	crossSize: number;
	crossThickness: number;
	
	// Mouse control
	mouseControlEnabled: boolean;
	autoProgress: boolean;
	autoProgressSpeed: number;
	hybridMode: boolean;
	
	// Visual controls
	showDebugInfo: boolean;
	showControls: boolean;
	hideImages: boolean;
	backgroundColor: [number, number, number];
}

// Scene component that renders the 3D scanning effect
// This component handles the Three.js material creation and uniform updates
const Scene = ({ 
	progress, 
	controls 
}: { 
	progress: number;
	controls: DebugControls;
}) => {
	const { setIsLoading } = useContext(GlobalContext);

	// useTexture is a React Three Fiber hook that loads textures asynchronously
	// It returns an array of textures and a callback when loading is complete
	const [rawMap, depthMap, edgeMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src, EDGEMAP.src], () => {
		setIsLoading(false);
		// Set the color space for proper color rendering
		rawMap.colorSpace = THREE.SRGBColorSpace;
	});

	// useMemo is used to create the material and uniforms only when dependencies change
	// This is important for performance in Three.js applications
	const { material, uniforms } = useMemo(() => {
		// Create uniforms - these are values that can be updated from JavaScript
		// and passed to the shader (GPU code)
		const uPointer = uniform(new THREE.Vector2(0)); // Mouse position
		const uProgress = uniform(0); // Scanning progress (0 to 1)

		// Strength of the displacement effect - now controlled by debug panel
		const strength = controls.scanStrength;

		// Create texture nodes from the maps
		const tDepthMap = texture(depthMap);
		const tEdgeMap = texture(edgeMap);

		// Create the main texture with displacement based on depth
		// uv() gives us the current pixel coordinates (0-1 range)
		// We add a displacement based on the depth map and mouse position
		const tMap = controls.hideImages 
			? vec3(...controls.backgroundColor) // Custom background color when images are hidden
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
		
		if (controls.scanMode === 'dots') {
			// Original dot-based scanning effect
			// Create a tiling pattern for the scanning effect - now controlled by debug panel
			// This creates a grid of dots that will be used as the scanning mask
			const tiling = vec2(controls.tilingAmount);
			// Create tiled UV coordinates and center them (-1 to 1 range)
			const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

			// Generate noise for brightness variation - now controlled by debug panel
			// This creates a subtle texture in the scanning effect
			const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2)).mul(controls.noiseIntensity);

			// Calculate distance from center of each tile
			const dist = float(tiledUv.length());
			// Create dots using smoothstep - creates smooth circular shapes
			// dotSize controls the size of the scanning dots
			const dot = float(smoothstep(controls.dotSize, controls.dotSize - 0.01, dist)).mul(brightness);

			flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));
			mask = dot.mul(flow).mul(vec3(...controls.scanColor)).mul(controls.scanIntensity);
		} else if (controls.scanMode === 'line') {
			// Simple clean line mode
			const gradientWidth = float(controls.gradientWidth);
			
			// Simple distance calculation from depth to progress
			const distanceFromProgress = abs(depth.r.sub(uProgress));
			
			// Create smooth line with gradient falloff
			const lineMask = oneMinus(smoothstep(0, gradientWidth, distanceFromProgress));
			
			// Apply color
			mask = lineMask.mul(vec3(...controls.scanColor));
		} else if (controls.scanMode === 'edge') {
			// Edge detection mode from effect2
			flow = sub(1, smoothstep(0, 0.02, abs(depth.sub(uProgress))));
			mask = oneMinus(tEdgeMap).mul(flow).mul(vec3(...controls.scanColor)).mul(controls.scanIntensity);
		} else if (controls.scanMode === 'cross') {
			// Cross pattern mode from effect3
			const tiling = vec2(controls.tilingAmount);
			const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

			const crossParams = vec2(float(controls.crossSize), float(controls.crossThickness));
			const dist = sdCross(tiledUv, crossParams, float(0.0));
			const cross = vec3(smoothstep(0.0, 0.02, dist));

			// Use regular depth instead of inverted depth to match other modes
			flow = sub(1, smoothstep(0, 0.02, abs(depth.sub(uProgress))));
			mask = oneMinus(cross).mul(flow).mul(vec3(...controls.scanColor)).mul(controls.scanIntensity);
		}

		// Blend the original texture with the scanning mask
		// blendScreen creates a bright overlay effect
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
	}, [rawMap, depthMap, edgeMap, controls]); // Add edgeMap and controls to dependencies

	// useAspect calculates the proper scale to maintain aspect ratio
	// This ensures the effect looks correct on different screen sizes
	const [w, h] = useAspect(WIDTH, HEIGHT);

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

	const updateControl = (key: keyof DebugControls, value: any) => {
		setControls({ ...controls, [key]: value });
	};

	if (!controls.showControls) return null;

	return (
		/**
		 * The debug panel UI
		 */
		<div className="fixed top-4 bottom-4 overflow-y-scroll left-4 bg-black/60 backdrop-blur-sm bg-opacity-80 text-white p-4 rounded-lg text-sm font-mono z-50 max-w-80">
			{/* Header with collapse toggle */}
			<div className="flex justify-between items-center mb-4">
				<h3 className="font-bold text-lg">Debug Controls</h3>
				<button 
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="text-xs bg-gray-700 px-2 py-1 rounded"
				>
					{isCollapsed ? '▼' : '▲'}
				</button>
			</div>

			{!isCollapsed && (
				<div className="space-y-4">
					{/* Loop Controls */}
					<div className="border-b border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Loop Controls</h4>
						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.loopEnabled}
									onChange={(e) => updateControl('loopEnabled', e.target.checked)}
									className="mr-2"
								/>
								Loop Enabled
							</label>
							<div>
								<label className="block text-xs mb-1">Loop Duration: {controls.loopDuration}s</label>
								<input
									type="range"
									min="1"
									max="10"
									step="0.1"
									value={controls.loopDuration}
									onChange={(e) => updateControl('loopDuration', parseFloat(e.target.value))}
									className="w-full"
								/>
							</div>
						</div>
					</div>

					{/* Scanning Effect Controls */}
					<div className="border-b flex flex-col gap-2 border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Scanning Effect</h4>
						<div className="space-y-2">
							<div>
								<label className="block text-xs mb-1">Scan Mode</label>
								<select
									value={controls.scanMode}
									onChange={(e) => updateControl('scanMode', e.target.value as 'dots' | 'line' | 'edge' | 'cross')}
									className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
								>
									<option value="dots">Dots Pattern</option>
									<option value="line">Wide Line</option>
									<option value="edge">Edge Detection</option>
									<option value="cross">Cross Pattern</option>
								</select>
							</div>
							{controls.scanMode === 'line' && (
								<>
									<div>
										<label className="block text-xs mb-1">Line Width: {controls.lineWidth.toFixed(3)}</label>
										<input
											type="range"
											min="0.005"
											max="0.1"
											step="0.001"
											value={controls.lineWidth}
											onChange={(e) => updateControl('lineWidth', parseFloat(e.target.value))}
											className="w-full"
										/>
									</div>
									<div>
										<label className="block text-xs mb-1">Gradient Width: {controls.gradientWidth.toFixed(2)}</label>
										<input
											type="range"
											min="0.1"
											max="2.0"
											step="0.1"
											value={controls.gradientWidth}
											onChange={(e) => updateControl('gradientWidth', parseFloat(e.target.value))}
											className="w-full"
										/>
									</div>
								</>
							)}
							{controls.scanMode === 'cross' && (
								<>
									<div>
										<label className="block text-xs mb-1">Cross Size: {controls.crossSize.toFixed(2)}</label>
										<input
											type="range"
											min="0.1"
											max="0.8"
											step="0.01"
											value={controls.crossSize}
											onChange={(e) => updateControl('crossSize', parseFloat(e.target.value))}
											className="w-full"
										/>
									</div>
									<div>
										<label className="block text-xs mb-1">Cross Thickness: {controls.crossThickness.toFixed(3)}</label>
										<input
											type="range"
											min="0.01"
											max="0.1"
											step="0.001"
											value={controls.crossThickness}
											onChange={(e) => updateControl('crossThickness', parseFloat(e.target.value))}
											className="w-full"
										/>
									</div>
								</>
							)}
							<div>
								<label className="block text-xs mb-1">Scan Strength: {controls.scanStrength.toFixed(3)}</label>
								<input
									type="range"
									min="0"
									max="0.1"
									step="0.001"
									value={controls.scanStrength}
									onChange={(e) => updateControl('scanStrength', parseFloat(e.target.value))}
									className="w-full"
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">Scan Intensity: {controls.scanIntensity.toFixed(2)}</label>
								<input
									type="range"
									min="0"
									max="5"
									step="0.05"
									value={controls.scanIntensity}
									onChange={(e) => updateControl('scanIntensity', parseFloat(e.target.value))}
									className="w-full"
								/>
							</div>
							<div className='flex flex-col gap-2'>
								<label className="block text-xs mb-1">Scan Color (R, G, B)</label>
								<div className="flex flex-col space-x-2">
									<input
										type="range"
										min="0"
										max="20"
										step="0.5"
										value={controls.scanColor[0]}
										onChange={(e) => updateControl('scanColor', [parseFloat(e.target.value), controls.scanColor[1], controls.scanColor[2]])}
										className="flex-1"
									/>
									<input
										type="range"
										min="0"
										max="20"
										step="0.5"
										value={controls.scanColor[1]}
										onChange={(e) => updateControl('scanColor', [controls.scanColor[0], parseFloat(e.target.value), controls.scanColor[2]])}
										className="flex-1"
									/>
									<input
										type="range"
										min="0"
										max="20"
										step="0.5"
										value={controls.scanColor[2]}
										onChange={(e) => updateControl('scanColor', [controls.scanColor[0], controls.scanColor[1], parseFloat(e.target.value)])}
										className="flex-1"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Pattern Controls */}
					<div className="border-b border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Pattern Controls</h4>
						<div className="space-y-2">
							<div>
								<label className="block text-xs mb-1">Tiling Amount: {controls.tilingAmount.toFixed(0)}</label>
								<input
									type="range"
									min="10"
									max="200"
									step="5"
									value={controls.tilingAmount}
									onChange={(e) => updateControl('tilingAmount', parseFloat(e.target.value))}
									className="w-full"
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">Dot Size: {controls.dotSize.toFixed(3)}</label>
								<input
									type="range"
									min="0.1"
									max="0.9"
									step="0.01"
									value={controls.dotSize}
									onChange={(e) => updateControl('dotSize', parseFloat(e.target.value))}
									className="w-full"
								/>
							</div>
							<div>
								<label className="block text-xs mb-1">Noise Intensity: {controls.noiseIntensity.toFixed(2)}</label>
								<input
									type="range"
									min="0"
									max="2"
									step="0.1"
									value={controls.noiseIntensity}
									onChange={(e) => updateControl('noiseIntensity', parseFloat(e.target.value))}
									className="w-full"
								/>
							</div>
						</div>
					</div>

					{/* Mouse Control */}
					<div className="border-b border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Mouse Control</h4>
						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.mouseControlEnabled}
									onChange={(e) => updateControl('mouseControlEnabled', e.target.checked)}
									className="mr-2"
								/>
								Mouse Control Enabled
							</label>
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.autoProgress}
									onChange={(e) => updateControl('autoProgress', e.target.checked)}
									className="mr-2"
								/>
								Auto Progress
							</label>
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.hybridMode}
									onChange={(e) => updateControl('hybridMode', e.target.checked)}
									className="mr-2"
								/>
								Hybrid Mode (Auto + Cursor)
							</label>
							{(controls.autoProgress || controls.hybridMode) && (
								<div>
									<label className="block text-xs mb-1">Auto Progress Speed: {controls.autoProgressSpeed.toFixed(2)}</label>
									<input
										type="range"
										min="0.1"
										max="2"
										step="0.1"
										value={controls.autoProgressSpeed}
										onChange={(e) => updateControl('autoProgressSpeed', parseFloat(e.target.value))}
										className="w-full"
									/>
								</div>
							)}
						</div>
					</div>

					{/* Visual Controls */}
					<div>
						<h4 className="font-semibold mb-2">Visual Controls</h4>
						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.hideImages}
									onChange={(e) => updateControl('hideImages', e.target.checked)}
									className="mr-2"
								/>
								Hide Background Images
							</label>
							{controls.hideImages && (
								<div className="ml-4 space-y-2">
									<div className='flex flex-col gap-2'>
										<label className="block text-xs mb-1">Background Color (R, G, B)</label>
										<div className="flex flex-col space-x-2">
											<input
												type="range"
												min="0"
												max="1"
												step="0.1"
												value={controls.backgroundColor[0]}
												onChange={(e) => updateControl('backgroundColor', [parseFloat(e.target.value), controls.backgroundColor[1], controls.backgroundColor[2]])}
												className="flex-1"
											/>
											<input
												type="range"
												min="0"
												max="1"
												step="0.1"
												value={controls.backgroundColor[1]}
												onChange={(e) => updateControl('backgroundColor', [controls.backgroundColor[0], parseFloat(e.target.value), controls.backgroundColor[2]])}
												className="flex-1"
											/>
											<input
												type="range"
												min="0"
												max="1"
												step="0.1"
												value={controls.backgroundColor[2]}
												onChange={(e) => updateControl('backgroundColor', [controls.backgroundColor[0], controls.backgroundColor[1], parseFloat(e.target.value)])}
												className="flex-1"
											/>
										</div>
									</div>
								</div>
							)}
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.showDebugInfo}
									onChange={(e) => updateControl('showDebugInfo', e.target.checked)}
									className="mr-2"
								/>
								Show Debug Info
							</label>
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.showControls}
									onChange={(e) => updateControl('showControls', e.target.checked)}
									className="mr-2"
								/>
								Show Controls
							</label>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// Html component that handles the UI layout and mouse tracking
// This component manages the overall page structure and mouse interactions
const Html = () => {
	const { isLoading } = useContext(GlobalContext);
	
	// State to track mouse position and progress
	// mouseY: normalized mouse position (0-1, top to bottom)
	// progress: scanning progress (0-1, where 0 = no scan, 1 = full scan)
	const [mouseY, setMouseY] = useState(0);
	const [progress, setProgress] = useState(0);
	const [isHovering, setIsHovering] = useState(false);
	const [autoProgress, setAutoProgress] = useState(0);
	const [transitionComplete, setTransitionComplete] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionStartProgress, setTransitionStartProgress] = useState(0);
	const [transitionTargetProgress, setTransitionTargetProgress] = useState(0); // Used in hybrid mode calculations
	const [transitionStartTime, setTransitionStartTime] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	// Debug controls state
	const [controls, setControls] = useState<DebugControls>({
		// Loop controls
		loopEnabled: false,
		loopDuration: 3,
		
		// Scanning effect controls
		scanStrength: 0.01,
		scanColor: [3, 3, 3], // Very subtle white color for line mode
		scanIntensity: 0.4,
		scanMode: 'line',
		lineWidth: 0.005,
		gradientWidth: 0.05,
		
		// Tiling and pattern controls
		tilingAmount: 120,
		dotSize: 0.5,
		noiseIntensity: 0.1,
		crossSize: 0.3,
		crossThickness: 0.02,
		
		// Mouse control
		mouseControlEnabled: true,
		autoProgress: false,
		autoProgressSpeed: 0.5,
		hybridMode: false,
		
		// Visual controls
		showDebugInfo: true,
		showControls: true,
		hideImages: false,
		backgroundColor: [0, 0, 0], // Black background
	});

	// Auto progress animation
	useEffect(() => {
		if (!controls.autoProgress && !controls.hybridMode) return;

		let animationId: number;
		const startTime = Date.now();

		const animate = () => {
			const elapsed = (Date.now() - startTime) / 1000;
			const newProgress = (elapsed * controls.autoProgressSpeed) % 1;
			setAutoProgress(newProgress);
			if (!controls.hybridMode || !isHovering) {
				setProgress(newProgress);
			}
			animationId = requestAnimationFrame(animate);
		};

		animationId = requestAnimationFrame(animate);

		return () => {
			if (animationId) cancelAnimationFrame(animationId);
		};
	}, [controls.autoProgress, controls.autoProgressSpeed, controls.hybridMode, isHovering]);

	// Loop animation
	useEffect(() => {
		if (!controls.loopEnabled) return;

		const timeline = gsap.timeline({
			repeat: -1,
			yoyo: true,
		});

		timeline.to({}, {
			duration: controls.loopDuration,
			onUpdate: function() {
				setProgress(this.progress());
			}
		});

		return () => {
			timeline.kill();
		};
	}, [controls.loopEnabled, controls.loopDuration]);

	// Handle mouse movement to control the scanning effect
	const handleMouseMove = (e: React.MouseEvent) => {
		if (!containerRef.current || !controls.mouseControlEnabled) return;
		if (controls.autoProgress && !controls.hybridMode) return;
		if (controls.loopEnabled && !controls.hybridMode) return;
		
		// Get the bounding rectangle of the container
		const rect = containerRef.current.getBoundingClientRect();
		
		// Calculate mouse position relative to the container (0 to 1)
		// 0 = top of the page, 1 = bottom of the page
		const relativeY = (e.clientY - rect.top) / rect.height;
		
		// Clamp the value between 0 and 1
		const clampedY = Math.max(0, Math.min(1, relativeY));
		
		setMouseY(clampedY);
		
		// In hybrid mode, handle cursor following
		if (controls.hybridMode && isHovering) {
			if (isTransitioning) {
				// During transition, continuously update target and interpolate
				setTransitionTargetProgress(clampedY);
				const elapsed = (Date.now() - transitionStartTime) / 1000;
				const transitionProgress = Math.min(elapsed / 0.3, 1);
		
				// Apply ease-in-out easing
				const easedProgress = transitionProgress < 0.3
					? 2 * transitionProgress * transitionProgress 
					: 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2;
				
				// Smooth interpolation from start to current target
				const interpolatedProgress = transitionStartProgress + (clampedY - transitionStartProgress) * easedProgress;
				setProgress(interpolatedProgress);
				
				// Check if transition is complete
				if (transitionProgress >= 1) {
					setIsTransitioning(false);
					setTransitionComplete(true);
				}
			} else if (transitionComplete) {
				// After transition, follow cursor instantly
				setProgress(clampedY);
			}
		} else if (!controls.hybridMode) {
			// Invert the progress so that top = 0 (no scan) and bottom = 1 (full scan)
			// This matches the expected behavior where scanning progresses from top to bottom
			setProgress(clampedY);
		}
	};

	// Handle mouse entering the container
	const handleMouseEnter = () => {
		setIsHovering(true);
		setTransitionComplete(false);
		setIsTransitioning(true);
		setTransitionStartProgress(progress);
		setTransitionStartTime(Date.now());
	};

	// Handle mouse leaving the container
	const handleMouseLeave = () => {
		setIsHovering(false);
		setTransitionComplete(false);
		setIsTransitioning(false);
		if (!controls.autoProgress && !controls.loopEnabled && !controls.hybridMode) {
			// setMouseY(0);
			// setProgress(0); // Reset to no scanning when mouse leaves
		} else if (controls.hybridMode) {
			// In hybrid mode, smoothly transition back to auto progress
			gsap.to({}, {
				duration: 0.2,
				onUpdate: function() {
					const targetProgress = autoProgress;
					const currentProgress = progress;
					setProgress(currentProgress + (targetProgress - currentProgress) * this.progress());
				}
			});
		}
	};

	useGSAP(() => {
		if (!isLoading) {
			gsap
				.timeline()
				.to('[data-loader]', {
					opacity: 0,
				})
				.from('[data-title]', {
					yPercent: -100,
					stagger: {
						each: 0.15,
					},
					ease: 'power1.out',
				})
				.from('[data-desc]', {
					opacity: 0,
					yPercent: 100,
				});
		}
	}, [isLoading]);

	return (
		<div className='flex bg-stone-600 flex-col items-center justify-center h-screen'>
			{/* Loading overlay */}
			<div
				className="h-svh fixed z-90 bg-yellow-900 pointer-events-none w-full flex justify-center items-center"
				data-loader
			>
				<div className="w-6 h-6 bg-white animate-ping rounded-full"></div>
			</div>
			
			{/* Debug Controls Panel */}
			<DebugPanel controls={controls} setControls={setControls} />
			
			{/* Main container with mouse tracking */}
			<div 
				className=" rounded-3xl overflow-hidden relative w-[60%] h-[60%]"
				ref={containerRef}
				onMouseMove={handleMouseMove}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
		

				{/* Three.js canvas with progress control */}
				<WebGPUCanvas>
					<PostProcessing />
					{/* Pass the progress value and controls to the Scene component */}
					<Scene progress={progress} controls={controls} />
				</WebGPUCanvas>
				
				{/* Debug indicator - shows current progress value */}
				{controls.showDebugInfo && (
					<div className="fixed top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm font-mono z-50">
						<div>Progress: {(progress * 100).toFixed(1)}%</div>
						<div>Mouse Y: {(mouseY * 100).toFixed(1)}%</div>
						<div>Loop: {controls.loopEnabled ? 'ON' : 'OFF'}</div>
						<div>Auto: {controls.autoProgress ? 'ON' : 'OFF'}</div>
						<div>Hybrid: {controls.hybridMode ? 'ON' : 'OFF'}</div>
						<div>Hover: {isHovering ? 'YES' : 'NO'}</div>
						<div>Mode: {controls.scanMode}</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default function Home() {
	return (
		<ContextProvider>
			<Html />
		</ContextProvider>
	);
}
