import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Map } from 'maplibre-gl';
import { uploadImage } from '../lib/api';
import { reverseGeocode } from '../lib/geocode';

interface PublicationPopupProps {
  lat: number;
  lng: number;
  map: Map | null;
  onSubmit: (data: { title: string; description: string; imageUrl: string }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function PublicationPopup({ lat, lng, map, onSubmit, onClose, isLoading }: PublicationPopupProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [placeName, setPlaceName] = useState('');
  const prevImagePreviewRef = useRef<string | null>(null);

  // Reverse geocode to get place name (uses module-level cache to avoid repeated requests)
  useEffect(() => {
    const controller = new AbortController();
    reverseGeocode(lat, lng, controller.signal)
      .then(name => { if (!controller.signal.aborted) setPlaceName(name); })
      .catch(() => {});
    return () => controller.abort();
  }, [lat, lng]);

  const updatePosition = useCallback(() => {
    if (!map) return;
    const point = map.project([lng, lat]);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, lat, lng]);

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
  }, [screenPos]);

  // Keep measuring on resize/content changes
  useEffect(() => {
    if (!cardRef.current) return;
    const obs = new ResizeObserver(([entry]) => setCardHeight(entry.contentRect.height));
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [imagePreview]);

  // Pan map up when image is added so the preview fits in viewport
  useEffect(() => {
    if (!map) return;
    const wasImage = prevImagePreviewRef.current !== null;
    const isImage = imagePreview !== null;
    prevImagePreviewRef.current = imagePreview;

    if (!wasImage && isImage) {
      map.panBy([0, -190], { duration: 350 });
    } else if (wasImage && !isImage) {
      map.panBy([0, 190], { duration: 350 });
    }
  }, [imagePreview, map]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImageError('La foto no puede superar los 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImageError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let imageUrl = '';
    if (imageFile) {
      try {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
      } catch {
        return;
      } finally {
        setUploading(false);
      }
    }

    onSubmit({ title: title.trim(), description: description.trim(), imageUrl });
  };

  if (!screenPos) return null;

  const containerWidth_pre = map?.getContainer().clientWidth ?? 800;
  const popupWidth = containerWidth_pre < 500 ? Math.min(300, containerWidth_pre - 24) : 400;
  const markerH = 60;
  const gap = 4;
  const tailH = 10;
  const minTop = 8;

  let top = screenPos.y - markerH - gap - tailH - cardHeight;
  if (top < minTop) top = minTop;

  // Keep popup horizontally within viewport
  let left = screenPos.x - popupWidth / 2;
  if (left < 8) left = 8;
  if (left + popupWidth > containerWidth_pre - 8) left = containerWidth_pre - popupWidth - 8;

  // Compute tail horizontal offset — clamped so it never reaches rounded corners
  const tailMaxOffset = popupWidth / 2 - 28;
  const tailOffset = Math.max(
    -tailMaxOffset,
    Math.min(tailMaxOffset, screenPos.x - left - popupWidth / 2)
  );

  return (
    <motion.div
      className="absolute z-30 pointer-events-auto flex flex-col items-center"
      style={{ left, top, width: popupWidth }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      <div ref={cardRef} className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Nueva publicación</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Coords */}
        <div className="px-4 pt-3 text-xs text-gray-400 flex items-center gap-2">
          <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
          {placeName && (
            <span className="text-gray-500 font-medium truncate">· {placeName}</span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input
            type="text"
            placeholder="Título *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all resize-none"
          />
          {/* Image upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg bg-gray-50" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-3 text-sm rounded-lg border border-dashed border-gray-300 hover:border-cyan-400 text-gray-400 hover:text-cyan-500 transition-all flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Añadir foto
              </button>
            )}
          </div>
          {imageError && <p className="text-xs text-red-500 -mt-1">{imageError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isLoading || uploading}
              className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Subiendo foto...' : isLoading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>

      {/* Tail — offset horizontally so it always points at the marker pin */}
      <svg width="20" height={tailH} viewBox="0 0 20 10" fill="none" className="-mt-px" style={{ marginLeft: tailOffset * 2 }}>
        <path d="M0 0L10 10L20 0" fill="white" />
        <path d="M0 0L10 10L20 0" stroke="#e5e7eb" strokeWidth="1" fill="none" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}
