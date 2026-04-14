import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicationData, CommentData } from '../lib/api';
import { uploadImage, toggleLike, getLikeStatus, toggleSave, getSaveStatus, getComments, addComment, deleteComment } from '../lib/api';
import { useUserStore } from '../lib/stores/index.tsx';
import { useWaveTransition } from '../lib/transition';
import type { Map } from 'maplibre-gl';

interface PublicationDetailProps {
  publication: PublicationData;
  map: Map | null;
  isOwner: boolean;
  onClose: () => void;
  onEdit?: (id: number, data: { title: string; description?: string; imageUrl?: string }) => Promise<unknown>;
  onDelete?: (id: number) => Promise<unknown>;
}

export default function PublicationDetail({ publication, map, isOwner, onClose, onEdit, onDelete }: PublicationDetailProps) {
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

  // Fetch like/save status when expanded
  useEffect(() => {
    if (!expanded) return;
    getLikeStatus(publication.id).then(s => { setLiked(s.liked); setLikeCount(s.count); }).catch(() => {});
    if (userStore.isLoggedIn) {
      getSaveStatus(publication.id).then(s => setSaved(s.saved)).catch(() => {});
    }
  }, [expanded, publication.id, userStore.isLoggedIn]);

  // Reverse geocode when expanded
  useEffect(() => {
    if (!expanded || placeName) return;
    const controller = new AbortController();
    const opts = { signal: controller.signal };
    const extractName = (data: { address?: Record<string, string>; display_name?: string; error?: string }) => {
      if (data.error) return '';
      const addr = data.address;
      return addr?.beach || addr?.tourism || addr?.natural || addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.county || addr?.state || '';
    };
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${publication.latitude}&lon=${publication.longitude}&format=json&zoom=14&accept-language=es`, opts)
      .then(r => r.json())
      .then(data => {
        const name = extractName(data);
        if (name) { setPlaceName(name); return; }
        return fetch(`https://nominatim.openstreetmap.org/reverse?lat=${publication.latitude}&lon=${publication.longitude}&format=json&zoom=10&accept-language=es`, opts)
          .then(r => r.json())
          .then(data2 => {
            const name2 = extractName(data2);
            if (name2) { setPlaceName(name2); return; }
            return fetch(`https://nominatim.openstreetmap.org/reverse?lat=${publication.latitude}&lon=${publication.longitude}&format=json&zoom=5&accept-language=es`, opts)
              .then(r => r.json())
              .then(data3 => { setPlaceName(extractName(data3) || 'Mar abierto'); });
          });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [expanded, publication.latitude, publication.longitude, placeName]);

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

  const popupWidth = 400;
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
    setEditImagePreview(URL.createObjectURL(file));
  };

  const removeEditImage = () => {
    setEditImageFile(null);
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

  let top = screenPos.y - markerH - gap - tailH - cardHeight;
  const clamped = top < minTop;
  if (clamped) top = minTop;

  // Clamp left so popup stays within viewport
  const containerWidth = map?.getContainer().clientWidth ?? 800;
  let left = screenPos.x - popupWidth / 2;
  if (left < 8) left = 8;
  if (left + popupWidth > containerWidth - 8) left = containerWidth - popupWidth - 8;

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
          {!clamped && (
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
          )}
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

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                          if (!userStore.isLoggedIn) return;
                          const res = await toggleLike(publication.id);
                          setLiked(res.liked);
                          setLikeCount(res.count);
                        }}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'} ${!userStore.isLoggedIn ? 'opacity-50 cursor-default' : ''}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="text-xs font-medium">{likeCount}</span>
                      </button>

                      {/* Comment toggle */}
                      <button
                        onClick={() => setShowComments(!showComments)}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? 'text-cyan-500' : 'text-gray-400 hover:text-cyan-400'}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="text-xs font-medium">{commentCount}</span>
                      </button>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={async () => {
                        if (!userStore.isLoggedIn) return;
                        const res = await toggleSave(publication.id);
                        setSaved(res.saved);
                      }}
                      className={`transition-colors ${saved ? 'text-cyan-500' : 'text-gray-400 hover:text-cyan-400'} ${!userStore.isLoggedIn ? 'opacity-50 cursor-default' : ''}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Comments section */}
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
                          {userStore.isLoggedIn && (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!commentText.trim() || submittingComment) return;
                                setSubmittingComment(true);
                                try {
                                  const c = await addComment(publication.id, commentText.trim());
                                  setComments(prev => [...prev, c]);
                                  setCommentCount(n => n + 1);
                                  setCommentText('');
                                } catch { /* ignored */ }
                                setSubmittingComment(false);
                              }}
                              className="flex gap-2"
                            >
                              <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Escribe un comentario..."
                                maxLength={500}
                                className="flex-1 border border-gray-200 rounded-full px-3 py-1.5 text-sm focus:outline-none"
                              />
                              <button
                                type="submit"
                                disabled={!commentText.trim() || submittingComment}
                                className="px-3 py-1.5 rounded-full bg-cyan-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-cyan-600 transition-colors"
                              >
                                {submittingComment ? '...' : 'Enviar'}
                              </button>
                            </form>
                          )}

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
                                            setCommentCount(n => Math.max(0, n - 1));
                                          }}
                                          className="text-[10px] text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                          eliminar
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 break-words">{c.text}</p>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
