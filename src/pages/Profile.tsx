import { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation } from 'react-router-dom';
import { useUserStore } from '../lib/stores';
import { useWaveTransition } from '../lib/transition';
import { uploadImage } from '../lib/api';

const Profile = observer(function Profile() {
  const userStore = useUserStore();
  const { startWaveTransition, transitionSpeed, setTransitionSpeed } = useWaveTransition();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pictureInput, setPictureInput] = useState('');
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    startWaveTransition(from);
  };

  // Track if user just logged out (logout sets user to null but we're still on the page)
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  if (!userStore.isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{justLoggedOut ? 'Sesión cerrada.' : 'No has iniciado sesión.'}</p>
          <a href={from} onClick={handleGoBack} className="text-cyan-300 hover:text-cyan-100 underline">
            Volver
          </a>
        </div>
      </div>
    );
  }

  const user = userStore.user!;

  const startEditing = () => {
    setNameInput(user.name);
    setPictureInput(user.picture);
    setPicturePreview(user.picture);
    setPictureFile(null);
    setEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  const removePicture = () => {
    setPictureFile(null);
    setPicturePreview('');
    setPictureInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    let finalPicture = pictureInput;
    if (pictureFile) {
      setUploading(true);
      try {
        finalPicture = await uploadImage(pictureFile);
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    await userStore.updateProfile(nameInput, finalPicture);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex flex-col items-center justify-center p-8 relative">
      <a
        href={from}
        onClick={handleGoBack}
        className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm"
      >
      Volver
      </a>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full shadow-2xl border border-white/20">
        {editing ? (
          <>
            {/* Photo preview */}
            <div className="relative">
              {picturePreview ? (
                <img
                  src={picturePreview}
                  alt="Preview"
                  className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-lg object-cover"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-cyan-500 flex items-center justify-center text-white text-5xl shadow-lg">
                  {nameInput?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              {/* Upload / remove overlay */}
              <button
                type="button"
                onClick={() => picturePreview ? removePicture() : fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg border-2 border-white/30 transition-colors"
                title={picturePreview ? 'Quitar foto' : 'Subir foto'}
              >
                {picturePreview ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

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
            </div>

            {userStore.profileError && (
              <p className="text-red-300 text-xs">{userStore.profileError}</p>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={handleCancel}
                disabled={userStore.profileLoading || uploading}
                className="flex-1 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={userStore.profileLoading || uploading}
                className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : userStore.profileLoading ? 'Guardando...' : 'Guardar'}
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
                setJustLoggedOut(true);
                userStore.logout();
                startWaveTransition('/');
              }}
              className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20 transition-all"
            >
              Cerrar sesión
            </button>

            {/* Transition speed selector */}
            <p className="text-white/40 text-[10px] mt-2">Transición entre páginas</p>
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
              {([['normal', 'Normal'], ['fast', 'Rápida'], ['none', 'Sin']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTransitionSpeed(value)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    transitionSpeed === value
                      ? 'bg-cyan-400 text-white font-semibold shadow'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default Profile;
