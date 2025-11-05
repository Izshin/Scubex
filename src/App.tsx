import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import Home from './pages/Home'
import MapPage from './pages/Map'
import { TransitionContext, useWaveTransition } from './lib/transition'



// 2. COMPONENTE DE OLA UNIFICADO
function WaveTransition({ onRisingComplete, onFallingComplete }: { onRisingComplete: () => void, onFallingComplete: () => void }) {
  const { wavePhase } = useWaveTransition();

  const waveVariants: Variants = {
    hidden: { 
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
    },
    rising: { 
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
    falling: { 
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
  };

  const handleAnimationComplete = (definition: string) => {
    if (definition === 'rising') {
      onRisingComplete();
    } else if (definition === 'falling') {
      onFallingComplete();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none"
      initial="hidden"
      animate={wavePhase}
      variants={waveVariants}
      onAnimationComplete={handleAnimationComplete}
      style={{
        background: `
          radial-gradient(ellipse at top, rgba(6, 182, 212, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(8, 145, 178, 0.4) 0%, transparent 70%),
          linear-gradient(180deg, 
            #0ea5e9 0%, #0284c7 25%, #0369a1 50%, #1e40af 75%, #1e3a8a 100%
          )
        `,
      }}
    >
      <WaveContent />
    </motion.div>
  );
}

// 3. CONTENIDO DE LA OLA CON ANIMACIONES CONTINUAS
function WaveContent() {
  const particleData = [
    { x: 15, size: 3, delay: 0.1, duration: 4.5 }, { x: 85, size: 2, delay: 0.3, duration: 5 },
    { x: 35, size: 4, delay: 0.0, duration: 3 }, { x: 75, size: 2.5, delay: 0.2, duration: 5.5 },
    { x: 55, size: 3.5, delay: 0.4, duration: 3.8 }, { x: 25, size: 2, delay: 0.1, duration: 6 },
    { x: 65, size: 3, delay: 0.5, duration: 3.2 }, { x: 45, size: 2.5, delay: 0.3, duration: 5.8 },
    { x: 95, size: 2, delay: 0.0, duration: 4.5 }, { x: 5, size: 4, delay: 0.2, duration: 4 },
    // Más burbujas como solicitaste
    { x: 20, size: 2, delay: 0.6, duration: 5.2 }, { x: 80, size: 3, delay: 0.8, duration: 4.8 },
    { x: 40, size: 2.5, delay: 1.0, duration: 3.5 }, { x: 60, size: 3.5, delay: 0.4, duration: 5.0 },
    { x: 10, size: 2.8, delay: 0.7, duration: 4.2 }, { x: 90, size: 2.2, delay: 0.9, duration: 4.7 },
    { x: 30, size: 3.2, delay: 0.2, duration: 5.3 }, { x: 70, size: 2.7, delay: 0.5, duration: 4.1 },
    { x: 50, size: 2.3, delay: 1.1, duration: 3.9 }, { x: 18, size: 3.8, delay: 0.3, duration: 5.6 },
    { x: 82, size: 2.1, delay: 0.6, duration: 4.4 }, { x: 38, size: 3.3, delay: 0.8, duration: 3.7 },
    { x: 68, size: 2.6, delay: 1.2, duration: 5.1 }, { x: 12, size: 3.1, delay: 0.1, duration: 4.3 },
    { x: 88, size: 2.4, delay: 0.4, duration: 4.9 }, { x: 42, size: 3.6, delay: 0.7, duration: 3.4 },
  ];

  return (
    <>
      {/* Espuma de la ola: animación en bucle y más alta */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[300px]"
        initial={{ y: 40 }}
        animate={{ y: -40 }}
        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
      >
        {/* Capa principal de espuma */}
        <svg className="absolute w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,90 C200,140 400,40 600,90 C800,140 1000,40 1200,90 L1200,120 L0,120 Z"
            fill="rgba(255,255,255,0.8)"
          />
        </svg>
        
        {/* Capa secundaria de espuma más sutil */}
        <motion.svg 
          className="absolute w-full h-full" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
          animate={{ x: [-20, 20, -20] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0,100 C150,130 350,70 500,100 C650,130 850,70 1000,100 C1100,130 1150,70 1200,100 L1200,120 L0,120 Z"
            fill="rgba(255,255,255,0.4)"
          />
        </motion.svg>
        
        {/* Burbujas de espuma adicionales */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`foam-bubble-${i}`}
              className="absolute bg-white rounded-full opacity-60"
              style={{
                width: Math.random() * 8 + 4,
                height: Math.random() * 8 + 4,
                left: `${Math.random() * 100}%`,
                bottom: `${Math.random() * 80 + 20}px`,
                boxShadow: '0 0 15px rgba(255,255,255,0.7)'
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.6, 0.9, 0.6],
                scale: [1, 1.3, 1]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
      
      {/* Capa estática de espuma - sin animación */}
      <div className="absolute bottom-0 left-0 right-0 h-[40px]">
        <svg className="absolute w-full h-full" viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path
            d="M0,20 C200,30 400,10 600,20 C800,30 1000,10 1200,20 L1200,40 L0,40 Z"
            fill="rgba(255,255,255,1.0)"
          />
        </svg>
      </div>
      
      {/* Partículas: animación en bucle que no depende de la fase */}
      <div className="absolute inset-0 overflow-hidden">
        {particleData.map((p, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute bg-cyan-200 rounded-full"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, bottom: -p.size }}
            animate={{
              y: '-110vh',
              opacity: [0, 0.6, 0],
              scale: [1, 1.8, 0.3]
            }}
            transition={{
              duration: p.duration, delay: p.delay, ease: "linear",
              repeat: Infinity, repeatDelay: 1.5
            }}
          />
        ))}
      </div>
    </>
  );
}

// 4. PROVEEDOR DE TRANSICIÓN SIMPLIFICADO
function TransitionProvider({ children }: { children: ReactNode }) {
  const [wavePhase, setWavePhase] = useState<'none' | 'rising' | 'falling'>('none');
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const navigate = useNavigate();

  const startWaveTransition = (path: string) => {
    if (wavePhase === 'none') {
      setTargetPath(path);
      setWavePhase('rising');
    }
  };

  const handleRisingComplete = () => {
    if (targetPath) {
      navigate(targetPath);
      setTimeout(() => setWavePhase('falling'), 450);
    }
  };

  const handleFallingComplete = () => {
    setWavePhase('none');
    setTargetPath(null);
  };

  return (
    <TransitionContext.Provider value={{ startWaveTransition, wavePhase }}>
      {children}
      <AnimatePresence>
        {wavePhase !== 'none' && (
          <WaveTransition 
            onRisingComplete={handleRisingComplete} 
            onFallingComplete={handleFallingComplete} 
          />
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div><Home /></motion.div>} />
        <Route path="/map" element={<motion.div><MapPage /></motion.div>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  // Set basename only for GitHub Pages deployment
  // Use empty basename for development and local builds
  const basename = import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL : '';
  
  return (
    <Router basename={basename}>
      <TransitionProvider>
        <AnimatedRoutes />
      </TransitionProvider>
    </Router>
  )
}

export default App
