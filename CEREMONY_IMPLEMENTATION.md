# CeremonyPreview Implementation Notes

## Performance & Accessibility

### Reduced Motion Support
- Uses `useReducedMotion()` hook from Framer Motion
- When reduced motion is preferred:
  - Renders static layout with name, amount, and checkmark
  - No animations, no shimmer border, no phase cycling
  - Glass panel still renders with CSS styling only

### Responsive Design
- Panel width: `min(400px, 85vw)` for responsive scaling
- Font sizes use `clamp()` for smooth scaling across devices
- Tested range: 375px (iPhone SE) through 1440px+ desktop
- Responsive spacing: `mb-8 md:mb-10` and `mt-8 md:mt-10`

### Performance Considerations
- **Shimmer Border**: Conic-gradient with CSS rotation - GPU-composited and performant
- **Liquid Glass**: SVG displacement filter is potential performance risk
  - Profile on mid-tier devices
  - Falls back to CSS-only glass treatment if needed
- **Animation**: AnimatePresence mode="wait" - only one phase renders at a time
- **Memory**: Proper cleanup with isMountedRef to prevent state updates after unmount

## Browser Compatibility

### SVG feDisplacementMap Support
- **Chromium**: Full support - shows refraction effect
- **Safari/Firefox**: No refraction support - falls back to CSS glass styling
- **Acceptable**: Refraction is enhancement, not requirement
- **Shimmer Border**: Works across all browsers (CSS-based)

## Animation Timing

### Target Loop Duration
- **Total**: ~10 seconds per loop
- **Principle**: Each beat has moment of stillness before next begins
- **No Overlapping**: Transitions don't overlap or rush

### Current Timing (Starting Points)
```typescript
// Beat 1 — Name (~2s)
await delay(2000);  // typing animation + settle
await shimmerRef.current?.pulse(2);

// Beat 2 — Amount (~1.5s) 
await delay(1000);
await shimmerRef.current?.pulse(2);

// Beat 3 — Preview (~2s)
await delay(1500);
await shimmerRef.current?.pulse(1);

// Beat 4 — Burn (~1.5s)
await shimmerRef.current?.pulse(2);
await delay(500);

// Beat 5 — Sent (~1s)
await delay(1000);

// Beat 6 — Complete (~1.5s)
await shimmerRef.current?.flood();
await delay(1200);

// Beat 7 — Reset (~0.5s)
await shimmerRef.current?.dissipate();
await delay(300);
```

### Loop Continuity
- Starts immediately on mount - no waiting for "fresh" start
- Users see whatever phase is currently playing when they land
- Uses `isMountedRef` flag for cleanup on unmount
- Prevents state updates after component unmounts

## Visual Hierarchy

### Typography
- **Clash Display**: Headlines and important text
- **Satoshi**: Body text and labels
- **JetBrains Mono**: Addresses/code (not used in ceremony)

### Color System
- **Sapphire (#0040FF)**: Primary brand color, borders, highlights
- **Crimson (#FF2D2D)**: Burn phase, error states
- **White (#FFFFFF)**: Success states, checkmarks
- **Primary Text (#F0F2F8)**: Main content
- **Muted Text (rgba(122,139,171,0.7))**: Secondary information

### Glass Panel Effects
- **Clear Glass**: Minimal frosting (blurAmount: 0.02)
- **Edge Refraction**: Subtle displacement (displacementScale: 40)
- **Border Shimmer**: Animated conic-gradient
- **Fallback**: CSS-only glass with backdrop-filter

## Component Architecture

### File Structure
```
src/components/
├── CeremonyPreview.tsx      # Main glass panel container
├── CeremonySequence.tsx     # Phase animations and choreography
├── ShimmerBorder.tsx        # Animated border effect
└── utils/
    └── delay.ts             # Promise-based delay utility
```

### Key Interfaces
```typescript
interface ShimmerBorderRef {
  pulse: (count?: number) => Promise<void>;
  setColor: (color: 'sapphire' | 'crimson' | 'white') => void;
  flood: () => Promise<void>;
  dissipate: () => Promise<void>;
}

interface CeremonyPreviewRef {
  pulse: (count?: number) => Promise<void>;
  setColor: (color: 'sapphire' | 'crimson' | 'white') => void;
  flood: () => Promise<void>;
  dissipate: () => Promise<void>;
}
```

## Development Notes

### Tuning Recommendations
- Adjust timing values by feel once visual is rendering
- Test on actual devices, not just dev tools
- Monitor performance on mid-tier mobile devices
- Verify reduced motion behavior in accessibility settings

### Testing Checklist
- [ ] Responsive behavior on 375px - 1440px+
- [ ] Reduced motion preference support
- [ ] Performance on mid-tier devices
- [ ] Browser compatibility (Chrome, Safari, Firefox)
- [ ] Loop continuity and cleanup
- [ ] Glass panel fallback rendering
- [ ] Shimmer border animation smoothness
