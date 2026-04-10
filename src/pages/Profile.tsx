import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useUserStore } from '../lib/stores';
import { useWaveTransition } from '../lib/transition';

const Profile = observer(function Profile() {
  const userStore = useUserStore();
  const { startWaveTransition } = useWaveTransition();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pictureInput, setPictureInput] = useState('');

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

  const startEditing = () => {
    setNameInput(user.name);
    setPictureInput(user.picture);
    setEditing(true);
  };

  const handleSave = async () => {
    await userStore.updateProfile(nameInput, pictureInput);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex flex-col items-center justify-center p-8 relative">
      <a
        href="/"
        onClick={handleGoHome}
        className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm"
      >
      Volver
      </a>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full shadow-2xl border border-white/20">
        {editing ? (
          <>
            {/* Photo preview */}
            {pictureInput ? (
              <img
                src={pictureInput}
                alt="Preview"
                className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-lg object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-cyan-500 flex items-center justify-center text-white text-5xl shadow-lg">
                {nameInput?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            <div className="w-full space-y-3">
              <div>
                <label className="text-white/60 text-xs block mb-1">Nombre</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-1">URL de foto de perfil</label>
                <input
                  type="url"
                  value={pictureInput}
                  onChange={(e) => setPictureInput(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="https://..."
                />
              </div>
            </div>

            {userStore.profileError && (
              <p className="text-red-300 text-xs">{userStore.profileError}</p>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={handleCancel}
                disabled={userStore.profileLoading}
                className="flex-1 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={userStore.profileLoading}
                className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50"
              >
                {userStore.profileLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        ) : (
          <>
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-lg object-cover"
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
              onClick={startEditing}
              className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 transition-all"
            >
              Editar perfil
            </button>

            <button
              onClick={() => {
                userStore.logout();
                startWaveTransition('/');
              }}
              className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 transition-all"
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default Profile;
