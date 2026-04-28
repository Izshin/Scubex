import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useWaveTransition } from '../lib/transition';
import { useUserStore } from '../lib/stores';
import { loginWithGoogle } from '../lib/api';
import Avatar from '../components/Avatar';
import PrivacyModal from '../components/PrivacyModal';

const Home = observer(function Home() {
  const { startWaveTransition } = useWaveTransition();
  const userStore = useUserStore();
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    startWaveTransition('/map');
  };

  const handleProfileClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    startWaveTransition('/profile', { from: '/' });
  };

  const handleCreatureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleGoogleSuccess = async (response: { credential?: string }) => {
    if (!response.credential) return;
    try {
      const data = await loginWithGoogle(response.credential);
      userStore.setUser({ ...data.user, token: data.token });
    } catch (e) {
      console.error('Login failed', e);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 relative overflow-hidden">
      {/* Marine Animals Swimming - Full screen width */}
      <div className="fixed inset-0 z-10 w-screen h-screen">
        {/* Fish swimming left to right - FLIPPED to face right */}
        <motion.div 
          className="absolute top-[15%] text-4xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.7, 0.7, 0]
          }}
          transition={{ 
            duration: 15,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 2,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🐟</div>
        </motion.div>

        <motion.div 
          className="absolute top-[45%] text-5xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.6, 0.6, 0]
          }}
          transition={{ 
            duration: 18,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 8,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🐠</div>
        </motion.div>

        <motion.div 
          className="absolute top-[70%] text-3xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.8, 0.8, 0]
          }}
          transition={{ 
            duration: 12,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 14,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🐡</div>
        </motion.div>

        {/* Fish swimming right to left - Normal orientation faces left */}
        <motion.div 
          className="absolute top-[25%] text-5xl cursor-pointer"
          initial={{ x: 'calc(100vw + 100px)', opacity: 0 }}
          animate={{ 
            x: ['calc(100vw + 100px)', '-100px'],
            opacity: [0, 0.7, 0.7, 0]
          }}
          transition={{ 
            duration: 20,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 5,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🐠
        </motion.div>

        <motion.div 
          className="absolute top-[55%] text-4xl cursor-pointer"
          initial={{ x: 'calc(100vw + 100px)', opacity: 0 }}
          animate={{ 
            x: ['calc(100vw + 100px)', '-100px'],
            opacity: [0, 0.6, 0.6, 0]
          }}
          transition={{ 
            duration: 16,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 11,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🐟
        </motion.div>

        <motion.div 
          className="absolute top-[80%] text-6xl cursor-pointer"
          initial={{ x: 'calc(100vw + 100px)', opacity: 0 }}
          animate={{ 
            x: ['calc(100vw + 100px)', '-100px'],
            opacity: [0, 0.5, 0.5, 0]
          }}
          transition={{ 
            duration: 22,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 17,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🐠
        </motion.div>

        {/* Sea Turtle - slow and majestic - FLIPPED to face right */}
        <motion.div 
          className="absolute top-[35%] text-6xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.8, 0.8, 0],
            y: [0, -10, 0, 10, 0]
          }}
          transition={{ 
            duration: 25,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 20,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🐢</div>
        </motion.div>

        {/* Jellyfish - floating up and down */}
        <motion.div 
          className="absolute top-[20%] left-[30%] text-4xl cursor-pointer"
          animate={{ 
            y: [0, -30, 0, -20, 0],
            opacity: [0.4, 0.7, 0.4, 0.6, 0.4],
            rotate: [-5, 5, -5, 0, -5]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🪼
        </motion.div>

        <motion.div 
          className="absolute top-[60%] right-[25%] text-5xl cursor-pointer"
          animate={{ 
            y: [0, -40, 0, -25, 0],
            opacity: [0.3, 0.6, 0.3, 0.5, 0.3],
            rotate: [5, -5, 5, 0, 5]
          }}
          transition={{ 
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🪼
        </motion.div>

        {/* Octopus - occasional appearance - FLIPPED to face right */}
        <motion.div 
          className="absolute top-[65%] text-5xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.6, 0.6, 0],
            rotate: [0, 15, -15, 0]
          }}
          transition={{ 
            duration: 20,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 30,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🐙</div>
        </motion.div>

        {/* Dolphin - fast swimmer - FLIPPED to face right */}
        <motion.div 
          className="absolute top-[40%] text-6xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.8, 0.8, 0],
            y: [0, -20, -10, 0, 10, 0]
          }}
          transition={{ 
            duration: 10,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 25,
            ease: "easeOut"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -40, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🐬</div>
        </motion.div>

        {/* Whale - large and slow - Normal orientation faces left */}
        <motion.div 
          className="absolute top-[50%] text-8xl cursor-pointer"
          initial={{ x: 'calc(100vw + 100px)', opacity: 0 }}
          animate={{ 
            x: ['calc(100vw + 100px)', '-100px'],
            opacity: [0, 0.7, 0.7, 0]
          }}
          transition={{ 
            duration: 35,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 40,
            ease: "linear"
          }}
          whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
          whileTap={{ y: -35, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🐋
        </motion.div>

        {/* Crab - walking on bottom - FLIPPED to face right */}
        <motion.div 
          className="absolute bottom-[10%] text-4xl cursor-pointer"
          initial={{ x: '-100px', opacity: 0 }}
          animate={{ 
            x: ['-100px', 'calc(100vw + 100px)'],
            opacity: [0, 0.6, 0.6, 0],
            rotate: [0, 5, -5, 0, 5]
          }}
          transition={{ 
            duration: 28,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 35,
            ease: "linear"
          }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ y: -30, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🦀</div>
        </motion.div>

        {/* Shark - occasional predator - Normal orientation faces left */}
        <motion.div 
          className="absolute top-[38%] text-7xl cursor-pointer"
          initial={{ x: 'calc(100vw + 100px)', opacity: 0 }}
          animate={{ 
            x: ['calc(100vw + 100px)', '-100px'],
            opacity: [0, 0.8, 0.8, 0]
          }}
          transition={{ 
            duration: 12,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            delay: 50,
            ease: "linear"
          }}
          whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
          whileTap={{ y: -35, transition: { duration: 0.3, type: "spring", stiffness: 400 } }}
          onClick={handleCreatureClick}
          style={{ pointerEvents: 'auto' }}
        >
          🦈
        </motion.div>

      


      </div>

      {/* Animación de burbujas oceánicas */}
      <div className="absolute inset-0 opacity-20 z-0">
        {/* ... (código de burbujas sin cambios) ... */}
        {/* Burbujas grandes */}
        <motion.div 
          className="absolute top-[20%] left-[15%] w-6 h-6 bg-white rounded-full"
          animate={{ 
            y: [-20, -60, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute top-[60%] right-[20%] w-5 h-5 bg-white rounded-full"
          animate={{ 
            y: [-15, -45, -15],
            x: [8, -8, 8],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: 5.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        {/* Burbujas medianas */}
        <motion.div 
          className="absolute top-[30%] right-[30%] w-3 h-3 bg-white rounded-full"
          animate={{ 
            y: [-12, -35, -12],
            x: [-6, 6, -6],
            opacity: [0.25, 0.65, 0.25]
          }}
          transition={{ 
            duration: 4.8, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.div 
          className="absolute bottom-[30%] left-[25%] w-4 h-4 bg-white rounded-full"
          animate={{ 
            y: [-18, -48, -18],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 5.2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div 
          className="absolute top-[45%] left-[70%] w-3 h-3 bg-white rounded-full"
          animate={{ 
            y: [-14, -38, -14],
            x: [5, -5, 5],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: 4.2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1.8
          }}
        />
        
        {/* Burbujas pequeñas */}
        <motion.div 
          className="absolute top-[25%] left-[50%] w-2 h-2 bg-white rounded-full"
          animate={{ 
            y: [-8, -22, -8],
            x: [-3, 3, -3],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 3.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0.3
          }}
        />
        <motion.div 
          className="absolute top-[70%] right-[15%] w-2 h-2 bg-white rounded-full"
          animate={{ 
            y: [-10, -28, -10],
            x: [4, -4, 4],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 3.8, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2.5
          }}
        />
        <motion.div 
          className="absolute bottom-[40%] right-[45%] w-2 h-2 bg-white rounded-full"
          animate={{ 
            y: [-6, -18, -6],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: 3.2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1.2
          }}
        />
        <motion.div 
          className="absolute top-[80%] left-[35%] w-2 h-2 bg-white rounded-full"
          animate={{ 
            y: [-12, -32, -12],
            x: [6, -6, 6],
            opacity: [0.25, 0.55, 0.25]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 3
          }}
        />
        
        {/* Micro burbujas */}
        <motion.div 
          className="absolute top-[15%] right-[60%] w-1 h-1 bg-white rounded-full"
          animate={{ 
            y: [-5, -15, -5],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0.8
          }}
        />
        <motion.div 
          className="absolute bottom-[20%] left-[60%] w-1 h-1 bg-white rounded-full"
          animate={{ 
            y: [-4, -12, -4],
            x: [2, -2, 2],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: 2.8, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1.5
          }}
        />
        <motion.div 
          className="absolute top-[55%] left-[80%] w-1 h-1 bg-white rounded-full"
          animate={{ 
            y: [-6, -16, -6],
            opacity: [0.25, 0.6, 0.25]
          }}
          transition={{ 
            duration: 2.2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2.2
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">

        {/* Auth button — top right */}
        <div className="fixed top-5 right-5 z-50">
          {userStore.isLoggedIn ? (
            <a href="/profile" onClick={handleProfileClick} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 transition-all">
              <Avatar src={userStore.user?.picture} name={userStore.user?.name} className="w-8 h-8" />
              <span className="text-white text-sm font-medium">{userStore.user?.name}</span>
            </a>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <div className="relative group cursor-pointer">
                {/* Custom styled button (visual) */}
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-3 px-4 rounded-2xl shadow-2xl transition-all duration-200 group-hover:shadow-cyan-500/25 group-hover:scale-[1.08] group-active:scale-95 text-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Iniciar sesión
                </div>
                {/* Invisible Google Login overlay on top */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl" style={{ opacity: 0.01 }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => console.error('Google login error')}
                    shape="pill"
                    theme="filled_blue"
                    text="signin_with"
                    width={250}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowPrivacy(true)}
                className="w-full text-right text-white/60 hover:text-cyan-300 text-[11px] font-medium transition-colors"
              >
                Información sobre tus datos
              </button>
            </div>
          )}
        </div>
        <div className="text-center">
          <motion.h1 
            className="text-8xl font-bold text-white mb-12 drop-shadow-2xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            Scubex
          </motion.h1>
          
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <a 
                href="/map" 
                onClick={handleNavigation}
                className="inline-flex items-center gap-4 bg-gradient-to-r from-cyan-400 to-blue-500  text-white font-bold py-5 px-12 rounded-2xl transition-all duration-500 shadow-2xl hover:shadow-cyan-500/25 text-lg"
              >
                Explorar Mapa Marino
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
    {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </>
  );
});

export default Home;