import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useWaveTransition } from '../lib/transition';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationData,
} from '../lib/api';

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

function notificationText(n: NotificationData): string {
  switch (n.type) {
    case 'FOLLOW': return `${n.actorName} ha empezado a seguirte`;
    case 'LIKE': return `${n.actorName} ha dado like a "${n.publicationTitle}"`;
    case 'COMMENT': return `${n.actorName} comentó en "${n.publicationTitle}"`;
    case 'MENTION': return `${n.actorName} te mencionó en "${n.publicationTitle}"`;
  }
}

interface Props {
  /** called when the user navigates to a publication via a notification */
  onFocusPublication?: (id: number) => void;
}

function SwipeableNotification({
  n,
  onDismiss,
  onClick,
}: {
  n: NotificationData;
  onDismiss: (id: number) => void;
  onClick: (n: NotificationData) => void;
}) {
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [-20, -10], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -60) onDismiss(n.id);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe-reveal red bg */}
      <motion.div style={{ opacity: revealOpacity }} className="absolute inset-0 bg-red-100 flex items-center justify-end pr-4 pointer-events-none">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={() => onClick(n)}
        className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 group ${
          !n.read ? 'bg-cyan-50/60' : 'bg-white'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {n.actorPicture ? (
            <img src={n.actorPicture} alt={n.actorName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold">
              {n.actorName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug">{notificationText(n)}</p>
          {n.commentSnippet && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{n.commentSnippet}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 mt-1">
          {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-500" />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
            className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center text-gray-400 hover:text-red-400 active:text-red-600"
            title="Eliminar"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function NotificationBell({ onFocusPublication }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDismiss = useCallback((id: number) => {
    setNotifications(prev => {
      const n = prev.find(x => x.id === id);
      if (n && !n.read) setUnread(u => Math.max(0, u - 1));
      return prev.filter(x => x.id !== id);
    });
    deleteNotification(id).catch(() => {});
  }, []);
  const panelRef = useRef<HTMLDivElement>(null);
  const { startWaveTransition } = useWaveTransition();

  const fetchCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnread(count);
    } catch { /* ignore */ }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnread(data.filter(n => !n.read).length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // Fetch count on mount and on tab focus
  useEffect(() => {
    fetchCount();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCount(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchCount]);

  // Fetch full list when panel opens
  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (n: NotificationData) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    if ((n.type === 'LIKE' || n.type === 'COMMENT' || n.type === 'MENTION') && n.publicationId) {
      if (onFocusPublication) {
        onFocusPublication(n.publicationId);
      } else {
        startWaveTransition('/map', { focusPublication: n.publicationId });
      }
    } else if (n.type === 'FOLLOW') {
      startWaveTransition(`/user/${encodeURIComponent(n.actorEmail)}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div ref={panelRef} className="relative self-stretch flex items-center">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center h-full aspect-square rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
        title="Notificaciones"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold tabular-nums rounded-full flex items-center justify-center px-0.5"
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 top-16 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200/60 flex flex-col z-50 max-h-[70vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">Notificaciones</span>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                >
                  Marcar todo como leído
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <motion.div
                    className="w-5 h-5 border-2 border-cyan-300 border-t-cyan-600 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No tienes notificaciones
                </div>
              ) : (
                notifications.map(n => (
                  <SwipeableNotification
                    key={n.id}
                    n={n}
                    onDismiss={handleDismiss}
                    onClick={handleClick}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
