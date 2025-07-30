import * as THREE from 'three/webgpu';
import { Canvas, CanvasProps, extend } from '@react-three/fiber';

extend(THREE as any);

//This is a wrapper for the WebGPUCanvas component
//It is used to create a canvas that can be used to render 3D scenes
//It is also used to create a canvas that can be used to render 2D scenes

export const WebGPUCanvas = (props: CanvasProps) => {
  return (
    <Canvas
    
      {...props}
      flat
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as any);
        await renderer.init();
        return renderer;
      }}
    >
      {props.children}
    </Canvas>
  );
};
