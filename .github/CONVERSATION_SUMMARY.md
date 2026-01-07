# Scubex Development Session Summary

## Date: November 5-11, 2025

---

## 🎯 Main Objectives Achieved

### 1. **Frontend Migration: Zustand → MobX** ✅
- **Goal**: Migrate entire frontend state management from React Query + Zustand to MobX
- **Status**: Successfully completed
- **Impact**: More reactive and maintainable state management architecture

### 2. **GitHub Actions CI/CD Setup** ✅
- **Goal**: Create automated build and deployment workflows
- **Status**: Two workflows created and configured
- **Impact**: Automated testing, building, and GitHub Pages deployment

### 3. **Animated Home Page** ✅
- **Goal**: Create immersive underwater experience with marine life animations
- **Status**: Fully implemented with 13+ species of marine animals
- **Impact**: Engaging, dynamic landing page

---

## 📚 Technical Documentation

### **MobX State Management Architecture**

#### **Store Hierarchy**
```
RootStore
├── SpeciesStore (marine species data & API calls)
└── MapStore (map state & UI controls)
```

#### **Key Concepts Explained**
- **Observables**: Data that can be watched for changes
- **Observers**: React components that auto-update when observables change
- **Actions**: Functions that modify observable state
- **Computed**: Derived values that recalculate automatically

#### **Data Flow**
1. User interacts with UI (clicks "Scan")
2. Component calls store action (`speciesStore.fetchSpecies()`)
3. Store updates observable properties (`isLoading`, `speciesData`)
4. All observer components automatically re-render
5. Computed values recalculate as needed

#### **vs. Zustand**
| Aspect | Zustand | MobX |
|--------|---------|------|
| Philosophy | Functional, immutable | OOP, mutable |
| Learning Curve | Simple | Complex |
| Performance | Manual optimization | Automatic reactivity |
| Boilerplate | Minimal | More setup needed |

#### **Implementation Files**
- `src/lib/stores/SpeciesStore.ts` - Data fetching & species management
- `src/lib/stores/MapStore.ts` - Map state & computed zoom radius
- `src/lib/stores/RootStore.ts` - Store orchestration
- `src/lib/stores/index.tsx` - React context & hooks

---

### **GitHub Actions Workflows**

#### **1. Full Build & Deploy** (`build.yml`)
**Features:**
- Multi-version testing (Node 20.x, 22.x | Java 17, 21)
- Frontend linting & building (TypeScript + Vite)
- Backend testing & packaging (Maven + Spring Boot)
- Integration testing with health checks
- Artifact storage (30 days retention)
- **GitHub Pages deployment** (automatic on `main` push)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main`
- Manual workflow dispatch

#### **2. Simple Build** (`simple-build.yml`)
**Features:**
- Quick build verification
- Frontend + Backend compilation
- Basic testing
- Single Node/Java version

**Triggers:**
- Any push or pull request
- Manual dispatch

#### **Configuration Applied**

##### **Vite Base Path** (`vite.config.ts`)
```typescript
base: mode === 'production' ? '/Scubex/' : '/'
```
- **Development**: Serves from root `/`
- **Production**: Serves from `/Scubex/` for GitHub Pages

##### **React Router Basename** (`App.tsx`)
```typescript
const basename = import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL : '';
<Router basename={basename}>
```
- Automatically uses Vite's BASE_URL
- No manual environment checking needed

---

### **Marine Life Animation System**

#### **Technical Implementation**

##### **Container Structure**
```tsx
<div className="fixed inset-0 pointer-events-none z-0 w-screen h-screen">
  {/* Marine animals */}
</div>
```
- **fixed**: Positioned relative to viewport
- **inset-0**: Covers entire screen
- **pointer-events-none**: Doesn't block UI interaction
- **z-0**: Behind main content

##### **Animation Pattern**
```tsx
<motion.div 
  initial={{ x: '-100px', opacity: 0 }}
  animate={{ 
    x: ['-100px', 'calc(100vw + 100px)'],
    opacity: [0, 0.7, 0.7, 0]
  }}
  transition={{ 
    duration: 15,
    times: [0, 0.1, 0.9, 1],
    repeat: Infinity,
    ease: "linear"
  }}
  style={{ transform: 'scale(-1, 1)' }}
>
  🐟
</motion.div>
```

##### **Emoji Flipping Solution**
**Problem**: Emojis naturally face left ⬅️
**Solution**: Use `transform: scale(-1, 1)` to flip horizontally
**Important**: Must add `inline-block` class for transform to work

#### **Marine Species Catalog**

| Species | Emoji | Direction | Speed | Special Effects |
|---------|-------|-----------|-------|-----------------|
| Fish (Various) | 🐟🐠🐡 | Both | 12-22s | Opacity fade |
| Sea Turtle | 🐢 | L→R | 25s | Vertical bobbing |
| Jellyfish | 🪼 | Stationary | 8-9s | Float & rotate |
| Octopus | 🐙 | L→R | 20s | Tentacle rotation |
| Dolphin | 🐬 | L→R | 10s | Jumping arc |
| Whale | 🐋 | R→L | 35s | Slow, majestic |
| Crab | 🦀 | L→R | 28s | Walking rotation |
| Shark | 🦈 | R→L | 12s | Fast, predatory |

#### **Animation Delays**
Staggered timing prevents all animals appearing simultaneously:
- Range: 2s to 50s delays
- Creates natural, random appearance pattern
- Maintains continuous ocean activity

---

## 🐛 Issues Resolved

### **Issue 1: MobX Map Behavior**
**Problem**: Map reset to default position during scanning, non-functional dot animations
**Root Cause**: Unstable refs and dependency arrays causing map re-initialization
**Solution**: 
- Stable ref management using `useMemo` getters
- Fixed dependency arrays in `MapRender.tsx`
- Implemented `useCallback` for stable function references

### **Issue 2: GitHub Pages 404 Errors**
**Problem**: CSS/JS files returned 404 on deployed site
**Root Cause**: Vite generated absolute paths `/assets/...` but GitHub Pages serves from `/Scubex/`
**Solution**: 
- Set `base: '/Scubex/'` in Vite config for production
- Added `basename` to React Router
- Used `import.meta.env.BASE_URL` for automatic detection

### **Issue 3: React Router "No Routes Matched"**
**Problem**: Router couldn't match location `/Scubex/`
**Root Cause**: Router didn't know about base path
**Solution**: Configured `<Router basename={basename}>` using Vite's BASE_URL

### **Issue 4: Animals Not Swimming Full Width**
**Problem**: Marine animals only moved on left side of screen
**Root Cause**: 
- Used `inset-0` container (constrained)
- Percentage-based positioning relative to parent
**Solution**: 
- Changed to `fixed` positioning with `w-screen h-screen`
- Used absolute pixel + viewport calc: `calc(100vw + 100px)`

### **Issue 5: Animals Swimming Backwards**
**Problem**: Fish appeared to swim backwards relative to their body orientation
**Root Cause**: Animation direction didn't match emoji's natural facing direction
**Solution**: Applied `transform: scale(-1, 1)` to flip emojis swimming left-to-right

### **Issue 6: scaleX(-1) Not Working**
**Problem**: Inline `scaleX(-1)` style didn't flip emojis
**Root Cause**: Conflicts with Framer Motion transforms, emojis need display property
**Solution**: 
- Changed to `transform: scale(-1, 1)`
- Added `inline-block` class to emoji containers

---

## 📁 Files Created/Modified

### **Created**
- `.github/workflows/build.yml` - Full CI/CD pipeline
- `.github/workflows/simple-build.yml` - Quick build verification
- `src/lib/stores/SpeciesStore.ts` - MobX species data store
- `src/lib/stores/MapStore.ts` - MobX map state store
- `src/lib/stores/RootStore.ts` - Root store orchestrator
- `src/lib/stores/index.tsx` - React context provider
- `src/components/MapComponents/MapView.tsx` - Refactored map view
- `src/components/MapComponents/MapRender.tsx` - Map rendering logic
- `src/components/MapComponents/ScanningAnimation.tsx` - Scanning effects
- `.github/CONVERSATION_SUMMARY.md` - This document

### **Modified**
- `vite.config.ts` - Added base path configuration
- `App.tsx` - Added router basename
- `main.tsx` - Wrapped with MobX StoreProvider
- `src/pages/Map.tsx` - Converted to MobX observer
- `src/pages/Home.tsx` - Added marine life animations
- `package.json` - Updated dependencies (removed React Query/Zustand, added MobX)

### **Deleted**
- `src/pages/MapReactQuery.tsx` - Old React Query version
- `src/pages/MapMobX.tsx` - Intermediate migration file
- `src/components/MapView.tsx` - Old monolithic component
- `src/lib/store.ts` - Old Zustand store

---

## 🎓 Learning Resources

### **MobX Documentation**
- [MobX Official Docs](https://mobx.js.org/)
- [MobX React Integration](https://mobx.js.org/react-integration.html)
- Observable, Computed, Actions explained

### **Framer Motion Animation**
- [Animation Controls](https://www.framer.com/motion/animation/)
- [Transform Properties](https://www.framer.com/motion/component/#transform)
- [Timeline & Stagger](https://www.framer.com/motion/transition/)

### **GitHub Actions**
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Pages Deployment](https://github.com/actions/deploy-pages)
- [Artifact Upload/Download](https://github.com/actions/upload-artifact)

---

## 🚀 Next Steps & Recommendations

### **Immediate**
1. ✅ Test GitHub Pages deployment after push
2. ✅ Verify marine animations render correctly on all screen sizes
3. 📝 Consider adding accessibility labels for screen readers

### **Future Enhancements**
1. **Performance Optimization**
   - Code splitting for large chunks (currently 1.4MB JS bundle)
   - Lazy loading for map components
   - Image optimization for species photos

2. **Animation Improvements**
   - Add schools of fish (grouped animations)
   - Seasonal variations (different species per season)
   - User interaction (click animals for info)

3. **State Management**
   - Add persistence layer (localStorage)
   - Implement undo/redo for map interactions
   - Cache API responses

4. **Testing**
   - Add unit tests for MobX stores
   - E2E tests for critical user flows
   - Visual regression testing for animations

5. **Documentation**
   - Component storybook
   - API documentation
   - Deployment guide

---

## 📊 Project Metrics

### **Bundle Sizes**
- **Frontend**: 1,385 kB JS (397 kB gzipped)
- **CSS**: 88 kB (14 kB gzipped)
- **HTML**: 0.5 kB

### **Dependencies Added**
- `mobx` v6.15.0
- `mobx-react-lite` v4.1.1

### **Dependencies Removed**
- `@tanstack/react-query`
- `zustand`

### **Animation Count**
- 13 marine animals
- 15+ bubble elements
- ~30 concurrent animations

---

## 🙏 Acknowledgments

- **MobX Team** - Reactive state management library
- **Framer Motion** - Animation library
- **Vite Team** - Lightning-fast build tool
- **GitHub Actions** - CI/CD platform
- **StackOverflow** - Emoji transform solution

---

## 📞 Contact & Support

For questions about this implementation:
- Review code comments in source files
- Check MobX official documentation
- Reference this summary document

**Repository**: Scubex (Izshin/Scubex)  
**Branch**: main  
**Last Updated**: November 11, 2025
