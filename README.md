# 🌊 Scubex

**Scubex** es una aplicación web full-stack para exploradores marinos que permite descubrir especies de vida marina reales por ubicación geográfica. Combina un backend robusto en Spring Boot con APIs científicas y un frontend moderno para una experiencia inmersiva de exploración marina.

## 🚀 Características

- **🗺️ Mapa Interactivo**: Explora especies marinas con MapLibre GL JS y animaciones de escaneo
- **🐠 Datos Científicos Reales**: Integración con OBIS e iNaturalist para especies auténticas
- **📡 Escaneo de Fauna Marina**: Animación de radar que busca especies en tiempo real
- **📱 Diseño Responsivo**: Optimizado para móviles y desktop con Tailwind CSS
- **⚡ Backend Moderno**: Spring Boot con procesamiento JSON automático
- **🎨 Animaciones Fluidas**: Framer Motion para transiciones y efectos visuales

## 🛠️ Stack Tecnológico

### 🖥️ Backend (Spring Boot)
- **Framework**: Spring Boot 4.0.0-M3 con Java 21
- **Procesamiento JSON**: Jackson ObjectMapper con deserialización automática
- **Cliente HTTP**: RestTemplate para APIs externas
- **Seguridad**: Spring Security con configuración CORS
- **APIs Integradas**:
  - **OBIS API**: Datos de ocurrencias reales de especies marinas
  - **iNaturalist API**: Fotos y nombres comunes de especies

### 🎨 Frontend (React)
- **Framework**: React 18 + TypeScript + Vite
- **Mapas**: MapLibre GL JS con animaciones personalizadas
- **Estado**: Zustand para gestión de estado global
- **Data Fetching**: TanStack Query con cache inteligente
- **Animaciones**: Framer Motion para efectos de escaneo
- **Estilos**: Tailwind CSS + PostCSS
- **Build**: Vite con HMR

## APIs de Datos Marinos

### OBIS (Ocean Biodiversity Information System)
- **Propósito**: Obtener ocurrencias reales de especies marinas por coordenadas
- **Endpoint**: `https://api.obis.org/v3/occurrence`
- **Datos**: Ubicaciones GPS, nombres científicos, fechas de avistamiento
- **Procesamiento**: Jackson ObjectMapper con deserialización automática

### iNaturalist
- **Propósito**: Enriquecer datos con fotos y nombres comunes de especies
- **Endpoint**: `https://api.inaturalist.org/v1/taxa`
- **Datos**: Imágenes de especies, nombres vernáculos, información taxonómica
- **Integración**: Mapeo automático con anotaciones `@JsonProperty`

## 🏗️ Estructura del Proyecto

```
├── scubex-backend/                    # 🖥️ Backend Spring Boot
│   ├── src/main/java/com/scubex/
│   │   ├── controller/
│   │   │   └── SpeciesController.java # Endpoints REST de especies
│   │   ├── service/
│   │   │   └── SpeciesService.java    # Lógica de APIs marinas
│   │   ├── model/
│   │   │   ├── Species.java           # Modelo de especies
│   │   │   └── INaturalistResponse.java # DTO de iNaturalist
│   │   └── config/
│   │       └── SecurityConfig.java    # Configuración CORS
│   └── pom.xml                        # Dependencias Maven
├── src/                               # 🎨 Frontend React
│   ├── App.tsx                        # Router principal con animaciones
│   ├── main.tsx                       # Punto de entrada
│   ├── pages/
│   │   ├── Home.tsx                   # Página de inicio con radar
│   │   └── Map.tsx                    # Mapa interactivo con escaneo
│   ├── components/
│   │   ├── MapView.tsx               # Mapa con animación de beam
│   │   ├── SpeciesPanel.tsx          # Panel de especies encontradas
│   │   └── WaveTransition.tsx        # Transiciones fluidas
│   ├── lib/
│   │   ├── api.ts                    # Cliente API para backend
│   │   ├── store.ts                  # Estado Zustand
│   │   └── transition.ts             # Configuración de animaciones
│   └── index.css                     # Estilos Tailwind
└── package.json                      # Dependencias Node.js
```

## 🚀 Inicio Rápido

### Prerrequisitos
- **Java 21+** (para el backend Spring Boot)
- **Maven 3.8+** (gestión de dependencias Java) 
- **Node.js 20.19+ o 22.12+** (para el frontend React)
- npm o yarn

### Instalación Full-Stack

1. **Clona el repositorio**
   ```bash
   git clone [repo-url]
   cd scubex
   ```

2. **🖥️ Configurar y ejecutar Backend (Spring Boot)**
   ```bash
   cd scubex-backend
   ./mvnw clean install        # Windows: mvnw.cmd clean install
   ./mvnw spring-boot:run      # Ejecuta en http://localhost:8080
   ```
   
   El backend estará disponible en `http://localhost:8080` con endpoints:
   - `/api/species/scan?lat={lat}&lng={lng}` - Buscar especies por coordenadas

3. **🎨 Configurar Frontend (React)**
   
   En una nueva terminal:
   ```bash
   cd ..                       # Volver al directorio raíz
   npm install                 # Instalar dependencias React
   ```

4. **Configura variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` con tus configuraciones:
   ```env
   VITE_MAPTILER_KEY=tu_api_key_aqui
   VITE_API_BASE_URL=http://localhost:8080
   ```

5. **Ejecuta el frontend**
   ```bash
   npm run dev                 # Ejecuta en http://localhost:5173
   ```

6. **🌊 ¡Explora especies marinas reales!**
   - Visita `http://localhost:5173`
   - Usa el mapa interactivo para navegar
   - Haz clic en "Scan" para buscar especies científicas reales
   - Disfruta de las animaciones de escaneo beam

## 📦 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con HMR
- `npm run build` - Construcción para producción
- `npm run preview` - Vista previa del build de producción
- `npm run lint` - Linting con ESLint

## 🗺️ Configuración del Mapa

Para usar el mapa necesitas una API key gratuita de [MapTiler](https://www.maptiler.com/):

1. Registrate en MapTiler
2. Crea un nuevo proyecto
3. Copia tu API key
4. Añádela al archivo `.env` como `VITE_MAPTILER_KEY`

## 🌐 Backend Spring Boot

La aplicación utiliza un backend robusto en **Spring Boot 4.0.0-M3** que se conecta a APIs científicas reales para obtener datos de especies marinas.

### Endpoints Disponibles
- `GET /api/species/scan?lat={lat}&lng={lng}` - Escanear especies por coordenadas GPS
- `GET /api/species/health` - Estado del servicio

### Integración con APIs Científicas
El backend integra automáticamente datos de:
- **OBIS**: Ocurrencias reales de especies marinas con ubicaciones GPS
- **iNaturalist**: Fotos de alta calidad y nombres comunes de especies

### Características Técnicas
- **Procesamiento JSON**: Jackson ObjectMapper con deserialización automática
- **HTTP Client**: RestTemplate para llamadas eficientes a APIs externas  
- **CORS**: Configuración completa para desarrollo frontend-backend
- **Filtrado Inteligente**: Eliminación automática de datos nulos o incompletos
- **Ordenamiento**: Especies ordenadas por número de ocurrencias (más comunes primero)

## 🏗️ Arquitectura Técnica

### Backend (Spring Boot)
```java
@RestController
@RequestMapping("/api/species")
public class SpeciesController {
    
    @GetMapping("/scan")
    public ResponseEntity<List<Species>> scanSpecies(
        @RequestParam double lat, 
        @RequestParam double lng) {
        // Lógica de escaneo con APIs reales
    }
}
```

### Procesamiento JSON Automático
```java
@JsonProperty("total_results")
private Integer totalResults;

// Jackson ObjectMapper deserializa automáticamente
ResponseEntity<INaturalistResponse> response = 
    restTemplate.getForEntity(url, INaturalistResponse.class);
```

### Frontend Reactivo
```typescript
// Zustand Store para estado global
interface AppStore {
  species: Species[];
  isScanning: boolean;
  scanSpecies: (lat: number, lng: number) => Promise<void>;
}

// TanStack Query para cache inteligente
const { data: species, isLoading } = useQuery({
  queryKey: ['species', lat, lng],
  queryFn: () => scanSpecies(lat, lng)
});
```

## 🚀 Despliegue

### Frontend
```bash
npm run build  # Genera dist/ para despliegue estático
```

### Backend
```bash
cd scubex-backend
./mvnw package  # Genera JAR ejecutable
java -jar target/scubex-backend-1.0.jar
```

### Opciones recomendadas:
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Railway, Render, AWS Elastic Beanstalk

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Agradecimientos

### Backend & APIs
- **Spring Boot** - Framework robusto de Java para APIs RESTful
- **OBIS** - Ocean Biodiversity Information System por datos científicos reales
- **iNaturalist** - Plataforma de biodiversidad por fotos y nombres comunes
- **Jackson** - Procesamiento JSON automático y eficiente

### Frontend & UI
- **Vite** - Herramienta de build ultra-rápida para desarrollo moderno
- **React** - Librería de UI declarativa y componentes
- **MapLibre GL JS** - Mapas interactivos open source
- **Framer Motion** - Animaciones fluidas y transiciones elegantes
- **Tailwind CSS** - Framework de CSS utility-first
- **Zustand** - Gestión de estado ligera y reactiva
- **TanStack Query** - Data fetching inteligente con cache
