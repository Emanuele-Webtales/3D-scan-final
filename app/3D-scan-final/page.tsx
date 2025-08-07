//@ts-ignore
import {
    useAspect,
    useTexture,
    useFrame,
    Canvas,
    useThree,
    Mesh,
    ShaderMaterial,
    MeshBasicMaterial,
    SRGBColorSpace,
    Vector2,
    Vector3,
    AdditiveBlending,
  } //@ts-ignore the errors are to be
  from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-scan-bundle.js"
  
  //--------------------------------
  //--------------------------------
  
  import {
    useContext,
    useMemo,
    useRef,
    useState,
    useEffect,
    createContext,
    ReactNode,
  } from "react"
  import { motion, useAnimation, useMotionValue } from "framer-motion"
  import { addPropertyControls, ControlType } from "framer"
  
  const WIDTH = 1600;
  const HEIGHT = 900;
  
  // Mobile/touch detection hook
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
  
  // Property Controls for Framer
  addPropertyControls(Home, {
    textureMap: {
        type: ControlType.ResponsiveImage,
        title: "Texture Map",
        description: "The main texture image for the 3D scan effect",
    },
    depthMap: {
        type: ControlType.ResponsiveImage,
        title: "Depth Map",
        description:
            "The depth map image that controls the 3D displacement effect",
    },
  })
  
  
  // Global Context
  interface GlobalContextType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
  }
  
  export const GlobalContext = createContext<GlobalContextType>({
    isLoading: true,
    setIsLoading: () => {},
  });
  
  interface ContextProviderProps {
    children: ReactNode;
  }
  
  export const ContextProvider: React.FC<ContextProviderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
  
    return (
      <GlobalContext.Provider value={{ isLoading, setIsLoading }}>
        {children}
      </GlobalContext.Provider>
    );
  };
  
  // WebGPUCanvas Component
  export const WebGPUCanvas = (props:any) => {
    return (
      <Canvas
        {...props}
        flat
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          precision: "mediump",
          depth: true,
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
        resize={{ offsetSize: true }}
        dpr={[1, 2]}
      >
        {props.children}
      </Canvas>
    );
  };
  
  // PostProcessing Component
  export const PostProcessing = ({
    strength = 1,
    threshold = 1,
  }: {
    strength?: number;
    threshold?: number;
  }) => {
    const { gl, scene, camera } = useThree();
  
    // Simple post-processing setup that works with current Three.js version
    const render = useMemo(() => {
      // For now, just return the standard renderer
      return { gl, scene, camera };
    }, [gl, scene, camera]);
  
    useFrame(() => {
      // Use standard rendering instead of renderAsync
      gl.setRenderTarget(null);
      gl.render(scene, camera);
    });
  
    return null;
  };
  
  // UI Controls Component
  interface UIControlsProps {
    dotSize: number;
    setDotSize: (value: number) => void;
    dotColor: string;
    setDotColor: (value: string) => void;
    tilingScale: number;
    setTilingScale: (value: number) => void;
    isVisible: boolean;
    setIsVisible: (value: boolean) => void;
    effectType: 'dots' | 'gradient';
    setEffectType: (value: 'dots' | 'gradient') => void;
    gradientWidth: number;
    setGradientWidth: (value: number) => void;
    gradientIntensity: number;
    setGradientIntensity: (value: number) => void;
    bloomStrength: number;
    setBloomStrength: (value: number) => void;
    bloomRadius: number;
    setBloomRadius: (value: number) => void;
    showTexture: boolean;
    setShowTexture: (value: boolean) => void;
    backgroundColor: string;
    setBackgroundColor: (value: string) => void;
    // Loop and hover controls
    loopEnabled: boolean;
    setLoopEnabled: (value: boolean) => void;
    loopType: 'oneShot' | 'repeat' | 'mirror';
    setLoopType: (value: 'oneShot' | 'repeat' | 'mirror') => void;
    loopDuration: number;
    setLoopDuration: (value: number) => void;
    loopEasing: string;
    setLoopEasing: (value: string) => void;
    hoverEnabled: boolean;
    setHoverEnabled: (value: boolean) => void;
    progressDirection: 'topToBottom' | 'bottomToTop' | 'leftToRight' | 'rightToLeft' | 'centerOutward' | 'outwardToCenter';
    setProgressDirection: (value: 'topToBottom' | 'bottomToTop' | 'leftToRight' | 'rightToLeft' | 'centerOutward' | 'outwardToCenter') => void;
  }
  
  const UIControls = ({ 
    dotSize, 
    setDotSize, 
    dotColor, 
    setDotColor, 
    tilingScale,
    setTilingScale,
    isVisible,
    setIsVisible,
    effectType,
    setEffectType,
    gradientWidth,
    setGradientWidth,
    gradientIntensity,
    setGradientIntensity,
    bloomStrength,
    setBloomStrength,
    bloomRadius,
    setBloomRadius,
    showTexture,
    setShowTexture,
    backgroundColor,
    setBackgroundColor,
    loopEnabled,
    setLoopEnabled,
    loopType,
    setLoopType,
    loopDuration,
    setLoopDuration,
    loopEasing,
    setLoopEasing,
    hoverEnabled,
    setHoverEnabled,
    progressDirection,
    setProgressDirection
  }: UIControlsProps) => {
    if (!isVisible) return null;
  
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '20px',
        borderRadius: '24px',
        color: 'white',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        fontSize: '13px',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        minWidth: '250px',
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Shader Controls</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Effect Type:</label>
          <select
            value={effectType}
            onChange={(e) => setEffectType(e.target.value as 'dots' | 'gradient')}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <option value="dots">Dots</option>
            <option value="gradient">Gradient Line</option>
          </select>
        </div>
  
        {effectType === 'dots' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Dot Size: {dotSize.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={dotSize}
                onChange={(e) => setDotSize(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
  
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Tiling Scale: {tilingScale.toFixed(0)}</label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={tilingScale}
                onChange={(e) => setTilingScale(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
  
        {effectType === 'gradient' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Gradient Width: {gradientWidth.toFixed(2)}</label>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={gradientWidth}
                onChange={(e) => setGradientWidth(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
  
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Gradient Intensity: {gradientIntensity.toFixed(2)}</label>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={gradientIntensity}
                onChange={(e) => setGradientIntensity(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
  
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Bloom Strength: {bloomStrength.toFixed(3)}</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={bloomStrength}
                onChange={(e) => setBloomStrength(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
  
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Bloom Radius: {bloomRadius.toFixed(4)}</label>
              <input
                type="range"
                min="0.0001"
                max="0.01"
                step="0.0001"
                value={bloomRadius}
                onChange={(e) => setBloomRadius(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
  
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <input
              type="checkbox"
              checked={showTexture}
              onChange={(e) => setShowTexture(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Texture Image
          </label>
        </div>
  
        {!showTexture && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Background Color:</label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              style={{ width: '100%', height: '30px' }}
            />
          </div>
        )}
  
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Dot Color:</label>
          <input
            type="color"
            value={dotColor}
            onChange={(e) => setDotColor(e.target.value)}
            style={{ width: '100%', height: '30px' }}
          />
        </div>
  
        {/* Loop Options */}
        <div style={{ marginBottom: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Loop Options</h4>
          
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={(e) => setLoopEnabled(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Loop
          </label>
          
          {loopEnabled && (
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Loop Type</label>
                <select
                  value={loopType}
                  onChange={(e) => setLoopType(e.target.value as 'oneShot' | 'repeat' | 'mirror')}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '12px'
                  }}
                >
                  <option value="repeat">Repeat</option>
                  <option value="mirror">Mirror</option>
                  <option value="oneShot">One Shot</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Duration: {loopDuration}s</label>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={loopDuration}
                  onChange={(e) => setLoopDuration(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Easing</label>
                <input
                  type="text"
                  value={loopEasing}
                  onChange={(e) => setLoopEasing(e.target.value)}
                  placeholder="e.g. easeInOut"
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>
            </>
          )}
        </div>
  
        {/* Hover Options */}
        <div style={{ marginBottom: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Hover Options</h4>
          
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={hoverEnabled}
              onChange={(e) => setHoverEnabled(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Enable Hover
          </label>
          
          {hoverEnabled && (
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Progress Direction</label>
              <select
                value={progressDirection}
                onChange={(e) => setProgressDirection(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '12px'
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
  
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Hide Controls
        </button>
      </div>
    );
  };
  
  interface SceneProps {
    dotSize: number;
    dotColor: string;
    tilingScale: number;
    effectType: 'dots' | 'gradient';
    gradientWidth: number;
    gradientIntensity: number;
    bloomStrength: number;
    bloomRadius: number;
    showTexture: boolean;
    backgroundColor: string;
    progress: number;
  }
  
  const Scene = ({ 
    dotSize, 
    dotColor, 
    tilingScale,
    effectType,
    gradientWidth,
    gradientIntensity,
    bloomStrength,
    bloomRadius,
    showTexture,
    backgroundColor,
    progress,
    textureMap,
    depthMap
  }: SceneProps & { textureMap?: any; depthMap?: any }) => {
    const { setIsLoading } = useContext(GlobalContext);
    const materialRef = useRef<Mesh>(null);
  
    // Convert Framer image objects to URLs
    const textureMapUrl = textureMap?.src || textureMap || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlPC90ZXh0Pjwvc3ZnPg==";
    const depthMapUrl = depthMap?.src || depthMap || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzY2NjY2NiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRlcHRoPC90ZXh0Pjwvc3ZnPg==";
  
    // Load the textures
    const [rawMap, depthMapTexture] = useTexture([textureMapUrl, depthMapUrl], () => {
      setIsLoading(false);
      if (rawMap) {
        rawMap.colorSpace = SRGBColorSpace;
      }
    });
  
    // Convert hex color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      } : { r: 1, g: 0, b: 0 };
    };
  
    // Create background material for when texture is hidden
    const backgroundMaterial = useMemo(() => {
      return new MeshBasicMaterial({
        color: backgroundColor,
        transparent: false,
      });
    }, [backgroundColor]);
  
    // Use MeshBasicMaterial for bright base image
    const material = useMemo(() => {
      return new MeshBasicMaterial({
        map: rawMap,
        transparent: false,
      });
    }, [rawMap]);
    
    // Create uniform refs that persist between renders
    const uniformsRef = useRef({
      uProgress: { value: 0 },
      uDepthMap: { value: null as any },
      uColor: { value: new Vector3(0, 1, 0) },
      uEffectType: { value: 0.0 },
      uDotSize: { value: dotSize },
      uTilingScale: { value: tilingScale },
      uGradientWidth: { value: gradientWidth },
      uGradientIntensity: { value: gradientIntensity },
      uBloomStrength: { value: bloomStrength },
      uBloomRadius: { value: bloomRadius }
    });
  
    const [w, h] = useAspect(WIDTH, HEIGHT);
  
    // Update uniforms for the effects shader
    useFrame(() => {
      const rgbColor = hexToRgb(dotColor);
      
      // Update persistent uniform refs
      uniformsRef.current.uProgress.value = progress;
      uniformsRef.current.uColor.value.set(rgbColor.r, rgbColor.g, rgbColor.b);
      uniformsRef.current.uEffectType.value = effectType === 'dots' ? 0.0 : 1.0;
      uniformsRef.current.uDotSize.value = dotSize;
      uniformsRef.current.uTilingScale.value = tilingScale;
      uniformsRef.current.uGradientWidth.value = gradientWidth;
      uniformsRef.current.uGradientIntensity.value = gradientIntensity;
      uniformsRef.current.uBloomStrength.value = bloomStrength;
      uniformsRef.current.uBloomRadius.value = bloomRadius;
      
      // Update depth map when loaded
      if (depthMapTexture && uniformsRef.current.uDepthMap.value !== depthMapTexture) {
        uniformsRef.current.uDepthMap.value = depthMapTexture;
      }
    });
  
      return (
      <>
        {/* Base layer - either texture image or background color */}
        {showTexture ? (
          <mesh scale={[w, h, 1]} material={material}>
            <planeGeometry />
          </mesh>
        ) : (
          <mesh scale={[w, h, 1]} material={backgroundMaterial}>
            <planeGeometry />
          </mesh>
        )}
        
        {/* Effects overlay mesh */}
        <mesh scale={[w, h, 1]} position={[0, 0, 0.01]} ref={materialRef}>
          <planeGeometry />
          <shaderMaterial
            transparent={true}
            blending={AdditiveBlending}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform float uProgress;
              uniform sampler2D uDepthMap;
              uniform vec3 uColor;
              uniform float uEffectType;
              uniform float uDotSize;
              uniform float uTilingScale;
              uniform float uGradientWidth;
              uniform float uGradientIntensity;
              uniform float uBloomStrength;
              uniform float uBloomRadius;
              varying vec2 vUv;
              
              // Noise functions removed for clean gradient lines
              
              void main() {
                vec2 uv = vUv;
                float depth = texture2D(uDepthMap, uv).r;
                
                // Use the exact working formula from reference-code.tsx
                float flow = 1.0 - smoothstep(0.0, 0.02, abs(depth - uProgress));
                
                // For dots effect
                if (uEffectType < 0.5) {
                  // Create tiled UV for dots
                  vec2 aspect = vec2(1600.0 / 900.0, 1.0);
                  vec2 tUv = vec2(uv.x * aspect.x, uv.y);
                  vec2 tiling = vec2(uTilingScale);
                  vec2 tiledUv = mod(tUv * tiling, 2.0) - 1.0;
                  
                  // Create dots (without noise for clean appearance)
                  float dist = length(tiledUv);
                  float dot = smoothstep(0.5, 0.49, dist);
                  
                  // Combine dots with flow
                  float final = dot * flow;
                  gl_FragColor = vec4(uColor * final, final);
                } else {
                  // For gradient line effect - high quality implementation from reference-code-old.tsx
                  float exactProgress = abs(depth - uProgress);
                  
                  // Scale the gradient width to be less sensitive (like reference code)
                  float scaledGradientWidth = uGradientWidth * 0.1;
                  
                  // Opacity pattern:
                  // - Current progress band (exactProgress = 0): opacity = 1.0
                  // - Bands within gradientWidth range: linear interpolation from 1.0 to 0.05
                  // - Bands outside gradientWidth range: opacity = 0.0
                  
                  // Check if we're at the current progress band (very precise)
                  bool isCurrentBand = exactProgress <= 0.001;
                  
                  // Check if we're within the gradient width range
                  bool isWithinGradientRange = exactProgress <= scaledGradientWidth;
                  
                  // Calculate linear interpolation for bands within range
                  // exactProgress goes from 0 to scaledGradientWidth
                  // We want opacity to go from 1.0 to 0.05
                  float normalizedDistance = exactProgress / scaledGradientWidth;
                  float interpolatedOpacity = (1.0 - normalizedDistance) * 0.95 + 0.05;
                  
                  // Set opacity: 1.0 for current band, interpolated for bands within range, 0.0 for others
                  float opacity = isCurrentBand ? 1.0 : (isWithinGradientRange ? interpolatedOpacity : 0.0);
                  
                  // Intensity-based bloom effect - brighter areas create more bloom like reference code
                  float bloomStrength = uBloomStrength;
                  float bloomSize = uBloomRadius * 100.0; // Scale up for better control
                  
                  // Create multiple layers of bloom at different sizes for realistic glow
                  float bloom = 0.0;
                  
                  // Core bloom - closest to the line
                  float coreBloom = exactProgress <= (scaledGradientWidth + bloomSize * 0.5) ? 
                      (1.0 - smoothstep(0.0, scaledGradientWidth + bloomSize * 0.5, exactProgress)) * bloomStrength : 0.0;
                  
                  // Medium bloom - extends further
                  float mediumBloom = exactProgress <= (scaledGradientWidth + bloomSize) ? 
                      (1.0 - smoothstep(0.0, scaledGradientWidth + bloomSize, exactProgress)) * bloomStrength * 0.6 : 0.0;
                  
                  // Outer bloom - softest and widest
                  float outerBloom = exactProgress <= (scaledGradientWidth + bloomSize * 2.0) ? 
                      (1.0 - smoothstep(0.0, scaledGradientWidth + bloomSize * 2.0, exactProgress)) * bloomStrength * 0.3 : 0.0;
                  
                  // Combine all bloom layers
                  bloom = max(max(coreBloom, mediumBloom), outerBloom);
                  
                  // Intensity-based boost - stronger intensity creates more bloom
                  float intensityBoost = uGradientIntensity * 0.5;
                  bloom *= (1.0 + intensityBoost);
                  
                  // Combine main line with bloom
                  float finalOpacity = max(opacity, bloom);
                  
                  // Apply color and intensity
                  gl_FragColor = vec4(uColor * finalOpacity * uGradientIntensity, finalOpacity);
                }
              }
            `}
            uniforms={uniformsRef.current}
          />
        </mesh>
      </>
    );
  };
  
  const Html = ({ textureMap, depthMap }: { textureMap?: any; depthMap?: any }) => {
    const { isLoading } = useContext(GlobalContext);
    const isMobile = useIsMobile();
    
    const [dotSize, setDotSize] = useState(0.1);
    const [dotColor, setDotColor] = useState('#00ff00');
    const [tilingScale, setTilingScale] = useState(1.0);
    const [isVisible, setIsVisible] = useState(true);
    const [effectType, setEffectType] = useState<'dots' | 'gradient'>('dots');
    const [gradientWidth, setGradientWidth] = useState(0.0);
    const [gradientIntensity, setGradientIntensity] = useState(0.4);
    const [bloomStrength, setBloomStrength] = useState(0.15);
    const [bloomRadius, setBloomRadius] = useState(0.001);
    const [showTexture, setShowTexture] = useState(true);
    const [backgroundColor, setBackgroundColor] = useState('#000000');
    
    // Loop and hover state
    const [loopEnabled, setLoopEnabled] = useState(false);
    const [loopType, setLoopType] = useState<'oneShot' | 'repeat' | 'mirror'>('repeat');
    const [loopDuration, setLoopDuration] = useState(3);
    const [loopEasing, setLoopEasing] = useState('easeInOut');
    const [hoverEnabled, setHoverEnabled] = useState(!isMobile);
    const [progressDirection, setProgressDirection] = useState<'topToBottom' | 'bottomToTop' | 'leftToRight' | 'rightToLeft' | 'centerOutward' | 'outwardToCenter'>('topToBottom');
    
    // Mouse and progress state
    const [progress, setProgress] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [loopProgress, setLoopProgress] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionStartProgress, setTransitionStartProgress] = useState(0);
    const [transitionStartTime, setTransitionStartTime] = useState(0);
    const [mirrorDirection, setMirrorDirection] = useState<'forward' | 'backward'>('forward');
    const containerRef = useRef<HTMLDivElement>(null);
    const loopAnimation = useAnimation();
    const loopProgressMotion = useMotionValue(0);
  
    // Convert GSAP easing to Framer Motion easing
    const getEasing = (easing: string) => {
      switch (easing) {
        case 'power2.inOut': return 'easeInOut';
        case 'power2.in': return 'easeIn';
        case 'power2.out': return 'easeOut';
        case 'power1.inOut': return 'easeInOut';
        case 'power1.in': return 'easeIn';
        case 'power1.out': return 'easeOut';
        default: return 'easeInOut';
      }
    };
  
    // Loop animation with Framer Motion
    useEffect(() => {
      if (!loopEnabled) {
        loopAnimation.stop();
        return;
      }
  
      // Stop any existing animation
      loopAnimation.stop();
  
      const animateLoop = async () => {
        if (loopType === 'oneShot') {
          await loopAnimation.start({
            x: [0, 1],
            transition: {
              duration: loopDuration,
              ease: getEasing(loopEasing),
            }
          });
        } else if (loopType === 'repeat') {
          await loopAnimation.start({
            x: [0, 1],
            transition: {
              duration: loopDuration,
              ease: getEasing(loopEasing),
              repeat: Infinity,
              repeatType: 'loop',
            }
          });
        } else if (loopType === 'mirror') {
          // Custom mirror implementation with direction tracking
          const runMirrorLoop = async () => {
            setMirrorDirection('forward');
            
            while (loopEnabled) {
              // Forward animation: 0 -> 1
              setMirrorDirection('forward');
              await loopAnimation.start({
                x: [0, 1],
                transition: {
                  duration: loopDuration,
                  ease: getEasing(loopEasing),
                }
              });
              
              if (!loopEnabled) break;
              
              // Backward animation: 1 -> 0
              setMirrorDirection('backward');
              await loopAnimation.start({
                x: [1, 0],
                transition: {
                  duration: loopDuration,
                  ease: getEasing(loopEasing),
                }
              });
            }
          };
          
          runMirrorLoop();
        }
      };
  
      animateLoop();
  
      return () => {
        loopAnimation.stop();
      };
    }, [loopEnabled, loopDuration, loopType, loopEasing, loopAnimation]);
  
    // Update progress based on loop animation
    useEffect(() => {
      const unsubscribe = loopProgressMotion.on('change', (latest) => {
        setLoopProgress(latest);
        // Only set the main progress if not hovering and not transitioning
        if (!isHovering && !isTransitioning) {
        setProgress(latest);
        }
      });
  
      return unsubscribe;
    }, [loopProgressMotion, isHovering, isTransitioning]);
  
    // Handle hover state changes for loop animation control
    useEffect(() => {
      if (!loopEnabled) return;
      
      if (isHovering && hoverEnabled && !isMobile) {
        loopAnimation.stop();
      }
    }, [isHovering, hoverEnabled, loopEnabled, isMobile, loopAnimation]);
  
    // Handle mouse movement to control the scanning effect
    const handleMouseMove = (e: React.MouseEvent) => {
      if (!containerRef.current || !hoverEnabled || isMobile) return;
      
      // Get the bounding rectangle of the container
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate progress based on direction
      let relativeProgress: number;
      
      switch (progressDirection) {
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
      
      // Handle smooth transition during hover
      if (isHovering) {
        if (isTransitioning) {
          // During transition from loop to hover, smoothly interpolate
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
          }
        } else {
          // After transition or no loop - follow cursor directly
          setProgress(clampedProgress);
        }
      }
    };
  
    // Handle mouse entering the container
    const handleMouseEnter = () => {
      if (!hoverEnabled || isMobile) return;
      setIsHovering(true);
      
      // If loop is active, start transition from current progress to hover
      if (loopEnabled) {
        setIsTransitioning(true);
        setTransitionStartProgress(progress);
        setTransitionStartTime(Date.now());
        // Pause the loop animation
        loopAnimation.stop();
      }
    };
  
    // Handle mouse leaving the container
    const handleMouseLeave = async () => {
      if (!hoverEnabled || isMobile) return;
      setIsHovering(false);
      setIsTransitioning(false);
      
      if (loopEnabled) {
        // First, complete the current cycle from hover-out position to 1
        const remainingDuration = loopDuration * (1 - progress);
        
        // Set the current position and animate to complete the cycle
        loopAnimation.set({ x: progress });
        
        if (loopType === 'oneShot') {
          // For one shot, just complete to 1 and stop
          loopAnimation.start({
            x: 1,
            transition: {
              duration: remainingDuration,
              ease: getEasing(loopEasing),
            }
          });
        } else {
          // For repeat and mirror, complete current cycle then restart natural cycle
          await loopAnimation.start({
            x: 1,
            transition: {
              duration: remainingDuration,
              ease: getEasing(loopEasing),
            }
          });
          
          // Then start the natural loop cycle from 0
          if (loopType === 'repeat') {
            loopAnimation.start({
              x: [0, 1],
              transition: {
                duration: loopDuration,
                ease: getEasing(loopEasing),
                repeat: Infinity,
                repeatType: 'loop',
              }
            });
          } else if (loopType === 'mirror') {
            // For mirror mode, determine direction based on current progress and continue appropriately
            const runMirrorLoop = async () => {
              // Since we just completed to 1, we should now go backward (1 -> 0)
              setMirrorDirection('backward');
              await loopAnimation.start({
                x: [1, 0],
                transition: {
                  duration: loopDuration,
                  ease: getEasing(loopEasing),
                }
              });
              
              // After reaching 0, continue with normal mirror loop
              while (loopEnabled) {
                // Forward animation: 0 -> 1
                setMirrorDirection('forward');
                await loopAnimation.start({
                  x: [0, 1],
                  transition: {
                    duration: loopDuration,
                    ease: getEasing(loopEasing),
                  }
                });
                
                if (!loopEnabled) break;
                
                // Backward animation: 1 -> 0
                setMirrorDirection('backward');
                await loopAnimation.start({
                  x: [1, 0],
                  transition: {
                    duration: loopDuration,
                    ease: getEasing(loopEasing),
                  }
                });
              }
            };
            
            runMirrorLoop();
          }
        }
      }
    };
  
    // Debug loading state
    useEffect(() => {
      console.log('Loading state changed:', isLoading);
    }, [isLoading]);
  
    return (
      <div style={{height: '100%', width:"100%"}}>
        {/* Hidden motion div to track loop animation progress */}
        <motion.div
          style={{ display: 'none' }}
          animate={loopAnimation}
          onUpdate={(latest: any) => {
            if (typeof latest.x === 'number') {
              loopProgressMotion.set(latest.x);
            }
          }}
        />
        
        {isLoading && (
          <div
            style={{
              height: '100%',
              position: 'fixed',
              zIndex: 90,
              backgroundColor: '#92400e',
              pointerEvents: 'none',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isLoading ? 1 : 0,
              transition: 'opacity 0.5s ease-out',
            }}
            data-loader
          >
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                backgroundColor: 'white',
                borderRadius: '50%',
                animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            ></div>
          </div>
        )}
        
        <div 
          style={{ height: '100%' }}
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            style={{
              height: '100%',
              textTransform: 'uppercase',
              alignItems: 'center',
              width: '100%',
              position: 'absolute',
              zIndex: 60,
              pointerEvents: 'none',
              padding: '0 2.5rem',
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
          </div>
  
          <WebGPUCanvas>
            <PostProcessing></PostProcessing>
            <Scene 
              dotSize={dotSize}
              dotColor={dotColor}
              tilingScale={tilingScale}
              effectType={effectType}
              gradientWidth={gradientWidth/10}
              gradientIntensity={gradientIntensity}
              bloomStrength={bloomStrength}
              bloomRadius={bloomRadius}
              showTexture={showTexture}
              backgroundColor={backgroundColor}
              progress={progress}
              textureMap={textureMap}
              depthMap={depthMap}
            />
          </WebGPUCanvas>
  
          {/* Debug Panel */}
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 1000,
            minWidth: '200px',
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Debug Panel</h4>
            <div style={{ marginBottom: '5px' }}>Current Progress: {(progress * 100).toFixed(1)}%</div>
            <div style={{ marginBottom: '5px' }}>Loop Progress: {(loopProgress * 100).toFixed(1)}%</div>
            <div style={{ marginBottom: '5px' }}>Loop Enabled: {loopEnabled ? 'YES' : 'NO'}</div>
            <div style={{ marginBottom: '5px' }}>Hover Enabled: {hoverEnabled ? 'YES' : 'NO'}</div>
            <div style={{ marginBottom: '5px' }}>Is Hovering: {isHovering ? 'YES' : 'NO'}</div>
            <div style={{ marginBottom: '5px' }}>Is Transitioning: {isTransitioning ? 'YES' : 'NO'}</div>
            <div style={{ marginBottom: '5px' }}>Loop Type: {loopType}</div>
            <div style={{ marginBottom: '5px' }}>Mirror Direction: {mirrorDirection}</div>
          </div>
  
          {/* Toggle button for controls */}
          {!isVisible && (
            <button
              onClick={() => setIsVisible(true)}
              style={{
                position: 'fixed',
                top: '20px',
                right: '250px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 12px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
                zIndex: 1000,
              }}
            >
              Show Controls
            </button>
          )}
  
          {/* UI Controls */}
          <UIControls
            dotSize={dotSize}
            setDotSize={setDotSize}
            dotColor={dotColor}
            setDotColor={setDotColor}
            tilingScale={tilingScale}
            setTilingScale={setTilingScale}
            isVisible={isVisible}
            setIsVisible={setIsVisible}
            effectType={effectType}
            setEffectType={setEffectType}
            gradientWidth={gradientWidth}
            setGradientWidth={setGradientWidth}
            gradientIntensity={gradientIntensity}
            setGradientIntensity={setGradientIntensity}
            bloomStrength={bloomStrength}
            setBloomStrength={setBloomStrength}
            bloomRadius={bloomRadius}
            setBloomRadius={setBloomRadius}
            showTexture={showTexture}
            setShowTexture={setShowTexture}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            loopEnabled={loopEnabled}
            setLoopEnabled={setLoopEnabled}
            loopType={loopType}
            setLoopType={setLoopType}
            loopDuration={loopDuration}
            setLoopDuration={setLoopDuration}
            loopEasing={loopEasing}
            setLoopEasing={setLoopEasing}
            hoverEnabled={hoverEnabled}
            setHoverEnabled={setHoverEnabled}
            progressDirection={progressDirection}
            setProgressDirection={setProgressDirection}
          />
        </div>
      </div>
    );
  };
  
  export default function Home(props: { textureMap?: any; depthMap?: any }) {
    return (
      <ContextProvider>
        <Html textureMap={props.textureMap} depthMap={props.depthMap}></Html>
      </ContextProvider>
    );
  }
  