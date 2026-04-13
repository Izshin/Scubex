import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicationData } from '../lib/api';
import { uploadImage } from '../lib/api';
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
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);

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
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const removeEditImage = () => {
    setEditImageFile(null);
    setEditImagePreview('');
    setEditImageUrl('');
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
                  <img src={publication.author.picture} alt="" className="w-6 h-6 rounded-full border border-white/30 flex-shrink-0" />
                )}
                <span className="text-white/80 text-xs truncate">{publication.author.name}</span>
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
                <span className="text-[10px] text-gray-400">
                  {new Date(publication.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
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

          {/* Tail */}
          {!clamped && (
            <svg width="20" height={tailH} viewBox="0 0 20 10" fill="none" className="-mt-px">
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
            <div className="flex items-center gap-3 min-w-0">
              {publication.author.picture && (
                <img src={publication.author.picture} alt="" className="w-8 h-8 rounded-full border-2 border-white/30 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-white font-semibold text-sm block truncate">{publication.author.name}</span>
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
                  </div>
                </div>

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

                {/* Delete zone */}
                <div className="pt-3 border-t border-gray-100">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-red-400 hover:text-red-500 transition-colors"
                    >
                      Eliminar publicación
                    </button>
                  ) : (
                    <div className="bg-red-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-red-600 font-medium">¿Seguro que quieres eliminar esta publicación?</p>
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
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 0C3.686 0 1 3.134 1 7c0 5.25 6 7 6 7s6-1.75 6-7c0-3.866-2.686-7-6-7z" fill="#06b6d4" opacity="0.3" />
                    <circle cx="7" cy="6.5" r="2" fill="#06b6d4" />
                  </svg>
                  <span className="font-mono">{publication.latitude.toFixed(4)}, {publication.longitude.toFixed(4)}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 text-gray-400 hover:text-cyan-500 transition-colors text-sm">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 14s-5.5-3.5-5.5-7.5C2.5 3.962 4.462 2 7 2c1.12 0 2.134.487 2.832 1.261A3.48 3.48 0 0 1 13 2c2.538 0 4.5 1.962 4.5 4.5C17.5 10.5 12 14 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.82) translate(1,1)" />
                      </svg>
                      Me gusta
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-400 hover:text-cyan-500 transition-colors text-sm">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6l-3 2.5V11H4a2 2 0 0 1-2-2V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                      Comentarios
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 italic">Próximamente: likes, comentarios y guardados</p>
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
