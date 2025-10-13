import { motion, AnimatePresence } from 'framer-motion';

type Props = { 
  loading: boolean; 
  data?: {
    species?: Array<{
      taxon_id: string;
      common_name?: string;
      scientific_name: string;
      records: number;
      last_record: string;
      photoUrl?: string;
    }>;
    counts?: {
      total_taxa: number;
      total_occurrences?: number;
    };
    source?: string[];
  }; 
};

export default function SpeciesPanel({ loading, data }: Props) {
  if (loading) {
    return (
      <motion.div 
        className="p-6 h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="animate-pulse">
          <div className="bg-blue-100 rounded-lg p-4 mb-4">
            <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-blue-200 rounded w-1/2"></div>
          </div>
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i} 
              className="bg-gray-100 rounded-lg p-4 mb-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </motion.div>
          ))}
        </div>
        <motion.div 
          className="text-center text-blue-600 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div 
            className="inline-block rounded-full h-6 w-6 border-b-2 border-blue-600"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p 
            className="mt-2 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Explorando vida marina...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }
  
  if (!data) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-4">🌊</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Explora el océano</h3>
        <p className="text-gray-500 mb-4">
          Mueve el mapa para descubrir qué especies marinas habitan cada zona
        </p>
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
          <p className="text-sm text-blue-700">
            💡 <strong>Tip:</strong> Arrastra el mapa o usa zoom para explorar diferentes áreas marinas
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header del panel */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 border-b">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          🐠 Especies Marinas
        </h2>
        <div className="text-sm text-gray-600 bg-white rounded-lg p-2 border space-y-1">
          <div className="flex items-center justify-between">
            <span>📊 <strong>{data.counts?.total_taxa ?? 0}</strong> especies únicas</span>
            {data.source && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {data.source.join(", ")}
              </span>
            )}
          </div>
          {data.counts?.total_occurrences && (
            <div className="text-xs text-gray-500">
              🔢 <strong>{data.counts.total_occurrences.toLocaleString()}</strong> registros totales
            </div>
          )}
        </div>
      </div>

      {/* Lista de especies */}
      <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
        <AnimatePresence>
          {data.species?.length === 0 ? (
            <motion.div 
              className="text-center py-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div 
                className="text-4xl mb-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🤿
              </motion.div>
              <p className="text-gray-500">No se encontraron especies marinas en esta zona</p>
              <p className="text-xs text-gray-400 mt-1">Prueba explorando otra área </p>
            </motion.div>
          ) : (
            data.species?.map((s, index) => (
              <motion.div 
                key={s.taxon_id} 
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  scale: 1.02,
                  y: -2,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {s.common_name ?? s.scientific_name}
                    </h3>
                    {s.common_name && (
                      <p className="text-sm text-gray-500 italic">{s.scientific_name}</p>
                    )}
                  </div>
                  {/* Show photo if available, otherwise show fish emoji */}
                  <motion.div 
                    className="w-12 h-12 flex-shrink-0"
                    whileHover={{ 
                      scale: 1.1,
                      transition: { duration: 0.2 }
                    }}
                  >
                    {s.photoUrl ? (
                      <img 
                        src={s.photoUrl} 
                        alt={s.common_name ?? s.scientific_name}
                        className="w-full h-full object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`text-2xl flex items-center justify-center w-full h-full ${s.photoUrl ? 'hidden' : ''}`}>
                      🐟
                    </div>
                  </motion.div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600 mt-3">
                  <div className="flex items-center gap-4">
                    <motion.span 
                      className="bg-green-100 text-green-700 px-2 py-1 rounded-full"
                      whileHover={{ scale: 1.05 }}
                    >
                      📈 {s.records} registros
                    </motion.span>
                    <motion.span 
                      className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                      whileHover={{ scale: 1.05 }}
                    >
                      🗓️ {s.last_record}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer del panel */}
      <div className="bg-gray-50 p-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          🌊 Datos de biodiversidad marina actualizados
        </p>
      </div>
    </div>
  );
}