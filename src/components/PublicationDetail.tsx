import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicationData, CommentData } from '../lib/api';
import { uploadImage, toggleLike, getLikeStatus, toggleSave, getSaveStatus, getComments, addComment, deleteComment, loginWithGoogle } from '../lib/api';
import { reverseGeocode } from '../lib/geocode';
import { useUserStore } from '../lib/stores/index.tsx';
import { GoogleLogin } from '@react-oauth/google';
import { useWaveTransition } from '../lib/transition';
import type { Map } from 'maplibre-gl';

// Render comment text with @[Name](email) mentions highlighted
function renderMentions(text: string) {
  const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) return <span key={i} className="text-cyan-600 font-medium">@{match[1]}</span>;
    return <span key={i}>{part}</span>;
  });
}

interface PublicationDetailProps {
  publication: PublicationData;
  map: Map | null;
  isOwner: boolean;
  onClose: () => void;
  hidden?: boolean;
  onEdit?: (id: number, data: { title: string; description?: string; imageUrl?: string }) => Promise<unknown>;
  onDelete?: (id: number) => Promise<unknown>;
  onCountsChange?: (likeCount: number, commentCount: number) => void;
}

function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleShare}
      title={copied ? '¡Enlace copiado!' : 'Compartir publicación'}
      className={`transition-colors ${copied ? 'text-green-500' : 'text-gray-400 hover:text-cyan-400'}`}
    >
      {copied ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
}

export default function PublicationDetail({ publication, map, isOwner, onClose, hidden = false, onEdit, onDelete, onCountsChange }: PublicationDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editImageError, setEditImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);
  const editBlobUrlRef = useRef<string | null>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);

  // Place name from reverse geocoding
  const [placeName, setPlaceName] = useState('');

  // Interaction state
  const userStore = useUserStore();
  const { startWaveTransition } = useWaveTransition();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(publication.likeCount ?? 0);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentCount, setCommentCount] = useState(publication.commentCount ?? 0);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [optimisticError, setOptimisticError] = useState<string | null>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Fetch like/save status when expanded
  useEffect(() => {
    if (!expanded) return;
    getLikeStatus(publication.id).then(s => { setLiked(s.liked); setLikeCount(s.count); }).catch(() => {});
    if (userStore.isLoggedIn) {
      getSaveStatus(publication.id).then(s => setSaved(s.saved)).catch(() => {});
    }
  }, [expanded, publication.id, userStore.isLoggedIn]);

  // Reverse geocode when expanded (uses module-level cache to avoid repeated network requests)
  useEffect(() => {
    if (!expanded || placeName) return;
    const controller = new AbortController();
    reverseGeocode(publication.latitude, publication.longitude, controller.signal)
      .then(name => { if (!controller.signal.aborted) setPlaceName(name); })
      .catch(() => {});
    return () => controller.abort();
  }, [expanded, publication.latitude, publication.longitude, placeName]);

  // Revoke edit image blob URL when editing ends or on unmount
  useEffect(() => {
    if (!editing && editBlobUrlRef.current) {
      URL.revokeObjectURL(editBlobUrlRef.current);
      editBlobUrlRef.current = null;
    }
  }, [editing]);
  useEffect(() => {
    const ref = editBlobUrlRef;
    return () => { if (ref.current) URL.revokeObjectURL(ref.current); };
  }, []);

  // Fetch comments when section opened
  useEffect(() => {
    if (!showComments) return;
    getComments(publication.id).then(setComments).catch(() => {});
  }, [showComments, publication.id]);

  const updatePosition = useCallback(() => {
    if (!map) return;
    const point = map.project([publication.longitude, publication.latitude]);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, publication.latitude, publication.longitude]);

  useEffect(() => {
    updatePosition();
    if (!map) return;
    map.on('move', updatePosition);
    return () => { map.off('move', updatePosition); };
  }, [map, updatePosition]);

  // Measure card height synchronously before paint
  useLayoutEffect(() => {
    if (cardRef.current) {
      setCardHeight(cardRef.current.getBoundingClientRect().height);
    }
  });

  // Keep measuring on resize
  useEffect(() => {
    if (cardRef.current) {
      const obs = new ResizeObserver(([entry]) => setCardHeight(entry.contentRect.height));
      obs.observe(cardRef.current);
      return () => obs.disconnect();
    }
  }, [expanded]);

  const containerWidth_pre = map?.getContainer().clientWidth ?? 800;
  const popupWidth = containerWidth_pre < 500 ? Math.min(300, containerWidth_pre - 24) : 400;
  const tailH = 10;
  const markerH = 60;
  const gap = 4;
  const minTop = 8;

  const startEditing = () => {
    setEditTitle(publication.title);
    setEditDescription(publication.description || '');
    setEditImageUrl(publication.imageUrl || '');
    setEditImagePreview(publication.imageUrl || '');
    setEditImageFile(null);
    setEditing(true);
    setConfirmDelete(false);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEditImageError('La foto no puede superar los 5 MB.');
      if (editFileRef.current) editFileRef.current.value = '';
      return;
    }
    setEditImageError('');
    setEditImageFile(file);
    if (editBlobUrlRef.current) URL.revokeObjectURL(editBlobUrlRef.current);
    const blobUrl = URL.createObjectURL(file);
    editBlobUrlRef.current = blobUrl;
    setEditImagePreview(blobUrl);
  };

  const removeEditImage = () => {
    setEditImageFile(null);
    if (editBlobUrlRef.current) {
      URL.revokeObjectURL(editBlobUrlRef.current);
      editBlobUrlRef.current = null;
    }
    setEditImagePreview('');
    setEditImageUrl('');
    setEditImageError('');
    if (editFileRef.current) editFileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!onEdit || !editTitle.trim()) return;
    setSaving(true);
    let finalImageUrl = editImageUrl;
    if (editImageFile) {
      try {
        finalImageUrl = await uploadImage(editImageFile);
      } catch {
        setSaving(false);
        return;
      }
    }
    await onEdit(publication.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      imageUrl: finalImageUrl || undefined,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    await onDelete(publication.id);
    setSaving(false);
    onClose();
  };

  if (!screenPos) return null;
  if (hidden) return null;

  let top = screenPos.y - markerH - gap - tailH - cardHeight;
  const clamped = top < minTop;
  if (clamped) top = minTop;

  // Clamp left so popup stays within viewport
  let left = screenPos.x - popupWidth / 2;
  if (left < 8) left = 8;
  if (left + popupWidth > containerWidth_pre - 8) left = containerWidth_pre - popupWidth - 8;

  // Compute tail horizontal offset — clamped so it never reaches the rounded corners
  const tailMaxOffset = popupWidth / 2 - 28;
  const tailOffset = Math.max(
    -tailMaxOffset,
    Math.min(tailMaxOffset, screenPos.x - left - popupWidth / 2)
  );

  return (
    <AnimatePresence mode="wait">
      {!expanded ? (
        <motion.div
          key="compact"
          className="absolute z-30 pointer-events-auto flex flex-col items-center"
          style={{ left, top, width: popupWidth }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
        >
          <div ref={cardRef} className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {publication.author.picture && (
                  <img src={publication.author.picture} alt="" className="w-6 h-6 rounded-full border border-white/30 flex-shrink-0 cursor-pointer" onClick={() => startWaveTransition(`/user/${encodeURIComponent(publication.author.email)}`)} />
                )}
                <span className="text-white/80 text-xs truncate cursor-pointer hover:text-white transition-colors" onClick={() => startWaveTransition(`/user/${encodeURIComponent(publication.author.email)}`)}>{publication.author.name}</span>
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white transition-colors flex-shrink-0 ml-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 text-sm leading-tight">{publication.title}</h3>
              {publication.description && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{publication.description}</p>
              )}
              {publication.imageUrl && (
                <img src={publication.imageUrl} alt="" className="w-full max-h-48 object-contain rounded-lg bg-gray-50 mt-3" />
              )}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">
                    {new Date(publication.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {likeCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      {likeCount}
                    </span>
                  )}
                  {commentCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      {commentCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
                >
                  Ver más
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Tail — offset horizontally so it always points at the marker pin */}
          <svg
            width="20"
            height={tailH}
            viewBox="0 0 20 10"
            fill="none"
            className="-mt-px"
            style={{ marginLeft: tailOffset * 2 }}
          >
            <path d="M0 0L10 10L20 0" fill="white" />
            <path d="M0 0L10 10L20 0" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeLinejoin="round" />
          </svg>
        </motion.div>
      ) : (
        /* Expanded panel */
        <motion.div
          key="expanded"
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: 'calc(100% - 3rem)', height: 'calc(100% - 3rem)', maxWidth: 480 }}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => startWaveTransition(`/user/${encodeURIComponent(publication.author.email)}`)}>
              {publication.author.picture && (
                <img src={publication.author.picture} alt="" className="w-8 h-8 rounded-full border-2 border-white/30 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-white font-semibold text-sm block truncate hover:text-cyan-200 transition-colors">{publication.author.name}</span>
                <span className="text-white/60 text-[10px]">
                  {new Date(publication.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && !editing && (
                <button onClick={startEditing} className="text-white/70 hover:text-white transition-colors" title="Editar">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <button onClick={() => { setEditing(false); setConfirmDelete(false); onClose(); }} className="text-white/70 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Optimistic error toast */}
          <AnimatePresence>
            {optimisticError && (
              <motion.div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                {optimisticError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable content */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {editing ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Título</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      placeholder="Título de la publicación"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Descripción</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none"
                      placeholder="Descripción..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Imagen</label>
                    {editImagePreview ? (
                      <div className="relative">
                        <img src={editImagePreview} alt="" className="w-full max-h-48 object-contain rounded-lg bg-gray-50" />
                        <button
                          onClick={removeEditImage}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => editFileRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:text-gray-500 hover:border-gray-300 transition-colors"
                      >
                        + Añadir imagen
                      </button>
                    )}
                    <input
                      ref={editFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleEditFileChange}
                    />
                    {editImageError && <p className="text-xs text-red-500 mt-1">{editImageError}</p>}
                  </div>
                </div>

                {/* Delete button */}
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full px-4 py-2 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.5 3.5h11M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M3 3.5l.5 8.5a1 1 0 001 1h5a1 1 0 001-1l.5-8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Eliminar publicación
                  </button>
                ) : (
                  <div className="bg-red-50 rounded-xl p-3 space-y-2 border border-red-200">
                    <p className="text-xs text-red-600 font-medium text-center">¿Seguro que quieres eliminar esta publicación?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={saving}
                        className="flex-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition-all disabled:opacity-50"
                      >
                        No, cancelar
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="flex-1 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {saving ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setEditing(false); setConfirmDelete(false); }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editTitle.trim()}
                    className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-800">{publication.title}</h2>
                {publication.description && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{publication.description}</p>
                )}
                {publication.imageUrl && (
                  <img src={publication.imageUrl} alt="" className="w-full rounded-xl object-contain max-h-[60vh] bg-gray-50" />
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    <path d="M7 0C3.686 0 1 3.134 1 7c0 5.25 6 7 6 7s6-1.75 6-7c0-3.866-2.686-7-6-7z" fill="#06b6d4" opacity="0.3" />
                    <circle cx="7" cy="6.5" r="2" fill="#06b6d4" />
                  </svg>
                  <div className="flex flex-col gap-0.5">
                    {placeName && <span className="text-cyan-600 font-medium">{placeName}</span>}
                    <span className="font-mono">{publication.latitude.toFixed(4)}, {publication.longitude.toFixed(4)}</span>
                  </div>
                </div>

                {/* Like / Save / Comment bar */}
                <div className="pt-3 border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button
                        onClick={async () => {
                          if (!userStore.isLoggedIn) { setShowLoginPopup(true); return; }
                          // Optimistic update
                          const prevLiked = liked;
                          const prevCount = likeCount;
                          const newCount = liked ? likeCount - 1 : likeCount + 1;
                          setLiked(!liked);
                          setLikeCount(newCount);
                          onCountsChange?.(newCount, commentCount);
                          try {
                            const res = await toggleLike(publication.id);
                            setLiked(res.liked);
                            setLikeCount(res.count);
                            onCountsChange?.(res.count, commentCount);
                          } catch {
                            // Rollback
                            setLiked(prevLiked);
                            setLikeCount(prevCount);
                            onCountsChange?.(prevCount, commentCount);
                            setOptimisticError('No se pudo actualizar el like');
                            setTimeout(() => setOptimisticError(null), 3000);
                          }
                        }}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="text-xs font-medium">{likeCount}</span>
                      </button>

                      {/* Comment toggle */}
                      <button
                        onClick={() => {
                          const opening = !showComments;
                          setShowComments(opening);
                          if (opening) {
                            setTimeout(() => {
                              commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 220);
                          }
                        }}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? 'text-cyan-500' : 'text-gray-400 hover:text-cyan-400'}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="text-xs font-medium">{commentCount}</span>
                      </button>

                      {/* Share button */}
                      <ShareButton url={`${window.location.origin}/map?pub=${publication.id}`} title={publication.title} />
                    </div>

                    {/* Save button */}
                    <button
                      onClick={async () => {
                        if (!userStore.isLoggedIn) { setShowLoginPopup(true); return; }
                        // Optimistic update
                        const prevSaved = saved;
                        setSaved(!saved);
                        try {
                          const res = await toggleSave(publication.id);
                          setSaved(res.saved);
                        } catch {
                          // Rollback
                          setSaved(prevSaved);
                          setOptimisticError('No se pudo actualizar el guardado');
                          setTimeout(() => setOptimisticError(null), 3000);
                        }
                      }}
                      className={`transition-colors ${saved ? 'text-cyan-500' : 'text-gray-400 hover:text-cyan-400'}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Comments section */}
                  <div ref={commentsRef} />
                  <AnimatePresence>
                    {showComments && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3">
                          {/* Comment input */}
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!userStore.isLoggedIn) { setShowLoginPopup(true); return; }
                                if (!commentText.trim() || submittingComment) return;
                                // Optimistic: add temp comment immediately
                                const tempId = -Date.now();
                                const capturedText = commentText.trim();
                                const tempComment = {
                                  id: tempId,
                                  text: capturedText,
                                  createdAt: new Date().toISOString(),
                                  author: {
                                    name: userStore.user!.name,
                                    picture: userStore.user!.picture,
                                    email: userStore.user!.email,
                                  },
                                };
                                setComments(prev => [...prev, tempComment]);
                                setCommentCount(n => {
                                  const next = n + 1;
                                  onCountsChange?.(likeCount, next);
                                  return next;
                                });
                                setCommentText('');
                                setSubmittingComment(true);
                                try {
                                  const c = await addComment(publication.id, capturedText);
                                  // Replace temp with real comment from server
                                  setComments(prev => prev.map(x => x.id === tempId ? c : x));
                                } catch {
                                  // Rollback
                                  setComments(prev => prev.filter(x => x.id !== tempId));
                                  setCommentCount(n => {
                                    const next = Math.max(0, n - 1);
                                    onCountsChange?.(likeCount, next);
                                    return next;
                                  });
                                  setCommentText(capturedText);
                                  setOptimisticError('No se pudo enviar el comentario');
                                  setTimeout(() => setOptimisticError(null), 3000);
                                }
                                setSubmittingComment(false);
                              }}
                              className="flex gap-2"
                            >
                              <input
                                ref={commentInputRef}
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Escribe un comentario..."
                                maxLength={500}
                                className="flex-1 border border-gray-200 rounded-full px-3 py-1.5 text-sm focus:outline-none"
                                readOnly={!userStore.isLoggedIn}
                                onClick={() => { if (!userStore.isLoggedIn) setShowLoginPopup(true); }}
                              />
                              <button
                                type="submit"
                                disabled={userStore.isLoggedIn && (!commentText.trim() || submittingComment)}
                                className="px-3 py-1.5 rounded-full bg-cyan-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-cyan-600 transition-colors"
                              >
                                {submittingComment ? '...' : 'Enviar'}
                              </button>
                            </form>

                          {/* Comment list */}
                          {comments.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">No hay comentarios aún</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {comments.map(c => (
                                <div key={c.id} className="flex gap-2 group">
                                  {c.author.picture ? (
                                    <img src={c.author.picture} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-cyan-600 transition-colors" onClick={() => startWaveTransition(`/user/${encodeURIComponent(c.author.email)}`)}>{c.author.name}</span>
                                      <span className="text-[10px] text-gray-400">
                                        {new Date(c.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                      </span>
                                      {userStore.user?.email === c.author.email && (
                                        <button
                                          onClick={async () => {
                                            await deleteComment(publication.id, c.id);
                                            setComments(prev => prev.filter(x => x.id !== c.id));
                                            setCommentCount(n => {
                                              const next = Math.max(0, n - 1);
                                              onCountsChange?.(likeCount, next);
                                              return next;
                                            });
                                          }}
                                          className="text-[10px] text-gray-300 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                        >
                                          eliminar
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 break-words leading-snug">{renderMentions(c.text)}</p>
                                    {userStore.isLoggedIn && userStore.user?.email !== c.author.email && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const mention = `@[${c.author.name}](${c.author.email}) `;
                                          setCommentText(mention);
                                          setTimeout(() => {
                                            const input = commentInputRef.current;
                                            if (input) { input.focus(); input.setSelectionRange(mention.length, mention.length); }
                                          }, 0);
                                        }}
                                        className="text-[10px] text-gray-400 hover:text-cyan-500 transition-colors leading-none"
                                      >
                                        responder
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
          {/* Login required popup */}
          <AnimatePresence>
            {showLoginPopup && (
              <motion.div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setShowLoginPopup(false)}
              >
                <motion.div
                  className="relative bg-white rounded-2xl shadow-xl border border-gray-200/60 p-5 flex flex-col items-center gap-3 w-72 mx-4"
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 10 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowLoginPopup(false)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-cyan-600 text-xl leading-none transition-colors"
                  >
                    ×
                  </button>
                  <p className="text-sm font-semibold text-gray-800 text-center">Inicia sesión para interactuar</p>
                  <p className="text-xs text-gray-500 text-center">Necesitas una cuenta para dar likes, guardar o comentar publicaciones.</p>
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-md">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Iniciar sesión con Google
                    </div>
                    <div className="absolute inset-0 overflow-hidden rounded-xl" style={{ opacity: 0.01 }}>
                      <GoogleLogin
                        onSuccess={async (res) => {
                          if (!res.credential) return;
                          try {
                            const data = await loginWithGoogle(res.credential);
                            userStore.setUser({ ...data.user, token: data.token });
                            setShowLoginPopup(false);
                          } catch (e) {
                            console.error('Login failed', e);
                          }
                        }}
                        onError={() => console.error('Google login error')}
                        shape="pill"
                        theme="filled_blue"
                        width={288}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
