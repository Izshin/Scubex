import { motion } from 'framer-motion';
import type { WeatherData } from '../lib/api';

// WMO Weather Code → description + icon
const weatherCodeMap: Record<number, { desc: string; icon: string }> = {
  0: { desc: 'Despejado', icon: '☀️' },
  1: { desc: 'Mayormente despejado', icon: '🌤️' },
  2: { desc: 'Parcialmente nublado', icon: '⛅' },
  3: { desc: 'Nublado', icon: '☁️' },
  45: { desc: 'Niebla', icon: '🌫️' },
  48: { desc: 'Niebla con escarcha', icon: '🌫️' },
  51: { desc: 'Llovizna ligera', icon: '🌦️' },
  53: { desc: 'Llovizna moderada', icon: '🌦️' },
  55: { desc: 'Llovizna densa', icon: '🌧️' },
  61: { desc: 'Lluvia ligera', icon: '🌧️' },
  63: { desc: 'Lluvia moderada', icon: '🌧️' },
  65: { desc: 'Lluvia fuerte', icon: '🌧️' },
  71: { desc: 'Nieve ligera', icon: '🌨️' },
  73: { desc: 'Nieve moderada', icon: '🌨️' },
  75: { desc: 'Nieve fuerte', icon: '❄️' },
  80: { desc: 'Chubascos ligeros', icon: '🌦️' },
  81: { desc: 'Chubascos moderados', icon: '🌧️' },
  82: { desc: 'Chubascos violentos', icon: '⛈️' },
  95: { desc: 'Tormenta', icon: '⛈️' },
  96: { desc: 'Tormenta con granizo', icon: '⛈️' },
  99: { desc: 'Tormenta con granizo fuerte', icon: '⛈️' },
};

function getWeatherInfo(code: number | null) {
  if (code === null) return { desc: 'Desconocido', icon: '❓' };
  return weatherCodeMap[code] ?? { desc: `Código ${code}`, icon: '🌡️' };
}

function windDirectionLabel(deg: number | null): string {
  if (deg === null) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

function fmt(val: number | null, unit: string, decimals = 1): string {
  if (val === null || val === undefined) return '—';
  return `${val.toFixed(decimals)} ${unit}`;
}

type Props = {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
};

export default function WeatherPanel({ data, loading, error }: Props) {
  if (loading) {
    return (
      <motion.div
        className="p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-pulse space-y-3">
          <div className="bg-blue-100 rounded-lg p-4">
            <div className="h-4 bg-blue-200 rounded w-2/3 mb-2" />
            <div className="h-8 bg-blue-200 rounded w-1/3" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-3">
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="text-center text-blue-600 mt-4">
          <motion.div
            className="inline-block rounded-full h-5 w-5 border-b-2 border-blue-600"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="mt-1 text-xs text-gray-500">Cargando meteorología...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const weather = getWeatherInfo(data.weatherCode);

  return (
    <motion.div
      className="p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Main weather header */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-200">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{weather.icon}</span>
          <div>
            <p className="text-2xl font-bold text-gray-900">{fmt(data.temperature, '°C')}</p>
            <p className="text-sm text-gray-600">{weather.desc}</p>
          </div>
        </div>
      </div>

      {/* Atmospheric section */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Atmósfera</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat icon="💧" label="Humedad" value={fmt(data.humidity, '%', 0)} />
          <Stat icon="💨" label="Viento" value={`${fmt(data.windSpeed, 'km/h')} ${windDirectionLabel(data.windDirection)}`} />
          <Stat icon="🌧️" label="Precipitación" value={fmt(data.precipitation, 'mm')} />
          <Stat icon="🎲" label="Prob. lluvia" value={fmt(data.precipitationProbability, '%', 0)} />
          <Stat icon="👁️" label="Visibilidad" value={fmt(data.visibility ? data.visibility / 1000 : null, 'km', 1)} />
          {data.snowfall !== null && data.snowfall > 0 && (
            <Stat icon="❄️" label="Nieve" value={fmt(data.snowfall, 'cm')} />
          )}
        </div>
      </div>

      {/* Marine section */}
      <div className="bg-white border border-cyan-200 rounded-xl p-3 space-y-2">
        <h4 className="text-xs font-semibold text-cyan-500 uppercase tracking-wide">Condiciones marinas</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat icon="🌊" label="Oleaje" value={fmt(data.waveHeight, 'm')} />
          <Stat icon="🏄" label="Periodo ola" value={fmt(data.wavePeriod, 's')} />
          <Stat icon="🌡️" label="Temp. mar" value={fmt(data.seaSurfaceTemperature, '°C')} />
          <Stat icon="🧭" label="Dir. olas" value={`${data.waveDirection?.toFixed(0) ?? '—'}°`} />
          <Stat icon="🌀" label="Corriente" value={fmt(data.oceanCurrentVelocity, 'km/h')} />
          <Stat icon="〰️" label="Swell" value={fmt(data.swellWaveHeight, 'm')} />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-sm">{icon}</span>
      <div>
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
        <p className="text-sm font-medium text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}
