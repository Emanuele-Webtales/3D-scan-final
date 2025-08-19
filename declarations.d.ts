// NOTE: The declaration below was injected by `"framer"`
// see https://www.framer.com/docs/guides/handshake for more information.
declare module "https://framer.com/m/*";
declare module "https://cdn.jsdelivr.net/*";

// React Three Fiber JSX declarations for older versions
declare namespace JSX {
  interface IntrinsicElements {
    mesh: any;
    planeGeometry: any;
    group: any;
    scene: any;
    camera: any;
    light: any;
    ambientLight: any;
    directionalLight: any;
    pointLight: any;
    spotLight: any;
    hemisphereLight: any;
    rectAreaLight: any;
    primitive: any;
    line: any;
    lineSegments: any;
    lineLoop: any;
    points: any;
    sprite: any;
    instancedMesh: any;
    skinnedMesh: any;
    bone: any;
    boxGeometry: any;
    circleGeometry: any;
    coneGeometry: any;
    cylinderGeometry: any;
    dodecahedronGeometry: any;
    edgesGeometry: any;
    extrudeGeometry: any;
    icosahedronGeometry: any;
    latheGeometry: any;
    octahedronGeometry: any;
    ringGeometry: any;
    sphereGeometry: any;
    tetrahedronGeometry: any;
    torusGeometry: any;
    torusKnotGeometry: any;
    tubeGeometry: any;
    wireframeGeometry: any;
    bufferGeometry: any;
    meshBasicMaterial: any;
    meshStandardMaterial: any;
    meshPhysicalMaterial: any;
    meshPhongMaterial: any;
    meshLambertMaterial: any;
    meshToonMaterial: any;
    meshNormalMaterial: any;
    meshDepthMaterial: any;
    meshDistanceMaterial: any;
    meshMatcapMaterial: any;
    meshNormalMaterial: any;
    lineBasicMaterial: any;
    lineDashedMaterial: any;
    pointsMaterial: any;
    spriteMaterial: any;
    rawShaderMaterial: any;
    shaderMaterial: any;
    shadowMaterial: any;
  }
}

// Minimal fallbacks for external libs without bundled types
declare module 'ogl' {
  export const Renderer: any;
  export const Camera: any;
  export const Mesh: any;
  export const Plane: any;
  export const Program: any;
  export const RenderTarget: any;
  export const Texture: any;
}

declare module 'resolve-lygia' {
  export function resolveLygia(source: string): string;
}

declare module 'tweakpane' {
  export class Pane {
    constructor(options?: any);
    addBinding(target: any, key: string, params?: any): any;
    dispose(): void;
  }
}

// Added for glslify usage in shaders
declare module 'glslify' {
  const glsl: (source: string) => string
  export default glsl
}
