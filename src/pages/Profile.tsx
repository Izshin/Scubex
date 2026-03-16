import { observer } from 'mobx-react-lite';
import { useUserStore } from '../lib/stores';
import { useWaveTransition } from '../lib/transition';

const Profile = observer(function Profile() {
  const userStore = useUserStore();
  const { startWaveTransition } = useWaveTransition();

  const handleGoHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    startWaveTransition('/');
  };

  if (!userStore.isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">No has iniciado sesión.</p>
          <a href="/" onClick={handleGoHome} className="text-cyan-300 hover:text-cyan-100 underline">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  const user = userStore.user!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex flex-col items-center justify-center p-8 relative">
      <a
        href="/"
        onClick={handleGoHome}
        className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm"
      >
        ← Volver
      </a>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full shadow-2xl border border-white/20">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-lg"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-cyan-500 flex items-center justify-center text-white text-5xl shadow-lg">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="text-center">
          <h1 className="text-white text-2xl font-bold">{user.name}</h1>
          <p className="text-white/60 text-sm mt-1">{user.email}</p>
        </div>

        <button
          onClick={() => {
            userStore.logout();
            startWaveTransition('/');
          }}
          className="mt-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
});

export default Profile;
