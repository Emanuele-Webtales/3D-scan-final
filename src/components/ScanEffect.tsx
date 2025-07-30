'use client'

import React, { useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Mesh } from 'three'
import * as THREE from 'three'

interface ScanEffectProps {
  scanIntensity: number
  scanSpeed: number
  scanDirection: 'horizontal' | 'vertical' | 'radial'
}

const ScanEffect: React.FC<ScanEffectProps> = ({ 
  scanIntensity, 
  scanSpeed, 
  scanDirection 
}) => {
  const meshRef = useRef<Mesh>(null)
  const [scanProgress, setScanProgress] = useState(0)

  // Load textures
  const imageTexture = useLoader(THREE.TextureLoader, 'https://picsum.photos/512/512')
  const depthTexture = useLoader(THREE.TextureLoader, 'https://picsum.photos/512/512?grayscale')

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current) return

    // Update scan progress based on speed
    const newProgress = (state.clock.elapsedTime * (scanSpeed / 100)) % 1
    setScanProgress(newProgress)

    // Apply scan effect to shader uniforms
    if (meshRef.current.material instanceof THREE.ShaderMaterial) {
      meshRef.current.material.uniforms.scanProgress.value = newProgress
      meshRef.current.material.uniforms.scanIntensity.value = scanIntensity / 100
    }
  })

  // Create shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      imageTexture: { value: imageTexture },
      depthTexture: { value: depthTexture },
      scanProgress: { value: 0 },
      scanIntensity: { value: scanIntensity / 100 },
      scanDirection: { value: scanDirection === 'horizontal' ? 0 : scanDirection === 'vertical' ? 1 : 2 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D imageTexture;
      uniform sampler2D depthTexture;
      uniform float scanProgress;
      uniform float scanIntensity;
      uniform int scanDirection;
      
      varying vec2 vUv;
      
      void main() {
        vec4 imageColor = texture2D(imageTexture, vUv);
        float depth = texture2D(depthTexture, vUv).r;
        
        // Calculate scan line position based on direction
        float scanLine;
        if (scanDirection == 0) {
          // Horizontal scan
          scanLine = step(vUv.y, scanProgress);
        } else if (scanDirection == 1) {
          // Vertical scan
          scanLine = step(vUv.x, scanProgress);
        } else {
          // Radial scan
          vec2 center = vec2(0.5, 0.5);
          float distance = length(vUv - center);
          scanLine = step(distance, scanProgress * 0.7);
        }
        
        // Apply depth displacement
        vec3 displacedPosition = vec3(vUv.x, vUv.y, depth * scanIntensity);
        
        // Apply scan effect
        vec4 finalColor = imageColor;
        if (scanLine < 0.5) {
          finalColor.rgb *= 0.3; // Dim areas not yet scanned
        }
        
        gl_FragColor = finalColor;
      }
    `
  })

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[4, 4]} />
    </mesh>
  )
}

export default ScanEffect 