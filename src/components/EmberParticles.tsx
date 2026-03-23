import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  yEnd: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

export const EmberParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80, // -40 to +40px from center
      yEnd: -(100 + Math.random() * 150), // -100 to -250px upward
      size: 2 + Math.random() * 2, // 2-4px
      delay: Math.random() * 0.5, // 0-0.5s
      duration: 0.8 + Math.random() * 0.7, // 0.8-1.5s
      color: ['#F5A623', '#FF6B35', '#E85D26', '#FFD700'][Math.floor(Math.random() * 4)],
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            left: '50%',
            top: '50%',
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
          }}
          initial={{ 
            opacity: 0,
            y: 0,
            x: particle.x,
            scale: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            y: particle.yEnd,
            x: [particle.x, particle.x + (Math.random() - 0.5) * 20], // Slight x drift
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut',
            opacity: { duration: particle.duration * 0.6, ease: 'easeIn' },
            scale: { duration: particle.duration * 0.4, ease: 'easeOut' },
          }}
        />
      ))}
    </div>
  );
};
