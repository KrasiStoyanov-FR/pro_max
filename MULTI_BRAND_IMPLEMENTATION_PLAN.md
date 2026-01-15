# Multi-Brand Implementation Plan

## 🎯 Objective
Implement a multi-brand system that supports both **Original** and **Pakistan** variants within a single codebase, allowing runtime switching based on configuration.

---

## 📋 Architecture Overview

### Brand Configuration System
- **Environment-based**: Use `VITE_APP_BRAND` environment variable
- **Runtime detection**: Determine brand from URL, subdomain, or config
- **Asset management**: Separate asset folders per brand
- **Dynamic theming**: CSS variables + Tailwind config per brand
- **Feature flags**: Optional feature restrictions per brand

---

## 🏗️ Implementation Steps

### Phase 1: Brand Configuration Infrastructure

#### Step 1.1: Create Brand Configuration System
**Files to create:**
- `src/config/brands.ts` - Brand definitions
- `src/config/brandConfig.ts` - Brand detection and access
- `src/composables/useBrand.ts` - Brand composable for components

**Brand definitions will include:**
- Color schemes (primary colors)
- Logo paths
- Flag/icon paths
- Brand name
- Feature flags
- Authentication accounts

#### Step 1.2: Environment Configuration
**Update:**
- `env.example` - Add `VITE_APP_BRAND=original|pakistan`
- `.env.local` - Set default brand
- `vite.config.ts` - Pass brand to build

---

### Phase 2: Asset Management

#### Step 2.1: Organize Assets by Brand
**New structure:**
```
src/assets/
├── brands/
│   ├── original/
│   │   ├── logo.png
│   │   ├── logo.svg (if needed)
│   │   └── flag.svg (if needed)
│   └── pakistan/
│       ├── logo.svg
│       ├── logo-1.png
│       ├── logo-2.png
│       └── pakistan_flag.svg
└── images/ (shared assets)
    ├── hero_background.jpg
    └── ...
```

#### Step 2.2: Asset Loading Utility
**Create:** `src/utils/assets.ts`
- Function to get brand-specific asset paths
- Fallback to default assets if brand asset missing

---

### Phase 3: Dynamic Theming

#### Step 3.1: Update Tailwind Configuration
**Modify:** `tailwind.config.js`
- Make primary colors dynamic based on brand
- Use CSS variables for runtime switching
- Support both color schemes

**Approach:**
```javascript
// Generate Tailwind config based on brand
const getBrandColors = (brand) => {
  const brands = {
    original: { /* teal colors */ },
    pakistan: { /* blue colors */ }
  }
  return brands[brand] || brands.original
}
```

#### Step 3.2: CSS Variables System
**Create:** `src/styles/brand-variables.scss`
- Define CSS custom properties for colors
- Update variables based on active brand
- Ensure Tailwind uses these variables

---

### Phase 4: Component Updates

#### Step 4.1: Login Page
**Update:** `src/pages/Login.vue`
- Use brand config for logo selection
- Conditionally show flag based on brand
- Use brand-specific styling

#### Step 4.2: Sidebar
**Update:** `src/components/layout/Sidebar.vue`
- Use brand config for logo
- Apply brand-specific border radius if needed

#### Step 4.3: All Components Using Primary Colors
**Update:** Components that use `primary-*` classes
- Ensure they work with both color schemes
- Test visual appearance for both brands

---

### Phase 5: Authentication & Feature Flags

#### Step 5.1: Brand-Specific Authentication
**Update:** `src/store/auth.ts`
- Keep all master accounts (already done)
- Optionally restrict accounts per brand if needed

#### Step 5.2: Feature Flags (Optional)
**Create:** `src/config/features.ts`
- Define available features per brand
- Create composable `useFeatures.ts`
- Use in components to show/hide features

---

### Phase 6: Build & Deployment

#### Step 6.1: Build Scripts
**Update:** `package.json`
- Add brand-specific build scripts:
  - `build:original`
  - `build:pakistan`
  - `build:all` (build both)

#### Step 6.2: Environment Files
**Create:**
- `.env.original` - Original brand config
- `.env.pakistan` - Pakistan brand config
- Update build process to use appropriate env file

---

## 📁 File Structure After Implementation

```
pro_max/
├── src/
│   ├── config/
│   │   ├── brands.ts          # Brand definitions
│   │   ├── brandConfig.ts     # Brand detection logic
│   │   └── features.ts        # Feature flags (optional)
│   ├── composables/
│   │   └── useBrand.ts         # Brand composable
│   ├── utils/
│   │   └── assets.ts          # Asset path resolver
│   ├── styles/
│   │   ├── brand-variables.scss # CSS variables
│   │   └── tailwind.scss
│   ├── assets/
│   │   ├── brands/
│   │   │   ├── original/
│   │   │   └── pakistan/
│   │   └── images/ (shared)
│   └── ...
├── .env.original
├── .env.pakistan
└── ...
```

---

## 🔧 Technical Implementation Details

### Brand Detection Strategy

**Option 1: Environment Variable (Recommended for Build-time)**
```typescript
const brand = import.meta.env.VITE_APP_BRAND || 'original'
```

**Option 2: URL/Subdomain Detection (Runtime)**
```typescript
const brand = window.location.hostname.includes('pakistan') 
  ? 'pakistan' 
  : 'original'
```

**Option 3: Configuration File**
```typescript
// Load from API or config file
const brand = await fetch('/api/brand-config').then(r => r.json())
```

### Color Scheme Implementation

**Method 1: CSS Variables (Recommended)**
```scss
:root[data-brand="original"] {
  --primary-600: #00E0B8; // Teal
}

:root[data-brand="pakistan"] {
  --primary-600: #0C5AFA; // Blue
}
```

**Method 2: Dynamic Tailwind Config**
```javascript
// Generate config at build time based on brand
export default defineConfig({
  theme: {
    colors: getBrandColors(brand)
  }
})
```

### Asset Loading

```typescript
// src/utils/assets.ts
export function getBrandAsset(path: string): string {
  const brand = useBrandConfig().currentBrand
  const brandPath = `/src/assets/brands/${brand}/${path}`
  
  // Try brand-specific asset first, fallback to shared
  try {
    return new URL(brandPath, import.meta.url).href
  } catch {
    return new URL(`/src/assets/images/${path}`, import.meta.url).href
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Create `src/config/brands.ts` with brand definitions
- [ ] Create `src/config/brandConfig.ts` for brand detection
- [ ] Create `src/composables/useBrand.ts` composable
- [ ] Update `env.example` with `VITE_APP_BRAND`
- [ ] Test brand detection logic

### Phase 2: Assets
- [ ] Create `src/assets/brands/original/` folder
- [ ] Create `src/assets/brands/pakistan/` folder
- [ ] Copy Pakistan assets from `_pro-max__pakistan/`
- [ ] Create `src/utils/assets.ts` utility
- [ ] Test asset loading for both brands

### Phase 3: Theming
- [ ] Update `tailwind.config.js` for dynamic colors
- [ ] Create `src/styles/brand-variables.scss`
- [ ] Implement CSS variable system
- [ ] Test color switching
- [ ] Verify all UI components with both themes

### Phase 4: Components
- [ ] Update `Login.vue` for brand-specific logo/flag
- [ ] Update `Sidebar.vue` for brand logo
- [ ] Review all components using primary colors
- [ ] Test visual appearance for both brands

### Phase 5: Authentication
- [ ] Verify auth accounts work for both brands
- [ ] (Optional) Implement feature flags
- [ ] Test authentication flow for both brands

### Phase 6: Build & Deploy
- [ ] Create `.env.original` file
- [ ] Create `.env.pakistan` file
- [ ] Update build scripts in `package.json`
- [ ] Test builds for both brands
- [ ] Document deployment process

---

## 🚀 Quick Start Guide

### Development
```bash
# Original brand
VITE_APP_BRAND=original npm run dev

# Pakistan brand
VITE_APP_BRAND=pakistan npm run dev
```

### Production Build
```bash
# Build original
VITE_APP_BRAND=original npm run build

# Build Pakistan
VITE_APP_BRAND=pakistan npm run build

# Or use scripts
npm run build:original
npm run build:pakistan
```

---

## 🎨 Brand-Specific Differences

### Original Brand
- **Colors**: Teal/Cyan primary (#00E0B8)
- **Logo**: logo.png with srcset
- **Flag**: None
- **Sidebar Radius**: 0.75rem (collapsed)
- **Accounts**: master@promax.com, admin@radar.com

### Pakistan Brand
- **Colors**: Blue primary (#0C5AFA)
- **Logo**: logo.svg (vector)
- **Flag**: pakistan_flag.svg displayed
- **Sidebar Radius**: 0.25rem (collapsed)
- **Accounts**: master@promax.com, master@bluesurge.com, admin@radar.com

---

## 🔒 Feature Flags (Optional)

If you need to restrict features per brand:

```typescript
// src/config/features.ts
export const brandFeatures = {
  original: {
    drones: true,
    reports: true,
    advancedAnalytics: true
  },
  pakistan: {
    drones: true,
    reports: true,
    advancedAnalytics: false // Example: locked feature
  }
}
```

---

## 📝 Next Steps

1. **Review this plan** and adjust as needed
2. **Start with Phase 1** - Brand configuration infrastructure
3. **Test incrementally** after each phase
4. **Document** any deviations from the plan
5. **Deploy** both brands independently or together

---

## 🆘 Troubleshooting

### Issue: Colors not switching
- Check CSS variables are properly defined
- Verify Tailwind config includes CSS variables
- Ensure `data-brand` attribute is set on root element

### Issue: Assets not loading
- Verify asset paths in brand config
- Check file structure matches expected paths
- Test asset utility function

### Issue: Build fails
- Ensure environment variable is set
- Check brand config is valid
- Verify all required assets exist

---

**Ready to implement?** Start with Phase 1 and work through each step systematically!

