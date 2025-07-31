# Framer Components Reference Index

This document serves as a comprehensive quick reference for Framer components. Use the search index below to find specific patterns, then refer to the actual component files for detailed implementation.

---

## 🔍 Quick Search Index

### **By Feature Type**
| Feature | Component | Key Pattern |
|---------|-----------|-------------|
| **Animated Counters** | AnimatedNumberCounter | `useMotionValue` + `animate()` |
| **Background Effects** | BlurGradient, ChromaBG | Multi-layer blur, External CDN |
| **Canvas Games** | BricksGame | `requestAnimationFrame` + collision detection |
| **Confetti Effects** | Confetti | `canvas-confetti` + `getBoundingClientRect()` |
| **Cross-Component Communication** | CrossComponentInteraction | Singleton Manager Pattern |
| **Device Sensors** | DeviceTilt | `deviceorientation` + `useSpring` |
| **Dynamic Text** | AutoCopyright, BlurCycle | Date calculation, Text cycling |
| **Easter Eggs** | EasterEgg | `keydown` listener + sequence matching |
| **External Library Integration** | Balloons, ChromaBG, Confetti | ESM CDN imports |
| **Infinite Loops** | BlurCycle | `setInterval` + state management |
| **Interactive Animations** | BricksGame | Keyboard events + game loop |
| **Liquid Backgrounds** | ChromaBG | Unicorn Studio integration |
| **Text Animations** | BlurCycle | Character-by-character animation |

### **By External Library**
| Library | Components | Usage Pattern |
|---------|------------|---------------|
| **balloons-js** | Balloons | `import { balloons } from "https://esm.sh/balloons-js"` |
| **canvas-confetti** | Confetti | `import confetti from "canvas-confetti"` |
| **Framer Motion** | AnimatedNumberCounter, BlurCycle, BlurGradient, DeviceTilt | `useMotionValue`, `useSpring`, `motion` |
| **HTML5 Canvas** | BricksGame | `getContext("2d")` + game loop |
| **Unicorn Studio** | ChromaBG | Dynamic script loading with cache busting |

### **By Implementation Pattern**
| Pattern | Components | Code Pattern |
|---------|------------|--------------|
| **Canvas Detection** | Balloons, BlurCycle, ChromaBG | `RenderTarget.current() === RenderTarget.canvas` |
| **Device Permission** | DeviceTilt | `DeviceOrientationEvent.requestPermission()` |
| **Dynamic Script Loading** | ChromaBG | `document.createElement("script")` + cache busting |
| **Game Loop** | BricksGame | `requestAnimationFrame` + delta time |
| **Key Sequence Detection** | EasterEgg | `keydown` + array matching |
| **Singleton Manager** | CrossComponentInteraction | Static instance pattern |
| **State Cycling** | BlurCycle | `setInterval` + array iteration |
| **Variant Management** | CrossComponentInteraction | `cloneElement` + dynamic props |

### **By Property Control Type**
| Control Type | Components | Example Usage |
|--------------|------------|---------------|
| **Color Controls** | All components | Color pickers for theming |
| **Enum Controls** | ChromaBG, CrossComponentInteraction, Confetti | Predefined options |
| **Font Controls** | AutoCopyright, BlurCycle | Extended font options |
| **Number Controls** | BricksGame, BlurCycle, DeviceTilt | Ranges with min/max |
| **String Controls** | AutoCopyright, BricksGame, EasterEgg | Text customization |
| **Transition Controls** | AnimatedNumberCounter, BlurGradient | Animation timing |

### **Performance Considerations**
| Component | Performance Note | Best Practice |
|-----------|-----------------|---------------|
| **BlurGradient** | Large blur values impact performance | Keep blur < 50px |
| **BricksGame** | Canvas rendering is CPU intensive | Use `requestAnimationFrame` |
| **ChromaBG** | External library loading | Cache busting for development |
| **Confetti** | Particle count affects performance | Limit to 200 particles |
| **CrossComponentInteraction** | Debounced updates | 50ms debounce time |
| **DeviceTilt** | Continuous sensor updates | Use `useSpring` for smoothing |

### **Common Code Patterns**
| Pattern | Usage | Example |
|---------|--------|---------|
| **Canvas vs Preview Detection** | External libraries | `if (!isCanvas) { /* run only in preview */ }` |
| **Dynamic Style Injection** | DeviceTilt | `styleRef.current.textContent = CSS` |
| **Event Cleanup** | All event listeners | `return () => removeEventListener()` |
| **Permission Handling** | DeviceTilt | `try/catch` with fallback |
| **Ref Management** | Canvas games | `useRef` + null checks |
| **State Debouncing** | CrossComponentInteraction | `setTimeout` + cleanup |

---

## 📋 Component Overview

### **AnimatedNumberCounter_Prod.tsx**
**Purpose**: Animated number counters with smooth transitions
**Key Pattern**: `useMotionValue` + `animate()` for smooth number changes
**External Libraries**: Framer Motion

### **AutoCopyright_Prod.tsx**
**Purpose**: Dynamic copyright text with year calculation
**Key Pattern**: Date calculation + string formatting
**External Libraries**: React, Framer

### **Balloons_prod.tsx**
**Purpose**: Floating balloon animations
**Key Pattern**: ESM CDN import + canvas detection
**External Libraries**: balloons-js

### **BlurCycle_prod.tsx**
**Purpose**: Text animation with blur effects
**Key Pattern**: `setInterval` + character-by-character animation
**External Libraries**: Framer Motion

### **BlurGradient_prod.tsx**
**Purpose**: Multi-layer blur gradient effects
**Key Pattern**: 8-layer blur with directional gradients
**External Libraries**: Framer Motion

### **BricksGame_prod.tsx**
**Purpose**: HTML5 Canvas Breakout game
**Key Pattern**: `requestAnimationFrame` + collision detection
**External Libraries**: HTML5 Canvas

### **ChromaBG_prod.tsx**
**Purpose**: Liquid background effects
**Key Pattern**: Dynamic script loading + cache busting
**External Libraries**: Unicorn Studio

### **Confetti_prod.tsx**
**Purpose**: Confetti explosion effects
**Key Pattern**: `canvas-confetti` + `getBoundingClientRect()`
**External Libraries**: canvas-confetti

### **CrossComponentInteraction_prod.tsx**
**Purpose**: Cross-component communication
**Key Pattern**: Singleton manager + variant management
**External Libraries**: Framer Motion

### **DeviceTilt_prod.tsx**
**Purpose**: Device orientation-based animations
**Key Pattern**: `deviceorientation` + `useSpring` smoothing
**External Libraries**: Framer Motion

### **EasterEgg_prod.tsx**
**Purpose**: Hidden key sequence triggers
**Key Pattern**: `keydown` listener + sequence matching
**External Libraries**: React

---

## 📚 Development Guidelines

### **Adding New Components**
1. **Add to Quick Search Index**: Update relevant tables
2. **Brief Overview**: Add to Component Overview section
3. **Document Key Pattern**: Highlight the most important implementation pattern
4. **List External Libraries**: Note any external dependencies

### **Best Practices**
- **Canvas Detection**: Use `RenderTarget.current() === RenderTarget.canvas`
- **Event Cleanup**: Always return cleanup function from `useEffect`
- **Performance**: Consider impact of external libraries
- **Type Safety**: Use proper TypeScript interfaces
- **Error Handling**: Add try/catch for external APIs

### **Common Patterns**
- **External Library Loading**: Check if script exists before loading
- **Permission Handling**: Graceful fallback for unsupported features
- **Animation Loops**: Use `requestAnimationFrame` for smooth animations
- **State Management**: Use refs for frequently changing values
- **Component Communication**: Use singleton pattern for cross-component events

---

## 🔄 Version History

- **v1.0.0**: Initial documentation of all components
- **Components**: 11 documented components with key patterns
- **External Libraries**: 12 unique libraries identified
- **Quick Search**: 6 different categorization tables

---

*This document serves as a quick reference. For detailed implementation, refer to the actual component files.*
