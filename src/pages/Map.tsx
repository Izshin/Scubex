import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MapView from "../components/MapView";
import { getZoneSpecies } from "../lib/api";
import SpeciesPanel from "../components/SpeciesPanel";

export default function MapPage() {
  const [bbox, setBbox] = useState<number[] | null>(null);
  
  const q = useQuery({
    queryKey: ["zone-species", bbox],
    queryFn: () => getZoneSpecies(bbox!),
    enabled: !!bbox
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header fijo */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg h-16 flex items-center px-6 flex-shrink-0 z-20">
        <Link to="/" className="text-2xl font-bold text-white hover:text-blue-100 transition-colors">
          Scubex
        </Link>
      </header>

      {/* Main content con altura fija */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-0 min-h-0">
        <div className="relative">
          <MapView onViewportIdle={setBbox} />
          
          {/* Overlay de información animado */}
          <motion.div 
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border z-10"
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-sm text-gray-700">
              <motion.div 
                className="font-semibold text-blue-600 mb-1"
                animate={{ 
                  color: ["#2563eb", "#0891b2", "#2563eb"]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
            Mapa Marino
              </motion.div>
              <div>Arrastra para explorar diferentes zonas</div>
              <div className="text-xs text-gray-500 mt-1">
                Zoom: Rueda del ratón • Pan: Click y arrastra
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="bg-white shadow-xl border-l border-gray-200 flex flex-col min-h-0">
          <SpeciesPanel loading={q.isLoading} data={q.data} />
        </div>
      </div>
    </div>
  );
}