# Multi-Brand Setup Guide

## ✅ Implementation Complete!

The multi-brand system has been successfully implemented. You can now run both **Original** and **Pakistan** variants from a single codebase.

---

## 🚀 Quick Start

### Development

**Original Brand (Default):**
```bash
npm run dev
# or explicitly
npm run dev:original
```

**Pakistan Brand:**
```bash
npm run dev:pakistan
```

**Full Stack (Original):**
```bash
npm start
# or explicitly
npm start:original
```

**Full Stack (Pakistan):**
```bash
npm start:pakistan
```

### Production Build

**Original Brand:**
```bash
npm run build:original
```

**Pakistan Brand:**
```bash
npm run build:pakistan
```

**Default Build (uses Original):**
```bash
npm run build
```

---

## ⚙️ Configuration

### Environment Variable

Set the brand in your `.env.local` file:

```bash
# For Original brand
VITE_APP_BRAND=original

# For Pakistan brand
VITE_APP_BRAND=pakistan
```

### Brand Detection Priority

The system detects the brand in this order:
1. **Environment Variable** (`VITE_APP_BRAND`) - Highest priority
2. **URL/Subdomain** - If hostname contains "pakistan" or "pk"
3. **Pathname** - If URL path starts with "/pakistan"
4. **LocalStorage** - User preference stored in browser
5. **Default** - Falls back to "original"

---

## 📁 File Structure

```
pro_max/
├── src/
│   ├── config/
│   │   ├── brands.ts          # Brand definitions
│   │   └── brandConfig.ts     # Brand detection & initialization
│   ├── composables/
│   │   └── useBrand.ts        # Brand composable for components
│   ├── styles/
│   │   ├── brand-variables.scss  # CSS variables per brand
│   │   └── tailwind.scss
│   ├── assets/
│   │   ├── brands/
│   │   │   ├── original/      # Original brand assets (if needed)
│   │   │   └── pakistan/      # Pakistan brand assets
│   │   │       ├── logo.svg
│   │   │       └── pakistan_flag.svg
│   │   └── images/            # Shared assets
│   └── ...
```

---

## 🎨 Brand Differences

### Original Brand
- **Colors**: Teal/Cyan primary (#00E0B8)
- **Logo**: PNG with responsive srcset
- **Flag**: None
- **Sidebar Radius**: 0.75rem (collapsed)
- **Master Accounts**: 
  - master@promax.com
  - admin@radar.com

### Pakistan Brand
- **Colors**: Blue primary (#0C5AFA)
- **Logo**: SVG vector format
- **Flag**: Pakistan flag displayed on login
- **Sidebar Radius**: 0.25rem (collapsed)
- **Master Accounts**: 
  - master@promax.com
  - master@bluesurge.com
  - admin@radar.com

---

## 🔧 Using Brand System in Components

### Basic Usage

```vue
<script setup lang="ts">
import { useBrand } from '@/composables/useBrand'

const { brand, brandName, brandColors, getLogo, shouldShowFlag } = useBrand()

// Get logo
const logo = getLogo()

// Check if flag should be shown
const showFlag = shouldShowFlag()
</script>

<template>
  <div>
    <img :src="logo.src" :srcset="logo.srcset" alt="Logo" />
    <img v-if="showFlag" :src="getFlag()" alt="Flag" />
  </div>
</template>
```

### Accessing Brand Colors

Colors are automatically applied via CSS variables. Use Tailwind classes as normal:

```vue
<button class="bg-primary-600 hover:bg-primary-700">
  Click me
</button>
```

The `primary-*` classes will automatically use the correct color based on the active brand.

---

## 📝 Updated Components

The following components have been updated to support multi-brand:

1. **Login.vue** - Brand-specific logo and flag display
2. **Sidebar.vue** - Brand-specific logo and border radius
3. **All components** - Automatic color theming via CSS variables

---

## 🐛 Troubleshooting

### Colors not switching?
- Check that `brand-variables.scss` is imported in `main.ts`
- Verify `initializeBrand()` is called before app mount
- Check browser console for errors
- Ensure `data-brand` attribute is set on `<html>` element

### Assets not loading?
- Verify asset files exist in `src/assets/brands/[brand]/`
- Check asset paths in `brands.ts` configuration
- Ensure Vite is configured to serve assets from these paths

### Build fails?
- Ensure `cross-env` package is installed: `npm install --save-dev cross-env`
- Check environment variable is set correctly
- Verify all brand assets exist

---

## 📦 Dependencies

**New dependency required:**
- `cross-env` - For cross-platform environment variable support

Install it:
```bash
npm install --save-dev cross-env
```

---

## 🎯 Next Steps

1. **Test both brands** in development
2. **Build both variants** and verify production builds
3. **Deploy** using appropriate brand configuration
4. **Add more brands** if needed (follow the pattern in `brands.ts`)

---

## 📚 Additional Resources

- See `MULTI_BRAND_IMPLEMENTATION_PLAN.md` for detailed implementation notes
- See `PROJECT_COMPARISON.md` for differences between original and Pakistan versions

---

**Ready to use!** 🚀

Switch between brands using environment variables or build scripts.

