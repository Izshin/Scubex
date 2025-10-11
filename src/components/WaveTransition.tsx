import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface WaveTransitionProps {
  children: ReactNode;
  isExiting?: boolean;
}

export default function WaveTransition({ children, isExiting = false }: WaveTransitionProps) {
  return (
    <div className="relative overflow-hidden">
      {children}
      
      {/* Ola de transición */}
      {isExiting && (
        <motion.div
          className="absolute inset-0 z-50"
          initial={{ clipPath: "circle(0% at 50% 100%)" }}
          animate={{ clipPath: "circle(150% at 50% 100%)" }}
          transition={{ 
            duration: 1.2, 
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          style={{
            background: "linear-gradient(to top, #0891b2, #06b6d4, #0284c7, #0369a1)",
          }}
        >
          {/* Efecto de espuma */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-32 opacity-40"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              background: "radial-gradient(ellipse at bottom, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 40%, transparent 70%)",
            }}
          />
          
          {/* Burbujas de la ola */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-white rounded-full"
                style={{
                  width: Math.random() * 8 + 4,
                  height: Math.random() * 8 + 4,
                  left: `${Math.random() * 100}%`,
                  bottom: `${Math.random() * 150 + 50}px`,
                }}
                animate={{
                  y: [-50, -100],
                  x: [0, Math.random() * 40 - 20],
                  opacity: [0.8, 0],
                  scale: [1, 1.5]
                }}
                transition={{
                  duration: 1.5,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}