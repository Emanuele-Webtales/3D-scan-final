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
 */

'use client';

import { WebGPUCanvas } from '@/components/canvas';
import { useAspect, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { Tomorrow } from 'next/font/google';
import gsap from 'gsap';

import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';

import * as THREE from 'three/webgpu';
import { useGSAP } from '@gsap/react';
import { GlobalContext, ContextProvider } from '@/context';
import { PostProcessing } from '@/components/post-processing';
import TEXTUREMAP from '@/assets/raw-1.png';
import DEPTHMAP from '@/assets/depth-1.png';

const tomorrow = Tomorrow({
	weight: '600',
	subsets: ['latin'],
});

const WIDTH = 1600;
const HEIGHT = 900;

// Scene component that renders the 3D scanning effect
// This component handles the Three.js material creation and uniform updates
const Scene = ({ progress }: { progress: number }) => {
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

		// Strength of the displacement effect
		const strength = 0.01;

		// Create a texture node from the depth map
		// The depth map contains grayscale values representing depth information
		const tDepthMap = texture(depthMap);

		// Create the main texture with displacement based on depth
		// uv() gives us the current pixel coordinates (0-1 range)
		// We add a displacement based on the depth map and mouse position
		const tMap = texture(
			rawMap,
			uv().add(tDepthMap.r.mul(uPointer).mul(strength))
		);

		// Calculate aspect ratio to maintain proper proportions
		const aspect = float(WIDTH).div(HEIGHT);
		// Create UV coordinates that account for aspect ratio
		const tUv = vec2(uv().x.mul(aspect), uv().y);

		// Create a tiling pattern for the scanning effect
		// This creates a grid of dots that will be used as the scanning mask
		const tiling = vec2(120.0); // Number of tiles
		// Create tiled UV coordinates and center them (-1 to 1 range)
		const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

		// Generate noise for brightness variation
		// This creates a subtle texture in the scanning effect
		const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));

		// Calculate distance from center of each tile
		const dist = float(tiledUv.length());
		// Create dots using smoothstep - creates smooth circular shapes
		// 0.5 to 0.49 creates a thin ring effect
		const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);

		// Get the depth value for the current pixel
		const depth = tDepthMap;

		// Create the scanning flow effect
		// This creates a smooth transition based on the difference between
		// the current depth and the progress value
		// oneMinus inverts the result so the effect flows from top to bottom
		const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));

		// Combine the dot pattern with the flow to create the scanning mask
		// vec3(10, 0, 0) creates a red color for the scanning effect
		const mask = dot.mul(flow).mul(vec3(10, 0, 0));

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
	}, [rawMap, depthMap]);

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

// Html component that handles the UI layout and mouse tracking
// This component manages the overall page structure and mouse interactions
const Html = () => {
	const { isLoading } = useContext(GlobalContext);
	
	// State to track mouse position and progress
	// mouseY: normalized mouse position (0-1, top to bottom)
	// progress: scanning progress (0-1, where 0 = no scan, 1 = full scan)
	const [mouseY, setMouseY] = useState(0);
	const [progress, setProgress] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	// Handle mouse movement to control the scanning effect
	const handleMouseMove = (e: React.MouseEvent) => {
		if (!containerRef.current) return;
		
		// Get the bounding rectangle of the container
		const rect = containerRef.current.getBoundingClientRect();
		
		// Calculate mouse position relative to the container (0 to 1)
		// 0 = top of the page, 1 = bottom of the page
		const relativeY = (e.clientY - rect.top) / rect.height;
		
		// Clamp the value between 0 and 1
		const clampedY = Math.max(0, Math.min(1, relativeY));
		
		setMouseY(clampedY);
		
		// Invert the progress so that top = 0 (no scan) and bottom = 1 (full scan)
		// This matches the expected behavior where scanning progresses from top to bottom
		setProgress(clampedY);
	};

	// Handle mouse leaving the container
	const handleMouseLeave = () => {
		setMouseY(0);
		setProgress(0); // Reset to no scanning when mouse leaves
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
		<div className='flex bg-black flex-col items-center justify-center h-screen p-[20%]'>
			{/* Loading overlay */}
			<div
				className="h-svh fixed z-90 bg-yellow-900 pointer-events-none w-full flex justify-center items-center"
				data-loader
			>
				<div className="w-6 h-6 bg-white animate-ping rounded-full"></div>
			</div>
			
			{/* Main container with mouse tracking */}
			<div 
				className="h-[50vh] rounded-3xl overflow-hidden relative w-full h-full"
				ref={containerRef}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				{/* Text overlay */}
				<div className="h-svh uppercase items-center w-full absolute z-60 pointer-events-none px-10 flex justify-center flex-col">
					<div
						className="text-4xl md:text-7xl xl:text-8xl 2xl:text-9xl"
						style={{
							...tomorrow.style,
						}}
					>
						<div className="flex space-x-2 lg:space-x-6 overflow-hidden">
							{'Crown of Fire'.split(' ').map((word, index) => {
								return (
									<div data-title key={index}>
										{word}
									</div>
								);
							})}
						</div>
					</div>

					<div className="text-xs md:text-xl xl:text-2xl 2xl:text-3xl mt-2 overflow-hidden">
						<div data-desc>The Majesty and Glory of the Young King</div>
					</div>
				</div>

				{/* Three.js canvas with progress control */}
				<WebGPUCanvas>
					<PostProcessing />
					{/* Pass the progress value to the Scene component */}
					<Scene progress={progress} />
				</WebGPUCanvas>
				
				{/* Debug indicator - shows current progress value */}
				<div className="fixed top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm font-mono z-50">
					Progress: {(progress * 100).toFixed(1)}%
				</div>
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
