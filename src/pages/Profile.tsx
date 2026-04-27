import { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserStore } from '../lib/stores';
import { useWaveTransition } from '../lib/transition';
import { uploadImage, getSavedPublications, getPublicProfile, getFollowers, getFollowingList } from '../lib/api';
import type { PublicationData, PublicProfileData, UserSummary } from '../lib/api';
import Avatar from '../components/Avatar';

type Tab = 'publications' | 'saved';
type ListModal = 'followers' | 'following' | null;

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
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data
  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Saved publications
  const [savedPubs, setSavedPubs] = useState<PublicationData[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<Tab>('publications');

  // List modal
  const [listModal, setListModal] = useState<ListModal>(null);
  const [listUsers, setListUsers] = useState<UserSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Track if user just logged out
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);

  // Fetch profile data
  useEffect(() => {
    if (!userStore.isLoggedIn || !userStore.user) return;
    setProfileLoading(true);
    getPublicProfile(userStore.user.email)
      .then(setProfileData)
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [userStore.isLoggedIn, userStore.user?.email]);

  // Fetch saved publications when tab switches
  useEffect(() => {
    if (activeTab !== 'saved' || !userStore.isLoggedIn) return;
    setSavedLoading(true);
    getSavedPublications()
      .then(setSavedPubs)
      .catch(() => {})
      .finally(() => setSavedLoading(false));
  }, [activeTab, userStore.isLoggedIn]);

  const handleGoBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    startWaveTransition(from);
  };

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
    if (file.size > 5 * 1024 * 1024) {
      setPictureError('La foto no puede superar los 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPictureError('');
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
    // Refresh profile data after edit
    getPublicProfile(user.email).then(setProfileData).catch(() => {});
  };

  const handleCancel = () => {
    setEditing(false);
    setConfirmDeleteAccount(false);
  };

  const openList = async (type: 'followers' | 'following') => {
    setListModal(type);
    setListLoading(true);
    try {
      const users = type === 'followers' ? await getFollowers(user.email) : await getFollowingList(user.email);
      setListUsers(users);
    } catch {
      setListUsers([]);
    }
    setListLoading(false);
  };

  const navigateToUser = (userEmail: string) => {
    setListModal(null);
    startWaveTransition(`/user/${encodeURIComponent(userEmail)}`);
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/user/${encodeURIComponent(user.email)}`;
    if (navigator.share) {
      try { await navigator.share({ title: user.name, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedProfile(true);
      setTimeout(() => setCopiedProfile(false), 2000);
    }
  };

  const publications = profileData?.publications ?? [];
  const currentPubs = activeTab === 'publications' ? publications : savedPubs;
  const isLoadingPubs = activeTab === 'publications' ? profileLoading : savedLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex flex-col items-center p-4 sm:p-8 relative">
      {/* Back button */}
      <a
        href={from}
        onClick={handleGoBack}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm z-10"
      >
        Volver
      </a>


      {/* ─── Top: Profile info ─── */}
      <div className="w-full max-w-2xl mt-12 sm:mt-14">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl">
          {editing ? (
            /* ─── Edit mode ─── */
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                {picturePreview ? (
                  <img src={picturePreview} alt="Preview" className="w-24 h-24 rounded-full ring-4 ring-white/30 shadow-lg object-cover" />
                ) : (
                  <Avatar src={null} name={nameInput} className="w-24 h-24 text-4xl shadow-lg" />
                )}
                <button
                  type="button"
                  onClick={() => picturePreview ? removePicture() : fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg border-2 border-white/30 transition-colors"
                  title={picturePreview ? 'Quitar foto' : 'Subir foto'}
                >
                  {picturePreview ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="w-full max-w-xs space-y-3">
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

              {userStore.profileError && <p className="text-red-300 text-xs">{userStore.profileError}</p>}
              {pictureError && <p className="text-red-300 text-xs">{pictureError}</p>}

              <div className="flex gap-3 w-full max-w-xs">
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

              {/* Delete account */}
              {!confirmDeleteAccount ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAccount(true)}
                  disabled={userStore.profileLoading || uploading}
                  className="w-full max-w-xs px-4 py-2 rounded-full border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-xs font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M1.5 3.5h11M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M3 3.5l.5 8.5a1 1 0 001 1h5a1 1 0 001-1l.5-8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Eliminar cuenta
                </button>
              ) : (
                <div className="w-full max-w-xs bg-red-500/10 border border-red-400/30 rounded-2xl p-4 space-y-3">
                  <p className="text-red-200 text-xs text-center font-medium">¿Eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeleteAccount(false)}
                      disabled={userStore.profileLoading}
                      className="flex-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => { setJustLoggedOut(true); await userStore.deleteAccount(); startWaveTransition('/'); }}
                      disabled={userStore.profileLoading}
                      className="flex-1 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {userStore.profileLoading ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── View mode ─── */
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
              {/* Avatar */}
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/30 shadow-lg object-cover flex-shrink-0 cursor-pointer"
                  onClick={(e) => { e.currentTarget.classList.remove('animate-coin-spin'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('animate-coin-spin'); }}
                />
              ) : (
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-cyan-500 flex items-center justify-center text-white text-4xl sm:text-5xl shadow-lg flex-shrink-0 cursor-pointer"
                  onClick={(e) => { e.currentTarget.classList.remove('animate-coin-spin'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('animate-coin-spin'); }}
                >
                  {user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="text-white text-xl sm:text-2xl font-bold truncate">{user.name}</h1>
                <p className="text-white/50 text-sm mt-0.5 truncate">{user.email}</p>

                {/* Stats row */}
                <div className="flex items-center justify-center sm:justify-start gap-5 mt-4">
                  <div className="text-center">
                    <p className="text-white text-lg font-bold">{profileData?.publicationCount ?? 0}</p>
                    <p className="text-white/40 text-[11px]">Publicaciones</p>
                  </div>
                  <button onClick={() => openList('followers')} className="text-center group">
                    <p className="text-white text-lg font-bold group-hover:text-cyan-300 transition-colors">{profileData?.followerCount ?? 0}</p>
                    <p className="text-white/40 text-[11px]">Seguidores</p>
                  </button>
                  <button onClick={() => openList('following')} className="text-center group">
                    <p className="text-white text-lg font-bold group-hover:text-cyan-300 transition-colors">{profileData?.followingCount ?? 0}</p>
                    <p className="text-white/40 text-[11px]">Siguiendo</p>
                  </button>
                </div>

                {/* Action buttons + transition */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-5">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <button
                      onClick={startEditing}
                      className="px-5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 transition-all"
                    >
                      Editar perfil
                    </button>
                    <button
                      onClick={() => { setJustLoggedOut(true); userStore.logout(); startWaveTransition('/'); }}
                      className="px-5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 transition-all"
                    >
                      Cerrar sesión
                    </button>
                    <button
                      onClick={handleShareProfile}
                      title={copiedProfile ? '¡Enlace copiado!' : 'Compartir perfil'}
                      className={`p-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors ${copiedProfile ? 'text-green-400' : 'text-white/60 hover:text-white'}`}
                    >
                      {copiedProfile ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-white/30 text-[9px] mb-0.5">Transición</span>
                    <div className="flex items-center gap-0.5 p-px rounded-full bg-white/5 border border-white/10">
                      {([['normal', 'Normal'], ['fast', 'Rápida'], ['none', 'Sin']] as const).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setTransitionSpeed(value)}
                          className={`px-2.5 py-1.5 rounded-full text-[10px] transition-all ${
                            transitionSpeed === value
                              ? 'bg-cyan-400 text-white font-semibold shadow'
                              : 'text-white/50 hover:text-white/70'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tabs: Publicaciones / Guardadas ─── */}
        {!editing && (
          <>
            <div className="flex items-center border-b border-white/10 mt-6">
              <button
                onClick={() => setActiveTab('publications')}
                className={`flex-1 py-3 text-xs font-semibold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'publications'
                    ? 'text-white border-cyan-400'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                Publicaciones
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 text-xs font-semibold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'saved'
                    ? 'text-white border-cyan-400'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 1h10v14l-5-3-5 3V1z" />
                </svg>
                Guardadas
              </button>
            </div>

            {/* ─── Publications grid ─── */}
            <div className="mt-4 pb-8">
              {isLoadingPubs ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : currentPubs.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-12">
                  {activeTab === 'publications'
                    ? 'Aún no tienes publicaciones.'
                    : 'No has guardado ninguna publicación.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentPubs.map(pub => (
                    <div
                      key={pub.id}
                      className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all group cursor-pointer"
                      onClick={() => startWaveTransition('/map', { focusPublication: pub.id })}
                    >
                      {pub.imageUrl ? (
                        <div className="aspect-square overflow-hidden">
                          <img src={pub.imageUrl} alt={pub.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/30">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="text-white text-xs font-medium truncate">{pub.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-white/40 text-[10px]">
                          {pub.likeCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                              {pub.likeCount}
                            </span>
                          )}
                          {pub.commentCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v9H5l-3 3V2z" /></svg>
                              {pub.commentCount}
                            </span>
                          )}
                          {activeTab === 'saved' && (
                            <span className="truncate">{pub.author.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </>
        )}
      </div>

      {/* ─── Followers / Following modal ─── */}
      <AnimatePresence>
        {listModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setListModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <h3 className="text-white font-semibold">
                  {listModal === 'followers' ? 'Seguidores' : 'Siguiendo'}
                </h3>
                <button onClick={() => setListModal(null)} className="text-white/60 hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                {listLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : listUsers.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">
                    {listModal === 'followers' ? 'Sin seguidores aún.' : 'No sigues a nadie aún.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {listUsers.map(u => (
                      <button
                        key={u.email}
                        onClick={() => navigateToUser(u.email)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left"
                      >
                        <Avatar src={u.picture} name={u.name} />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{u.name}</p>
                          <p className="text-white/40 text-xs truncate">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default Profile;
