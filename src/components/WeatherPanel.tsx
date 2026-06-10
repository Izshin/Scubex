import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from './Spinner';
import type { WeatherData, DailyForecastItem } from '../lib/api';

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
  if (deg === null) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

function fmt(val: number | null | undefined, unit: string, decimals = 1): string {
  if (val === null || val === undefined) return '—';
  return `${val.toFixed(decimals)} ${unit}`;
}

// Evaluate diving condition: 'good' | 'moderate' | 'bad'
type Condition = 'good' | 'moderate' | 'bad';

function getConditionStyles(condition: Condition) {
  switch (condition) {
    case 'good':     return { bg: 'bg-emerald-50/90', border: 'border-emerald-300/60', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', label: 'Buenas condiciones',    labelShort: 'Buenas' };
    case 'moderate': return { bg: 'bg-amber-50/90',   border: 'border-amber-300/60',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',   label: 'Condiciones tolerables', labelShort: 'Tolerables' };
    case 'bad':      return { bg: 'bg-red-50/90',     border: 'border-red-300/60',     badge: 'bg-red-100 text-red-700',     dot: 'bg-red-400',     label: 'Condiciones adversas',   labelShort: 'Adversas' };
  }
}

// Color for forecast stats (no WeatherData, just raw values)
function forecastStatColor(label: string, val: number | null): string {
  const bad = 'text-red-600', mod = 'text-amber-600', good = 'text-emerald-700', neutral = 'text-gray-800';
  if (val === null) return neutral;
  switch (label) {
    case 'Viento':       return val < 15 ? good : val < 30 ? mod : bad;
    case 'Oleaje':       return val < 0.5 ? good : val < 1.5 ? mod : bad;
    case 'Prob. lluvia': return val < 20 ? good : val < 60 ? mod : bad;
    default:             return neutral;
  }
}

// Color a stat value based on thresholds
function statColor(label: string, data: WeatherData): string {
  const bad = 'text-red-600';
  const mod = 'text-amber-600';
  const good = 'text-emerald-700';
  const neutral = 'text-gray-800';

  switch (label) {
    case 'Viento': return data.windSpeed === null ? neutral : data.windSpeed < 15 ? good : data.windSpeed < 30 ? mod : bad;
    case 'Oleaje': return data.waveHeight === null ? neutral : data.waveHeight < 0.5 ? good : data.waveHeight < 1.5 ? mod : bad;
    case 'Visib.': return data.visibility === null ? neutral : data.visibility > 10000 ? good : data.visibility > 2000 ? mod : bad;
    case 'Corriente': return data.oceanCurrentVelocity === null ? neutral : data.oceanCurrentVelocity < 1 ? good : data.oceanCurrentVelocity < 3 ? mod : bad;
    case 'Temp. Mar': return data.seaSurfaceTemperature === null ? neutral : data.seaSurfaceTemperature > 20 ? good : data.seaSurfaceTemperature > 15 ? mod : bad;
    case 'Prob. lluvia': return data.precipitationProbability === null ? neutral : data.precipitationProbability < 20 ? good : data.precipitationProbability < 60 ? mod : bad;
    case 'Swell': return data.swellWaveHeight === null ? neutral : data.swellWaveHeight < 0.5 ? good : data.swellWaveHeight < 1.5 ? mod : bad;
    default: return neutral;
  }
}

// Property descriptions for the info popup
function getPropertyDescriptions(data: WeatherData) {
  const weather = getWeatherInfo(data.weatherCode);
  return [
    { label: 'Clima', value: weather.desc, desc: 'Estado general del cielo según la Organización Meteorológica Mundial (WMO).' },
    { label: 'Temperatura', value: fmt(data.temperature, '°C'), desc: 'Temperatura del aire a 2 metros de altura sobre el nivel del mar.' },
    { label: 'Humedad', value: fmt(data.humidity, '%', 0), desc: 'Humedad relativa del aire. Valores altos pueden reducir la visibilidad submarina.' },
    { label: 'Viento', value: `${fmt(data.windSpeed, 'km/h')} ${windDirectionLabel(data.windDirection)}`, desc: 'Velocidad y dirección del viento a 10 metros. Vientos fuertes generan oleaje y dificultan la entrada al agua.' },
    { label: 'Visibilidad', value: fmt(data.visibility ? data.visibility / 1000 : null, 'km', 1), desc: 'Distancia máxima en kilómetros a la que se puede ver en superficie. Entre 10km y 2km es un rango aceptable para que no afecte a la inmersión' },
    { label: 'Oleaje', value: fmt(data.waveHeight, 'm'), desc: 'Altura significativa de las olas. Por encima de 1.5 m el buceo puede ser complicado.' },
    { label: 'Temp. del mar', value: fmt(data.seaSurfaceTemperature, '°C'), desc: 'Temperatura en superficie. Al descender mas de 15m la temperatura puede caer entre 2°C y 5°C' },
    { label: 'Corriente', value: fmt(data.oceanCurrentVelocity, 'km/h'), desc: 'Velocidad de la corriente oceánica. Corrientes fuertes requieren mayor experiencia y planificación.' },
    { label: 'Swell', value: fmt(data.swellWaveHeight, 'm'), desc: 'Altura del oleaje de fondo (swell). Olas largas generadas por tormentas lejanas que afectan la entrada y salida del agua.' },
    { label: 'Periodo de ola', value: fmt(data.wavePeriod, 's'), desc: 'Tiempo entre dos olas consecutivas. Periodos largos (>10 s) indican mar de fondo; cortos (<6 s) indican mar de viento local.' },
    { label: 'Prob. lluvia', value: fmt(data.precipitationProbability, '%', 0), desc: 'Probabilidad de precipitación. Te ayuda a anticipar cambios en la visibilidad y las condiciones en superficie.' },
    { label: 'Nivel del mar', value: fmt(data.seaLevelHeight, 'm'), desc: 'Altura del nivel del mar incluyendo mareas, sobre el nivel medio global. Útil para planificar entradas y salidas del agua en zonas costeras.' },
    ...(data.precipitation !== null && data.precipitation > 0
      ? [{ label: 'Precipitación', value: fmt(data.precipitation, 'mm'), desc: 'Cantidad de precipitación actual. La lluvia reduce la visibilidad en superficie.' }]
      : []),
  ];
}

type Props = {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  hidden?: boolean;
  forecast?: DailyForecastItem[] | null;
  onInfoOpen?: () => void;
  onInfoClose?: () => void;
};

export default function WeatherPanel({ data, loading, error, hidden = false, forecast, onInfoOpen, onInfoClose }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // 0 = today (real-time data), 1-6 = forecast days
  const [selectedDay, setSelectedDay] = useState(0);

  const isForecastDay = selectedDay > 0 && !!forecast?.[selectedDay];
  const forecastDay = isForecastDay ? forecast![selectedDay] : null;

  const activeCondition: Condition = isForecastDay
    ? forecastDay!.divingCondition
    : (data?.divingCondition ?? 'moderate');
  const activeIcon = isForecastDay
    ? getWeatherInfo(forecastDay!.weatherCode).icon
    : getWeatherInfo(data?.weatherCode ?? null).icon;
  const activeTempLabel = isForecastDay
    ? (forecastDay!.tempMax !== null
        ? `${Math.round(forecastDay!.tempMax!)}° / ${forecastDay!.tempMin !== null ? Math.round(forecastDay!.tempMin!) + '°' : '—'}`
        : '—')
    : fmt(data?.temperature ?? null, '°C');
  const styles = getConditionStyles(activeCondition);

  const dayLabel = (day: DailyForecastItem, i: number) => {
    if (i === 0) return 'Hoy';
    const d = new Date(day.date + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short' });
  };

  return (
    <AnimatePresence>
      {!hidden && loading && (
        <motion.div
          key="weather-loading"
          className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 px-4 py-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <div className="flex items-center gap-2">
            <Spinner size="w-4 h-4" color="border-blue-300 border-t-blue-600" />
            <span className="text-xs text-gray-500">Cargando clima...</span>
          </div>
        </motion.div>
      )}

      {!hidden && error && !loading && (
        <motion.div
          key="weather-error"
          className="absolute top-4 left-4 z-10 bg-red-50/90 backdrop-blur-md rounded-2xl shadow-lg border border-red-200/60 px-4 py-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <p className="text-xs text-red-600">⚠️ {error}</p>
        </motion.div>
      )}

      {!hidden && data && !loading && (
        <motion.div
          key="weather-data"
          className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 p-3"
          style={{ maxWidth: 'calc(100vw - 5rem)' }}
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header: left summary + right actions */}
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{activeIcon}</span>
            <span className="text-lg font-bold text-gray-900 whitespace-nowrap">{activeTempLabel}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}>{isForecastDay ? styles.labelShort : styles.label}</span>
            {isForecastDay && (
              <button
                onClick={() => setSelectedDay(0)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500 text-white shadow-sm shadow-cyan-400/40 hover:bg-cyan-600 transition-all flex-shrink-0"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M5 1L2 4L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Hoy
              </button>
            )}

            <div className="ml-auto flex items-center gap-[2.2px] sm:gap-2">
              <button
                onClick={() => setMinimized(!minimized)}
                className="w-5 h-5 rounded-full bg-gray-200/80 hover:bg-cyan-100 text-gray-500 hover:text-cyan-600 flex items-center justify-center transition-colors flex-shrink-0"
                title={minimized ? 'Expandir' : 'Minimizar'}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  {minimized
                    ? <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    : <path d="M2 7L5 4L8 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  }
                </svg>
              </button>
              {!minimized && (
                <button
                  onClick={() => { setShowInfo(true); onInfoOpen?.(); }}
                  className="w-5 h-5 rounded-full bg-gray-200/80 hover:bg-cyan-100 text-gray-500 hover:text-cyan-600 text-[11px] font-bold flex items-center justify-center transition-colors flex-shrink-0"
                  title="Más información"
                >
                  ?
                </button>
              )}
            </div>
          </div>

          {/* Collapsible body */}
          <AnimatePresence initial={false}>
            {!minimized && (
              <motion.div
                key="weather-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {/* Day selector tabs — compact pill strip */}
                {forecast && forecast.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto mt-2 pb-0.5 select-none" style={{ scrollbarWidth: 'none' }}>
                    {forecast.map((day, i) => {
                      const isSelected = selectedDay === i;
                      const cond = getConditionStyles(day.divingCondition);
                      return (
                        <button
                          key={day.date}
                          onClick={() => setSelectedDay(i)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-400/40'
                              : i === 0
                              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-white/70' : cond.dot}`} />
                          {dayLabel(day, i)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Stats body — animated swap between today and forecast day */}
                <AnimatePresence mode="wait" initial={false}>
                  {!isForecastDay ? (
                    <motion.div
                      key="today-stats"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-2 text-[13px] mt-2">
                        <Stat label="Humedad"      value={fmt(data.humidity, '%', 0)} color={statColor('Humedad', data)} />
                        <Stat label="Viento"       value={`${fmt(data.windSpeed, '')} ${windDirectionLabel(data.windDirection)}`} color={statColor('Viento', data)} />
                        <Stat label="Visib."       value={fmt(data.visibility ? data.visibility / 1000 : null, 'km', 1)} color={statColor('Visib.', data)} />
                        <Stat label="Oleaje"       value={fmt(data.waveHeight, 'm')} color={statColor('Oleaje', data)} />
                        <Stat label="Temp. Mar"    value={fmt(data.seaSurfaceTemperature, '°C')} color={statColor('Temp. Mar', data)} />
                        <Stat label="Corriente"    value={fmt(data.oceanCurrentVelocity, 'km/h')} color={statColor('Corriente', data)} />
                        <Stat label="Swell"        value={fmt(data.swellWaveHeight, 'm')} color={statColor('Swell', data)} />
                        <Stat label="Periodo"      value={fmt(data.wavePeriod, 's')} />
                        <Stat label="Prob. lluvia" value={fmt(data.precipitationProbability, '%', 0)} color={statColor('Prob. lluvia', data)} />
                        <Stat label="Nivel mar"    value={fmt(data.seaLevelHeight, 'm')} />
                      </div>
                      {((data.precipitation != null && data.precipitation > 0) || (data.weatherCode != null && [95, 96, 99].includes(data.weatherCode))) && (
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          {data.precipitation != null && data.precipitation > 0 && (
                            <span className="text-[11px] text-gray-600">Precipitación: {fmt(data.precipitation, 'mm')}</span>
                          )}
                          {data.weatherCode != null && [95, 96, 99].includes(data.weatherCode) && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 whitespace-nowrap">{getWeatherInfo(data.weatherCode).desc}</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`forecast-${selectedDay}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[13px] mt-2">
                        <Stat label="Temp. máx"    value={forecastDay!.tempMax != null ? `${Math.round(forecastDay!.tempMax!)} °C` : '—'} />
                        <Stat label="Temp. mín"    value={forecastDay!.tempMin != null ? `${Math.round(forecastDay!.tempMin!)} °C` : '—'} />
                        <Stat label="Prob. lluvia" value={forecastDay!.precipProbMax != null ? `${Math.round(forecastDay!.precipProbMax!)} %` : '—'} color={forecastStatColor('Prob. lluvia', forecastDay!.precipProbMax)} />
                        <Stat label="Viento máx"   value={forecastDay!.windSpeedMax != null ? `${Math.round(forecastDay!.windSpeedMax!)} km/h` : '—'} color={forecastStatColor('Viento', forecastDay!.windSpeedMax)} />
                        <Stat label="Oleaje máx"   value={forecastDay!.waveHeightMax != null ? `${forecastDay!.waveHeightMax!.toFixed(1)} m` : '—'} color={forecastStatColor('Oleaje', forecastDay!.waveHeightMax)} />
                        <Stat label="Swell máx"    value={forecastDay!.swellHeightMax != null ? `${forecastDay!.swellHeightMax!.toFixed(1)} m` : '—'} color={forecastStatColor('Oleaje', forecastDay!.swellHeightMax)} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 italic">Previsión a 7 días</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Info modal */}
      {showInfo && data && (
        <motion.div
          key="weather-info"
          className="absolute inset-0 z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowInfo(false); onInfoClose?.(); }} />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 border-b border-gray-100 flex items-start gap-3">
              <div className="text-2xl leading-none mt-0.5">ℹ️</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">Datos climáticos para buceo</h3>
                <p className="text-xs text-gray-500 mt-1">Scubex te proporciona datos útiles para planificar tus inmersiones. Para el punto seleccionado:</p>
              </div>
              <button onClick={() => { setShowInfo(false); onInfoClose?.(); }} className="text-gray-400 hover:text-cyan-600 text-lg leading-none font-bold transition-colors">×</button>
            </div>

            <div className="overflow-auto p-4 space-y-3 custom-scrollbar">
              {getPropertyDescriptions(data).map((prop, i) => (
                <motion.div key={prop.label} className="flex gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-800">{prop.label}</span>
                      <span className="text-sm font-bold text-cyan-600">{prop.value}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{prop.desc}</p>
                  </div>
                </motion.div>
              ))}

              {/* Guía de colores */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 mb-2 text-center">Guía de colores</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-4 gap-x-3 items-center text-gray-500 font-semibold mb-1">
                    <span /><span className="text-emerald-600 text-center">Bueno</span><span className="text-amber-600 text-center">Aceptable</span><span className="text-red-600 text-center">Adverso</span>
                  </div>
                  {[
                    ['Viento',       '< 15 km/h', '15–30 km/h', '> 30 km/h'],
                    ['Oleaje',       '< 0.5 m',   '0.5–1.5 m',  '> 1.5 m'],
                    ['Visibilidad',  '> 10 km',   '2–10 km',    '< 2 km'],
                    ['Corriente',    '< 1 km/h',  '1–3 km/h',   '> 3 km/h'],
                    ['Temp. Mar',    '> 20 °C',   '15–20 °C',   '< 15 °C'],
                    ['Swell',        '< 0.5 m',   '0.5–1.5 m',  '> 1.5 m'],
                    ['Prob. lluvia', '< 20%',     '20–60%',     '> 60%'],
                  ].map(([label, g, m, b]) => (
                    <div key={label} className="grid grid-cols-4 gap-x-3 items-center">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className="text-emerald-600 text-center">{g}</span>
                      <span className="text-amber-600 text-center">{m}</span>
                      <span className="text-red-600 text-center">{b}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 leading-relaxed text-center">
                  La condición general se calcula con una media ponderada. Oleaje, corriente y visibilidad tienen mayor peso. Valores extremos (oleaje &gt; 2.5 m, viento &gt; 40 km/h, corriente &gt; 5 km/h o tormentas) marcan la condición como adversa automáticamente.
                </p>
              </div>

              {/* Aviso legal */}
              <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed text-center">
                Los datos provienen de Open-Meteo y son meramente informativos. Scubex no se hace responsable de discrepancias con las condiciones reales. Consulta fuentes oficiales antes de bucear.
              </p>
            </div>

            <div className="p-3 border-t border-gray-100 text-center">
              <button onClick={() => { setShowInfo(false); onInfoClose?.(); }} className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold">
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, color = 'text-gray-800' }: { label: string; value: string; color?: string }) {
  return (
    <div className="py-0.5">
      <p className="text-gray-400 leading-none mb-1">{label}</p>
      <p className={`font-medium leading-tight whitespace-nowrap ${color}`}>{value}</p>
    </div>
  );
}
