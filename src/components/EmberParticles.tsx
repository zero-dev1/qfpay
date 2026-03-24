import { motion } from 'framer-motion';
import { useMemo } from 'react';

export const EmberParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 120,
      yEnd: -(120 + Math.random() * 200),
      size: 2 + Math.random() * 3,
      delay: Math.random() * 0.8,
      duration: 1.0 + Math.random() * 1.0,
      color: ['#F5A623', '#FF6B35', '#E85D25', '#FFD700', '#C13333'][Math.floor(Math.random() * 5)],
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: '50%',
            top: '50%',
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
          initial={{ opacity: 0, y: 0, x: p.x, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.6, 0],
            y: p.yEnd,
            x: [p.x, p.x + (Math.random() - 0.5) * 30],
            scale: [0, 1.2, 0.8, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};
