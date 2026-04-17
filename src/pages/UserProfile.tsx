import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWaveTransition } from '../lib/transition';
import { useUserStore } from '../lib/stores';
import type { PublicProfileData, UserSummary } from '../lib/api';
import { getPublicProfile, toggleFollow, getFollowers, getFollowingList } from '../lib/api';

type ListModal = 'followers' | 'following' | null;

export default function UserProfile() {
  const { email } = useParams<{ email: string }>();
  const { startWaveTransition } = useWaveTransition();
  const userStore = useUserStore();

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingFollow, setTogglingFollow] = useState(false);

  // Follower/Following list modal
  const [listModal, setListModal] = useState<ListModal>(null);
  const [listUsers, setListUsers] = useState<UserSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const isOwnProfile = userStore.user?.email === email;

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    setError(null);
    getPublicProfile(email)
      .then(setProfile)
      .catch(() => setError('No se pudo cargar el perfil.'))
      .finally(() => setLoading(false));
  }, [email]);

  const handleToggleFollow = async () => {
    if (!email || !userStore.isLoggedIn || togglingFollow) return;
    setTogglingFollow(true);
    try {
      const result = await toggleFollow(email);
      setProfile(prev => prev ? { ...prev, isFollowing: result.following, followerCount: result.followerCount } : prev);
    } catch { /* ignore */ }
    setTogglingFollow(false);
  };

  const openList = async (type: 'followers' | 'following') => {
    if (!email) return;
    setListModal(type);
    setListLoading(true);
    try {
      const users = type === 'followers' ? await getFollowers(email) : await getFollowingList(email);
      setListUsers(users);
    } catch {
      setListUsers([]);
    }
    setListLoading(false);
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    startWaveTransition('/map');
  };

  const navigateToUser = (userEmail: string) => {
    setListModal(null);
    startWaveTransition(`/user/${encodeURIComponent(userEmail)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error ?? 'Perfil no encontrado.'}</p>
          <a href="/map" onClick={handleGoBack} className="text-cyan-300 hover:text-cyan-100 underline">Volver al mapa</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex flex-col items-center p-6 sm:p-8 relative">
      {/* Back button */}
      <a
        href="/map"
        onClick={handleGoBack}
        className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm"
      >
        Volver
      </a>

      {/* Profile card */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 sm:p-10 flex flex-col items-center gap-5 max-w-sm w-full shadow-2xl border border-white/20 mt-16">
        {/* Avatar */}
        {profile.picture ? (
          <img src={profile.picture} alt={profile.name} className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-lg object-cover" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-cyan-500 flex items-center justify-center text-white text-5xl shadow-lg">
            {profile.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Name & email */}
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold">{profile.name}</h1>
          <p className="text-white/60 text-sm mt-1">{profile.email}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-center">
          <button onClick={() => openList('followers')} className="group">
            <p className="text-white text-xl font-bold group-hover:text-cyan-300 transition-colors">{profile.followerCount}</p>
            <p className="text-white/50 text-xs">Seguidores</p>
          </button>
          <div className="w-px h-8 bg-white/20" />
          <button onClick={() => openList('following')} className="group">
            <p className="text-white text-xl font-bold group-hover:text-cyan-300 transition-colors">{profile.followingCount}</p>
            <p className="text-white/50 text-xs">Siguiendo</p>
          </button>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white text-xl font-bold">{profile.publicationCount}</p>
            <p className="text-white/50 text-xs">Publicaciones</p>
          </div>
        </div>

        {/* Follow button (not shown for own profile) */}
        {!isOwnProfile && userStore.isLoggedIn && (
          <button
            onClick={handleToggleFollow}
            disabled={togglingFollow}
            className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50 ${
              profile.isFollowing
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg'
            }`}
          >
            {profile.isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
        )}
      </div>

      {/* Publications grid */}
      {profile.publications.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <h2 className="text-white/80 text-sm font-semibold mb-4">Publicaciones</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.publications.map(pub => (
              <div
                key={pub.id}
                onClick={() => startWaveTransition('/map', { focusPublication: pub.id })}
                className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all group cursor-pointer"
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
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14s-5.5-3.5-5.5-7.5C2.5 4 4.5 2 6.5 2c1.2 0 2.3.7 2.8 1.7L8 5.5l-1.3-1.8C7.3 2.7 8.3 2 9.5 2c2 0 3.5 1.5 3.5 4.5S8 14 8 14z" /></svg>
                        {pub.likeCount}
                      </span>
                    )}
                    {pub.commentCount > 0 && (
                      <span className="flex items-center gap-0.5">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v9H5l-3 3V2z" /></svg>
                        {pub.commentCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.publications.length === 0 && (
        <p className="mt-10 text-white/40 text-sm">Este usuario aún no tiene publicaciones.</p>
      )}

      {/* Followers / Following modal */}
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
              {/* Modal header */}
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

              {/* Modal body */}
              <div className="overflow-y-auto flex-1 p-3">
                {listLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : listUsers.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">
                    {listModal === 'followers' ? 'Sin seguidores aún.' : 'No sigue a nadie aún.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {listUsers.map(u => (
                      <button
                        key={u.email}
                        onClick={() => navigateToUser(u.email)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left"
                      >
                        {u.picture ? (
                          <img src={u.picture} alt="" className="w-9 h-9 rounded-full flex-shrink-0 object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
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
}
