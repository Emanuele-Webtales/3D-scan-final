# Depth Mapping Strategy: Implementing 3D Scanning in Framer Version

## Problem Analysis

The Framer version currently shows a **straight horizontal scanning line** instead of the **depth-based curved scanning line** that follows the contours of the 3D scene. This is because the Framer version is using a **Canvas-based overlay approach** instead of the **shader-based depth mapping** from the working Next.js version.

## Key Differences Between Versions

### Working Next.js Version (`next-dev/app/effect1/page.tsx`)
- **Uses TSL shaders** with depth map integration
- **Real 3D displacement**: `texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)))`
- **Depth-based scanning**: `abs(depth.r.sub(uProgress))` - compares depth values with progress
- **Shader-based effects**: All scanning effects are calculated in GPU shaders
- **Proper depth integration**: The depth map actually affects the scanning line shape

### Current Framer Version (`CLOSEST TO BE WORKING.tsx`)
- **Uses Canvas overlay approach** - creates scanning effect on a separate canvas
- **No depth integration**: Scanning line is purely based on Y position: `currentProgress * canvas.height`
- **2D overlay**: The scanning effect is just a visual overlay, not integrated with the 3D depth
- **Straight line**: Always horizontal because it's just a canvas gradient

## Root Cause

The Framer version removed the TSL shader approach due to compatibility issues and replaced it with a simpler Canvas-based overlay. However, this completely eliminated the depth-based scanning functionality.

## Implementation Strategy

### Phase 1: Minimal Depth Integration (Low Risk)
**Goal**: Add basic depth map reading without changing the current Canvas overlay approach.

**Steps**:
1. **Step 1**: Add depth map texture loading to the Canvas overlay
2. **Step 2**: Read depth values from the depth map texture
3. **Step 3**: Modify the scan line position based on depth values
4. **Step 4**: Test each step individually

### Phase 2: Shader-Based Approach (Higher Risk)
**Goal**: Replace Canvas overlay with proper TSL shader-based depth scanning.

**Steps**:
1. **Step 1**: Create a new shader-based material component
2. **Step 2**: Implement basic depth map integration in shader
3. **Step 3**: Add scanning effect calculation in shader
4. **Step 4**: Replace Canvas overlay with shader material
5. **Step 5**: Test each step individually

## Detailed Implementation Plan

### Phase 1: Canvas-Based Depth Integration

#### Step 1: Add Depth Map Loading to Canvas Overlay
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: `scanOverlayMaterial` useMemo (around line 480)
**Change**: Add depth map texture loading alongside main texture

**Code to add**:
```typescript
// Load depth map texture for depth-based scanning
const depthMapTexture = new THREE.TextureLoader().load(depthMapUrl)
```

**Test**: Verify depth map loads without errors in console.

#### Step 2: Create Depth Reading Function
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: Inside `updateScanEffect` function
**Change**: Add function to read depth values from texture

**Code to add**:
```typescript
// Function to get depth value at specific UV coordinates
const getDepthAtPosition = (x: number, y: number) => {
    // Convert canvas coordinates to UV coordinates
    const u = x / canvas.width
    const v = y / canvas.height
    
    // Read depth value from depth map texture
    // This will require creating a temporary canvas to read pixel data
    // Implementation details in next step
}
```

**Test**: Verify function can be called without errors.

#### Step 3: Implement Depth Value Reading
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: Inside `getDepthAtPosition` function
**Change**: Implement actual depth value reading from texture

**Code to add**:
```typescript
// Create temporary canvas to read depth map pixel data
const tempCanvas = document.createElement('canvas')
const tempCtx = tempCanvas.getContext('2d')!
tempCanvas.width = depthMapTexture.image.width
tempCanvas.height = depthMapTexture.image.height
tempCtx.drawImage(depthMapTexture.image, 0, 0)
const imageData = tempCtx.getImageData(u * tempCanvas.width, v * tempCanvas.height, 1, 1)
return imageData.data[0] / 255 // Normalize to 0-1 range
```

**Test**: Verify depth values are being read correctly (log some values).

#### Step 4: Modify Scan Line Based on Depth
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: Inside gradient scanning code (around line 500)
**Change**: Replace fixed scan position with depth-based position

**Code to change**:
```typescript
// BEFORE: Fixed horizontal line
const scanPosition = currentProgress * canvas.height

// AFTER: Depth-based curved line
const scanPosition = currentProgress * canvas.height
for (let x = 0; x < canvas.width; x += 5) { // Sample every 5 pixels
    const depthValue = getDepthAtPosition(x, scanPosition)
    const depthOffset = (depthValue - 0.5) * 50 // Adjust based on depth
    const adjustedY = scanPosition + depthOffset
    
    // Draw scan line at adjusted position
    ctx.fillStyle = `rgba(${r * 120}, ${g * 120}, ${b * 120}, ${intensity * 1.5})`
    ctx.fillRect(x, adjustedY - 2, 5, 4)
}
```

**Test**: Verify scan line now follows depth contours instead of being straight.

### Phase 2: Shader-Based Approach (If Phase 1 Fails)

#### Step 1: Create Shader Material Component
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: After `ScanningScene` component
**Change**: Create new component that uses TSL shaders

**Code to add**:
```typescript
const ShaderBasedScene = React.memo(({ progress, controls }: {
    progress: number
    controls: DebugControls
}) => {
    // This will be implemented in subsequent steps
    return <mesh><planeGeometry /><meshBasicMaterial color="red" /></mesh>
})
```

**Test**: Verify component renders without errors.

#### Step 2: Add Basic Depth Map Integration
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: Inside `ShaderBasedScene`
**Change**: Add depth map texture loading and basic shader setup

**Code to add**:
```typescript
// Load textures using useTexture hook
const [rawMap, depthMap] = useTexture([textureMapUrl, depthMapUrl])

// Create basic material with depth map
const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
        map: rawMap,
        // Add depth map integration here in next step
    })
}, [rawMap, depthMap])
```

**Test**: Verify textures load and material renders correctly.

#### Step 3: Implement TSL Shader with Depth Integration
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: Inside material creation
**Change**: Replace basic material with TSL-based material

**Code to add**:
```typescript
// This will require importing TSL functions and implementing the shader
// Similar to the working page.tsx version
// Implementation details to be added in next step
```

**Test**: Verify shader compiles and renders without errors.

#### Step 4: Add Scanning Effect to Shader
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: Inside TSL shader code
**Change**: Add depth-based scanning calculation

**Code to add**:
```typescript
// Implement the depth-based scanning logic from page.tsx
// This includes the exact same logic for gradient/dots/cross modes
```

**Test**: Verify scanning effect works with depth integration.

#### Step 5: Replace Canvas Overlay
**File**: `CLOSEST TO BE WORKING.tsx`
**Location**: In `SceneContent` component
**Change**: Replace `ScanningScene` with `ShaderBasedScene`

**Code to change**:
```typescript
// BEFORE
return <ScanningScene progress={progress} controls={controls} />

// AFTER
return <ShaderBasedScene progress={progress} controls={controls} />
```

**Test**: Verify the entire system works with shader-based depth scanning.

## Risk Assessment

### Phase 1 (Canvas-Based) - Low Risk
- ✅ **Minimal changes** to existing code
- ✅ **No R3F hooks** - avoids context issues
- ✅ **Gradual implementation** - can test each step
- ❌ **Limited depth integration** - may not achieve full 3D effect
- ❌ **Performance concerns** - reading pixel data every frame

### Phase 2 (Shader-Based) - Higher Risk
- ✅ **Full depth integration** - matches working version exactly
- ✅ **Better performance** - GPU-based calculations
- ✅ **More realistic effect** - proper 3D displacement
- ❌ **R3F hook dependencies** - potential context issues
- ❌ **TSL compatibility** - may have import/bundle issues
- ❌ **Complex implementation** - harder to debug

## Recommended Approach

**Start with Phase 1** because:
1. **Lower risk** - minimal changes to working code
2. **Easier debugging** - can test each step individually
3. **Immediate improvement** - even basic depth integration will be better than straight line
4. **Fallback option** - if Phase 1 works well, Phase 2 becomes optional

## Testing Strategy

### For Each Step:
1. **Implement the change**
2. **Test in Framer preview** - check for console errors
3. **Verify visual result** - ensure no regressions
4. **Only proceed to next step** if current step works perfectly

### Success Criteria:
- ✅ **No WebGL errors** in console
- ✅ **Images still fill container** properly
- ✅ **Scan line follows depth contours** (not straight)
- ✅ **All debug controls still work**
- ✅ **Mouse interaction still works**

## Rollback Plan

If any step introduces errors:
1. **Immediately revert** the current step
2. **Document the issue** in this file
3. **Try alternative approach** or move to Phase 2
4. **Never proceed** with broken code

## Files to Modify

- `next-dev/app/3D-scan/effect1/CLOSEST TO BE WORKING.tsx`
  - `scanOverlayMaterial` useMemo (around line 480)
  - `updateScanEffect` function (around line 490)
  - `SceneContent` component (around line 720)

## Expected Timeline

- **Phase 1**: 2-3 hours (1 hour per step)
- **Phase 2**: 4-6 hours (if Phase 1 doesn't achieve desired result)

## Notes

- **Always test in Framer environment** - not just local development
- **Keep changes minimal** - avoid major refactoring
- **Document any issues** - for future reference
- **Have rollback ready** - version control is crucial 