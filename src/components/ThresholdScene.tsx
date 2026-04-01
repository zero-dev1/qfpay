import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NamePill } from './NamePill';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { EASE_OUT_EXPO } from '../lib/animations';

// ─── The 18 network identities — fixed, deterministic ────────────────────────

const IDENTITIES = [
  { name: 'vector',         color: 'linear-gradient(135deg, #3B82F6, #4338CA)' },
  { name: 'memechi',        color: 'linear-gradient(135deg, #EC4899, #E11D48)' },
  { name: 'steve',          color: 'linear-gradient(135deg, #94A3B8, #3B82F6)' },
  { name: 'hwmedia',        color: 'linear-gradient(135deg, #8B5CF6, #9333EA)' },
  { name: 'teddy',          color: 'linear-gradient(135deg, #FB923C, #F59E0B)' },
  { name: 'satoshiflipper', color: 'linear-gradient(135deg, #F97316, #DC2626)' },
  { name: 'altcoinsensei',  color: 'linear-gradient(135deg, #22D3EE, #3B82F6)' },
  { name: 'soapy',          color: 'linear-gradient(135deg, #2DD4BF, #10B981)' },
  { name: 'patrick',        color: 'linear-gradient(135deg, #60A5FA, #06B6D4)' },
  { name: 'drprofit',       color: 'linear-gradient(135deg, #22C55E, #14B8A6)' },
  { name: 'vitalik',        color: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
  { name: 'cryptomonk',     color: 'linear-gradient(135deg, #6366F1, #2563EB)' },
  { name: 'overdose',       color: 'linear-gradient(135deg, #EF4444, #EA580C)' },
  { name: 'amg',            color: 'linear-gradient(135deg, #FBBF24, #EAB308)' },
  { name: 'bino',           color: 'linear-gradient(135deg, #EC4899, #C026D3)' },
  { name: 'nils',           color: 'linear-gradient(135deg, #94A3B8, #6B7280)' },
  { name: 'cryptouser28',   color: 'linear-gradient(135deg, #60A5FA, #64748B)' },
  { name: 'sam',            color: 'linear-gradient(135deg, #34D399, #22C55E)' },
] as const;

// ─── Depth layer layouts — desktop ───────────────────────────────────────────
// x values avoid center 30% (35–65%) for foreground pills.
// y is percentage within the ThresholdScene container.

const FOREGROUND_DESKTOP = [
  { id: 0, x:  4, y: 12 },  // vector       — far left, top
  { id: 1, x: 76, y:  8 },  // memechi      — right, top
  { id: 2, x:  6, y: 52 },  // steve        — far left, middle
  { id: 3, x: 72, y: 46 },  // hwmedia      — right, middle
  { id: 4, x: 14, y: 83 },  // teddy        — left, bottom
  { id: 5, x: 78, y: 76 },  // satoshiflipper — right, bottom
];

const MIDGROUND_DESKTOP = [
  { id: 6,  x: 38, y:  4 },  // altcoinsensei — top center
  { id: 7,  x: 84, y: 28 },  // soapy         — far right, upper
  { id: 8,  x: 26, y: 30 },  // patrick       — left-center
  { id: 9,  x: 55, y: 58 },  // drprofit      — right-center
  { id: 10, x: 44, y: 88 },  // vitalik       — bottom center
  { id: 11, x: 10, y: 66 },  // cryptomonk    — left, lower
];

const BACKGROUND_DESKTOP = [
  { id: 12, x: 58, y: 18 },  // overdose
  { id: 13, x: 22, y:  6 },  // amg
  { id: 14, x: 88, y: 60 },  // bino
  { id: 15, x: 30, y: 72 },  // nils
  { id: 16, x: 62, y: 90 },  // cryptouser28
  { id: 17, x: 42, y: 42 },  // sam
];

// ─── Depth layer layouts — mobile (fewer pills) ───────────────────────────────

const FOREGROUND_MOBILE = FOREGROUND_DESKTOP.slice(0, 5);
const MIDGROUND_MOBILE  = MIDGROUND_DESKTOP.slice(0, 4);
const BACKGROUND_MOBILE = BACKGROUND_DESKTOP.slice(0, 3);

// ─── Drift configs — one per identity (fixed, not random) ─────────────────────
// Foreground ids 0–5:  18–24s, ±12px
// Midground  ids 6–11: 14–20s, ±10px
// Background ids 12–17: 12–16s, ±8px

const DRIFT = [
  // Foreground
  { dx:  12, dy:  -8, dur: 22 },
  { dx: -10, dy:  10, dur: 18 },
  { dx:   8, dy:  12, dur: 24 },
  { dx: -12, dy:  -8, dur: 20 },
  { dx:  10, dy: -10, dur: 19 },
  { dx:  -8, dy:   8, dur: 23 },
  // Midground
  { dx:  10, dy:   6, dur: 16 },
  { dx:  -8, dy: -10, dur: 20 },
  { dx:   6, dy:  10, dur: 14 },
  { dx: -10, dy:   6, dur: 18 },
  { dx:   8, dy:  -8, dur: 17 },
  { dx:  -6, dy:   8, dur: 15 },
  // Background
  { dx:   8, dy:  -6, dur: 14 },
  { dx:  -6, dy:   8, dur: 12 },
  { dx:   6, dy:   6, dur: 16 },
  { dx:  -8, dy:  -6, dur: 13 },
  { dx:   6, dy:  -8, dur: 15 },
  { dx:  -6, dy:   6, dur: 12 },
];

// ─── Connection line state ────────────────────────────────────────────────────

interface Connection {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  phase: 'entering' | 'holding' | 'leaving';
}

// ─── DriftPill — single animated pill ────────────────────────────────────────

interface DriftPillProps {
  pos:       { id: number; x: number; y: number };
  opacity:   number;
  size:      'sm' | 'md';
  driftScale: number;
  pillRef?:  (el: HTMLDivElement | null) => void;
}

const DriftPill = ({ pos, opacity, size, driftScale, pillRef }: DriftPillProps) => {
  const drift    = DRIFT[pos.id];
  const identity = IDENTITIES[pos.id];
  const delay    = pos.id * 0.12;

  return (
    <motion.div
      ref={pillRef}
      className="absolute"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity }}
      // Entrance: fade + unblur + scale — per-property transitions
      // Drift:    x/y oscillation starts immediately (pill invisible during delay)
      initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
      animate={{
        opacity: opacity,
        scale:   1,
        filter:  'blur(0px)',
        x:       drift.dx * driftScale,
        y:       drift.dy * driftScale,
      }}
      transition={{
        opacity: { duration: 0.6, ease: EASE_OUT_EXPO, delay },
        scale:   { duration: 0.6, ease: EASE_OUT_EXPO, delay },
        filter:  { duration: 0.6, ease: EASE_OUT_EXPO, delay },
        x: { duration: drift.dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
        y: { duration: drift.dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
      }}
    >
      <NamePill name={identity.name} color={identity.color} size={size} />
    </motion.div>
  );
};

// ─── ThresholdScene ───────────────────────────────────────────────────────────

export const ThresholdScene = memo(function ThresholdScene() {
  const reducedMotion = useReducedMotion();
  const containerRef  = useRef<HTMLDivElement>(null);
  const pillRefs      = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastPairRef   = useRef<[number, number] | null>(null);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const [connections, setConnections] = useState<Connection[]>([]);

  // Track mobile breakpoint
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const foreground = isMobile ? FOREGROUND_MOBILE : FOREGROUND_DESKTOP;
  const midground  = isMobile ? MIDGROUND_MOBILE  : MIDGROUND_DESKTOP;
  const background = isMobile ? BACKGROUND_MOBILE : BACKGROUND_DESKTOP;
  const driftScale = isMobile ? 0.5 : 1;

  // ── Connection lines — fire every 4500ms between two foreground pills ──
  useEffect(() => {
    if (reducedMotion) return;

    const fire = () => {
      // Pick two different foreground pill IDs, not the same as last pair
      let a: number, b: number;
      let attempts = 0;
      do {
        a = Math.floor(Math.random() * foreground.length);
        b = Math.floor(Math.random() * foreground.length);
        attempts++;
      } while (
        (a === b ||
         (lastPairRef.current?.[0] === foreground[a].id &&
          lastPairRef.current?.[1] === foreground[b].id))
        && attempts < 20
      );

      const pillA    = pillRefs.current.get(foreground[a].id);
      const pillB    = pillRefs.current.get(foreground[b].id);
      const container = containerRef.current;
      if (!pillA || !pillB || !container) return;

      const cRect = container.getBoundingClientRect();
      const aRect = pillA.getBoundingClientRect();
      const bRect = pillB.getBoundingClientRect();

      const conn: Connection = {
        id:    `conn-${Date.now()}`,
        x1:    aRect.left + aRect.width  / 2 - cRect.left,
        y1:    aRect.top  + aRect.height / 2 - cRect.top,
        x2:    bRect.left + bRect.width  / 2 - cRect.left,
        y2:    bRect.top  + bRect.height / 2 - cRect.top,
        phase: 'entering',
      };

      lastPairRef.current = [foreground[a].id, foreground[b].id];
      setConnections(prev => [...prev, conn]);

      // entering → holding at 300ms
      setTimeout(() => setConnections(prev =>
        prev.map(c => c.id === conn.id ? { ...c, phase: 'holding' } : c)
      ), 300);

      // holding → leaving at 300 + 800 = 1100ms
      setTimeout(() => setConnections(prev =>
        prev.map(c => c.id === conn.id ? { ...c, phase: 'leaving' } : c)
      ), 1100);

      // remove at 1500ms (end of fade-out)
      setTimeout(() => setConnections(prev =>
        prev.filter(c => c.id !== conn.id)
      ), 1500);
    };

    // First connection after pills have had time to enter
    const initialTimer = setTimeout(fire, 2000);
    const interval     = setInterval(fire, 4500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [reducedMotion, foreground]);

  // ── Reduced motion — static layout, no animations ──
  if (reducedMotion) {
    return (
      <div
        className="absolute inset-0"
        style={{ position: 'absolute', inset: 0 }}
      >
        {foreground.map(pos => (
          <div key={pos.id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <NamePill name={IDENTITIES[pos.id].name} color={IDENTITIES[pos.id].color} size="md" />
          </div>
        ))}
        {midground.map(pos => (
          <div key={pos.id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: 0.65 }}>
            <NamePill name={IDENTITIES[pos.id].name} color={IDENTITIES[pos.id].color} size="sm" />
          </div>
        ))}
        {background.map(pos => (
          <div key={pos.id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: 0.35 }}>
            <NamePill name={IDENTITIES[pos.id].name} color={IDENTITIES[pos.id].color} size="sm" />
          </div>
        ))}
      </div>
    );
  }

  return (
    // position: relative is set by the PARENT — this div fills the parent via absolute inset
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    >
      {/* ── Connection lines SVG — behind pills ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <AnimatePresence>
          {connections.map(conn => (
            <motion.g key={conn.id}>
              {/* Line — fades in over 300ms, holds at 60% opacity, fades out over 400ms */}
              <motion.line
                x1={conn.x1} y1={conn.y1}
                x2={conn.x2} y2={conn.y2}
                stroke="rgba(0,64,255,0.6)"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: conn.phase === 'leaving' ? 0 : 0.6 }}
                transition={{ duration: conn.phase === 'leaving' ? 0.4 : 0.3 }}
              />
              {/* Traveling sapphire dot — only during holding phase */}
              {conn.phase === 'holding' && (
                <motion.circle
                  r="3"
                  fill="rgba(0,64,255,0.85)"
                  initial={{ cx: conn.x1, cy: conn.y1, opacity: 0.9 }}
                  animate={{ cx: conn.x2, cy: conn.y2 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
              )}
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>

      {/* ── Foreground — full opacity, md size, slowest drift ── */}
      {foreground.map(pos => (
        <DriftPill
          key={pos.id}
          pos={pos}
          opacity={1}
          size="md"
          driftScale={driftScale}
          pillRef={(el) => {
            if (el) pillRefs.current.set(pos.id, el);
          }}
        />
      ))}

      {/* ── Midground — 65% opacity, sm size, medium drift ── */}
      {midground.map(pos => (
        <DriftPill
          key={pos.id}
          pos={pos}
          opacity={0.65}
          size="sm"
          driftScale={driftScale}
        />
      ))}

      {/* ── Background — 35% opacity, sm size, fastest drift ── */}
      {background.map(pos => (
        <DriftPill
          key={pos.id}
          pos={pos}
          opacity={0.35}
          size="sm"
          driftScale={driftScale}
        />
      ))}
    </div>
  );
});
