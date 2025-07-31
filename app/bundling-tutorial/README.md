# GSAP Bundling Tutorial for Framer

This tutorial demonstrates how to use GSAP (GreenSock Animation Platform) in React components that can be easily converted to Framer Code Components.

## Components Overview

### 1. `page.tsx` - Main Demo Page
A comprehensive demo page showcasing various GSAP animations including:
- Click animations with color changes and rotation
- Scroll-triggered animations with ScrollTrigger
- Sticky animations with pinning
- Parallax effects
- Floating particles

### 2. `GSAPSquare.tsx` - Reusable Square Component
A modular GSAP component that demonstrates:
- Click animations with random colors
- Scroll-triggered parallax effects
- Customizable props (size, color, text)
- Animation completion callbacks
- Click counter display

### 3. `AdvancedGSAPDemo.tsx` - Advanced Animation Demo
Showcases advanced GSAP techniques:
- Morphing shapes (border-radius animations)
- Motion path animations
- Stagger animations for multiple elements
- Complex timeline sequences
- ScrollTrigger with markers

## Key GSAP Features Demonstrated

### ScrollTrigger
```typescript
gsap.timeline({
  scrollTrigger: {
    trigger: element,
    start: "top center",
    end: "bottom center",
    scrub: 1,
    pin: true,
    onUpdate: (self) => {
      // Custom scroll logic
    }
  }
})
```

### Timeline Animations
```typescript
const timeline = gsap.timeline()
timeline
  .to(element, { scale: 1.2, duration: 1 })
  .to(element, { rotation: 180, duration: 1 })
  .to(element, { y: 100, duration: 1 })
```

### Motion Path
```typescript
gsap.to(element, {
  motionPath: {
    path: [{ x: 0, y: 0 }, { x: 100, y: -50 }],
    autoRotate: true
  }
})
```

## Converting to Framer Code Components

### Step 1: Add Framer Annotations
```typescript
/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
```

### Step 2: Add Property Controls
```typescript
import { addPropertyControls, ControlType } from "framer"

addPropertyControls(GSAPSquare, {
  size: {
    type: ControlType.Number,
    title: "Size",
    min: 50,
    max: 300,
    defaultValue: 128
  },
  color: {
    type: ControlType.Color,
    title: "Color",
    defaultValue: "#fbbf24"
  },
  text: {
    type: ControlType.String,
    title: "Text",
    defaultValue: "GSAP"
  }
})
```

### Step 3: Handle Canvas vs Preview
```typescript
import { RenderTarget } from "framer"

if (RenderTarget.current() === RenderTarget.canvas) {
  return <CanvasPreview {...props} />
}
```

### Step 4: Proper Prop Spreading
```typescript
return (
  <motion.div
    style={{
      ...style, // Always spread the style prop
      width: size,
      height: size
    }}
  >
    {children}
  </motion.div>
)
```

## GSAP Plugin Registration

Always register GSAP plugins at the top of your component:

```typescript
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)
}
```

## Best Practices

1. **Cleanup**: Always kill ScrollTrigger instances on component unmount
2. **TypeScript**: Use proper typing for refs and props
3. **Performance**: Use `useCallback` for event handlers
4. **Canvas Preview**: Provide meaningful preview content for Framer canvas
5. **Error Handling**: Wrap GSAP animations in try-catch blocks

## Running the Demo

1. Navigate to the Bundling-tutorial folder
2. Run `npm run dev` in the next-dev directory
3. Visit `http://localhost:3000/Bundling-tutorial`
4. Scroll and click to see animations in action

## Next Steps

1. Convert these components to Framer Code Components
2. Add more complex animations
3. Create reusable animation presets
4. Implement performance optimizations
5. Add accessibility features

## Resources

- [GSAP Documentation](https://greensock.com/docs/)
- [ScrollTrigger Guide](https://greensock.com/docs/v3/Plugins/ScrollTrigger)
- [Framer Code Components](https://www.framer.com/developers/)
- [GSAP + React Best Practices](https://greensock.com/react/) 