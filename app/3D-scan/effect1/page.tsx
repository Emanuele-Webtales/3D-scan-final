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
import TEXTUREMAP from '@/app/3D-scan/3D-scan-assets/raw-1.png';
import DEPTHMAP from '@/app/3D-scan/3D-scan-assets/depth-1.png';

// Font definition - currently unused but kept for potential future use
// const tomorrow = Tomorrow({
// 	weight: '600',
// 	subsets: ['latin'],
// });

const WIDTH = 1600 ;
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
	const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src], () => {
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

		// Strength of the displacement effect - fixed for now
		const strength = 0.01; // TODO: Make this configurable in UI

		// Create texture nodes from the maps
		const tDepthMap = texture(depthMap);

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
	}, [rawMap, depthMap, controls]); // Updated dependencies

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
	const isMobile = useIsMobile();

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
					{/* Visual Controls */}
					<div className="border-b border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Visual Controls</h4>
						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.showImage}
									onChange={(e) => updateControl('showImage', e.target.checked)}
									className="mr-2"
								/>
								Show Image
							</label>
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

					{/* Scan Type and Properties */}
					<div className="border-b border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Scan Type</h4>
						<div className="space-y-2">
							<div>
								<label className="block text-xs mb-1">Type</label>
								<select
									value={controls.scanType}
									onChange={(e) => updateControl('scanType', e.target.value as 'gradient' | 'dots' | 'cross')}
									className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
								>
									<option value="gradient">Gradient</option>
									<option value="dots">Dots</option>
									<option value="cross">Cross</option>
								</select>
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

							{/* Type-specific controls */}
							{controls.scanType === 'gradient' && (
								<div>
									<label className="block text-xs mb-1">Gradient Width: {controls.gradientWidth.toFixed(2)}</label>
									<input
										type="range"
										min="0"
										max="5.0"
										step="0.1"
										value={controls.gradientWidth}
										onChange={(e) => updateControl('gradientWidth', parseFloat(e.target.value))}
										className="w-full"
									/>
						</div>
							)}

							{controls.scanType !== 'gradient' && (
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
							)}

							{controls.scanType === 'dots' && (
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
							)}

							{controls.scanType === 'cross' && (
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
						</div>
					</div>

					{/* Hover Options */}
					<div className="border-b border-gray-600 pb-2">
						<h4 className="font-semibold mb-2">Hover Options</h4>
						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.hoverEnabled}
									onChange={(e) => updateControl('hoverEnabled', e.target.checked)}
									className="mr-2"
								/>
								Enable Hover {isMobile && "(Disabled on mobile)"}
							</label>
							
							{controls.hoverEnabled && !isMobile && (
								<div>
									<label className="block text-xs mb-1">Progress Direction</label>
									<select
										value={controls.progressDirection}
										onChange={(e) => updateControl('progressDirection', e.target.value)}
										className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
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
						<h4 className="font-semibold mb-2">Loop Options</h4>
						<div className="space-y-2">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={controls.loopEnabled}
									onChange={(e) => updateControl('loopEnabled', e.target.checked)}
									className="mr-2"
								/>
								Loop
							</label>
							
							{controls.loopEnabled && (
								<>
									<div>
										<label className="block text-xs mb-1">Loop Type</label>
										<select
											value={controls.loopType}
											onChange={(e) => updateControl('loopType', e.target.value)}
											className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
										>
											<option value="oneShot">One Shot</option>
											<option value="repeat">Repeat</option>
											<option value="mirror">Mirror</option>
										</select>
									</div>
									<div>
										<label className="block text-xs mb-1">Loop Duration: {controls.loopDuration}s</label>
											<input
												type="range"
											min="0.5"
											max="10"
												step="0.1"
											value={controls.loopDuration}
											onChange={(e) => updateControl('loopDuration', parseFloat(e.target.value))}
											className="w-full"
										/>
									</div>
									<div>
										<label className="block text-xs mb-1">Loop Easing</label>
											<input
											type="text"
											value={controls.loopEasing}
											onChange={(e) => updateControl('loopEasing', e.target.value)}
											placeholder="e.g. power2.inOut, elastic.out"
											className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
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
const Html = () => {
	const { isLoading } = useContext(GlobalContext);
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
	const timelineRef = useRef<gsap.core.Timeline | null>(null);

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

	// Loop animation
	useEffect(() => {
		if (!controls.loopEnabled) {
			if (timelineRef.current) {
				timelineRef.current.kill();
				timelineRef.current = null;
			}
			return;
		}

		// Kill existing timeline if it exists
		if (timelineRef.current) {
			timelineRef.current.kill();
		}

		const timeline = gsap.timeline({
			repeat: controls.loopType === 'repeat' ? -1 : (controls.loopType === 'oneShot' ? 0 : -1),
			yoyo: controls.loopType === 'mirror',
		});

		timeline.to({}, {
			duration: controls.loopDuration,
			ease: controls.loopEasing,
			onUpdate: function() {
				const currentLoopProgress = this.progress();
				setLoopProgress(currentLoopProgress);
				
				// Only set the main progress if not hovering
				if (!isHovering) {
					setProgress(currentLoopProgress);
				}
			}
		});

		// Store the timeline in ref for pause/resume control
		timelineRef.current = timeline;

		return () => {
			if (timelineRef.current) {
				timelineRef.current.kill();
				timelineRef.current = null;
			}
		};
	}, [controls.loopEnabled, controls.loopDuration, controls.loopType, controls.loopEasing]);

	// Handle hover state changes for timeline control
	useEffect(() => {
		if (!controls.loopEnabled || !timelineRef.current) return;
		
		if (isHovering && controls.hoverEnabled && !isMobile) {
			timelineRef.current.pause();
		}
		// Don't auto-resume here - let handleMouseLeave handle it
	}, [isHovering, controls.hoverEnabled, controls.loopEnabled, isMobile]);

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
		
		if (controls.loopEnabled && timelineRef.current) {
			// Set the timeline to continue from the current hover position
			timelineRef.current.progress(progress);
			// Update loop progress to match
			setLoopProgress(progress);
			// Resume the timeline
			timelineRef.current.resume();
		} else {
			// Reset to no scanning when mouse leaves (if no loop active)
			setProgress(0);
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
						{controls.loopEnabled && <div>Loop Progress: {(loopProgress * 100).toFixed(1)}%</div>}
						<div>Mouse Y: {(mouseY * 100).toFixed(1)}%</div>
						<div>Loop: {controls.loopEnabled ? 'ON' : 'OFF'}</div>
						<div>Hover: {controls.hoverEnabled && !isMobile ? (isHovering ? 'ACTIVE' : 'ON') : 'OFF'}</div>
						{controls.loopEnabled && timelineRef.current && (
							<div>Timeline: {timelineRef.current.paused() ? 'PAUSED' : 'PLAYING'}</div>
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

export default function Home() {
	return (
		<ContextProvider>
			<Html />
		</ContextProvider>
	);
}
