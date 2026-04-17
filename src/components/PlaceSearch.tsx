import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

interface Props {
  onSelectPlace: (lat: number, lng: number) => void;
  onExpandChange?: (expanded: boolean) => void;
}

export default function PlaceSearch({ onSelectPlace, onExpandChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (next: boolean) => {
    setExpanded(next);
    onExpandChange?.(next);
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [expanded]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggle(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=es`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' },
      });
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        setResults(data);
      }
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    onSelectPlace(parseFloat(result.lat), parseFloat(result.lon));
    toggle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') toggle(false);
    if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
  };

  // Shorten long display names
  const shortName = (name: string) => {
    const parts = name.split(',');
    return parts.slice(0, 3).join(',').trim();
  };

  return (
    <div ref={containerRef} className="absolute top-4 right-4 z-10 flex flex-col items-end" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
      <motion.div
        className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 flex items-center overflow-hidden"
        animate={{ width: expanded ? 280 : 44 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ height: '2.75rem', maxWidth: 'calc(100vw - 2rem)' }}
      >
        {/* Lupa button */}
        <button
          onClick={() => toggle(!expanded)}
          className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-gray-500 hover:text-cyan-600 transition-colors"
          title="Buscar lugar"
        >
          {loading ? (
            <motion.div
              className="w-4 h-4 border-2 border-gray-300 border-t-cyan-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
          )}
        </button>

        {/* Input — only rendered when expanded to avoid tab-focus when hidden */}
        <AnimatePresence>
          {expanded && (
            <motion.input
              ref={inputRef}
              key="search-input"
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Buscar lugar..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none pr-3 min-w-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results dropdown */}
      <AnimatePresence>
        {expanded && results.length > 0 && (
          <motion.ul
            key="results"
            className="mt-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/60 overflow-hidden"
            style={{ width: 280, maxWidth: 'calc(100vw - 2rem)' }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors border-b border-gray-100 last:border-0 leading-tight"
                  onClick={() => handleSelect(r)}
                >
                  <span className="font-medium block truncate">{shortName(r.display_name)}</span>
                  <span className="text-gray-400 truncate block">{r.display_name.split(',').slice(3, 5).join(',').trim()}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
