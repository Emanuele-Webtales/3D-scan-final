# BUNDLING_FIXES.md

## 🎯 **Strategy: Missing TSL Imports Fix**

### **Problem Analysis**
The build is failing because 4 TSL functions are missing from the `three-tsl-bundle`:
- `bloom`
- `mx_cell_noise_float` 
- `oneMinus`
- `select`

### **Proposed Solution: Auxiliary Bundle Approach**

#### **Phase 1: Create Missing Imports Bundle**
1. **Create** `missing-imports-bundle/` directory
2. **Bundle only the 4 missing functions** into a minimal bundle
3. **Test locally** to ensure it exports correctly
4. **Copy bundle code** directly into Framer as `AuxiliaryBundle.tsx`

#### **Phase 2: Integration Strategy**
1. **Import missing functions** from `AuxiliaryBundle.tsx`
2. **Use them in shader code** alongside existing TSL imports
3. **Test shader functionality** with proper depth mapping

---

## 📋 **Implementation Plan**

### **Step 1: Research Missing Functions**
- **`bloom`**: Likely a post-processing effect function
- **`mx_cell_noise_float`**: MaterialX cell noise function
- **`oneMinus`**: Common shader utility (1.0 - value)
- **`select`**: Conditional selection function

### **Step 2: Bundle Creation Strategy**
```bash
# Create minimal bundle structure
missing-imports-bundle/
├── package.json
├── rollup.config.js
├── src/
│   └── index.js
└── README.md
```

### **Step 3: Function Implementation**
```javascript
// src/index.js - Minimal implementations
export const bloom = (input, intensity) => { /* bloom logic */ }
export const mx_cell_noise_float = (position) => { /* noise logic */ }
export const oneMinus = (value) => 1.0 - value
export const select = (condition, a, b) => condition ? a : b
```

### **Step 4: Bundle Configuration**
```javascript
// rollup.config.js - Minimal bundle
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
    name: 'MissingImportsBundle'
  }
}
```

---

## 🎯 **Advantages of This Approach**

### **✅ Safety**
- **No risk** to existing bundles
- **Local testing** before deployment
- **Easy rollback** if issues arise

### **✅ Simplicity**
- **Small bundle** (only 4 functions)
- **Direct copy-paste** into Framer
- **No external dependencies**

### **✅ Compatibility**
- **Works with existing TSL imports**
- **No bundle conflicts**
- **Framer-friendly format**

---

## 🚀 **Execution Steps**

### **Phase 1: Bundle Creation**
1. **Create** `missing-imports-bundle/` directory
2. **Research** each missing function's implementation
3. **Implement** minimal working versions
4. **Bundle** with rollup
5. **Test** bundle exports locally

### **Phase 2: Framer Integration**
1. **Copy** bundle code to `AuxiliaryBundle.tsx`
2. **Import** missing functions in shader code
3. **Test** shader compilation
4. **Verify** depth mapping works

### **Phase 3: Shader Implementation**
1. **Replace** Canvas-based approach with TSL shaders
2. **Use** proper depth mapping logic from `page.tsx`
3. **Test** all scan types (gradient, dots, cross)
4. **Optimize** performance

---

## 🔍 **Risk Assessment**

### **Low Risk**
- **Bundle size**: Only 4 functions
- **Dependencies**: Minimal
- **Testing**: Local verification possible

### **Medium Risk**
- **Function accuracy**: May need to match exact TSL implementations
- **Shader compatibility**: Need to ensure proper integration

### **Mitigation**
- **Start simple**: Basic function implementations
- **Test incrementally**: Function by function
- **Fallback plan**: Keep Canvas approach as backup

---

## 📊 **Success Criteria**

### **✅ Bundle Success**
- [ ] Bundle builds without errors
- [ ] All 4 functions export correctly
- [ ] Bundle size < 10KB

### **✅ Framer Integration**
- [ ] `AuxiliaryBundle.tsx` loads without errors
- [ ] Functions import correctly in shader code
- [ ] No conflicts with existing bundles

### **✅ Shader Success**
- [ ] TSL shaders compile without errors
- [ ] Depth mapping works correctly
- [ ] All scan types function properly

---

## 🎯 **Next Steps**

1. **Create** the `missing-imports-bundle/` directory ✅
2. **Research** and implement the 4 missing functions ✅
3. **Build** and test the minimal bundle ✅
4. **Copy** to Framer as `AuxiliaryBundle.tsx` ✅
5. **Integrate** with existing shader code ✅

## 🎯 **Phase 2: Proper Bundle Creation ✅**

Successfully created a **proper minified bundle** following the readme.md pattern:

### **✅ Bundle Details:**
- **Size**: ~1KB (minified)
- **Format**: ES modules with proper bundling
- **Functions**: All 4 missing TSL functions
- **Location**: `missing-imports-bundle.js` in the project

### **✅ Bundle Contents:**
```javascript
// Minified bundle with all 4 functions:
const t=t=>1-t,                    // oneMinus
e=(t,e,s)=>t?e:s,                 // select  
s=(t,e=1,s=.8)=>({...}),          // bloom
n=(t,e=1)=>{...},                 // mx_cell_noise_float
o={oneMinus:t,select:e,bloom:s,mx_cell_noise_float:n};
export{o as MissingImportsBundle,s as bloom,o as default,n as mx_cell_noise_float,t as oneMinus,e as select};
```

## 🎯 **Phase 3: Test Integration**

Now we need to test if the proper bundle resolves the missing imports:

1. **Check** if the dev server starts without import errors ✅
2. **Test** if TSL shaders can now use the missing functions
3. **Implement** proper depth mapping with TSL shaders
4. **Verify** all scan types work correctly

**Ready to test the integration?** 🚀