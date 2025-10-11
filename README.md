# 🌊 DiveBook

**DiveBook** es una aplicación web para exploradores marinos que permite descubrir especies de vida marina por ubicación geográfica. Ideal para buceadores, snorkelers y amantes del mar.

## 🚀 Características

- **🗺️ Mapa Interactivo**: Explora especies marinas por zona geográfica usando MapLibre GL JS
- **🐠 Base de Datos de Especies**: Información detallada de especies marinas
- **📱 Diseño Responsivo**: Optimizado para móviles y desktop con Tailwind CSS
- **⚡ Rendimiento**: Construcción rápida con Vite y React

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Navegación**: React Router DOM
- **Estado**: Zustand (ligero)
- **Data Fetching**: TanStack Query
- **Estilos**: Tailwind CSS + PostCSS
- **Mapas**: MapLibre GL JS
- **Build**: Vite con HMR

## 🏗️ Estructura del Proyecto

```
src/
 ├─ App.tsx            # Router principal
 ├─ main.tsx           # Punto de entrada
 ├─ pages/
 │   ├─ Home.tsx       # Página de inicio
 │   └─ Map.tsx        # Página del mapa
 ├─ components/
 │   ├─ MapView.tsx    # Componente del mapa interactivo
 │   └─ SpeciesPanel.tsx # Panel de especies
 ├─ lib/
 │   ├─ api.ts         # Llamadas a la API
 │   └─ store.ts       # Estado global con Zustand
 └─ index.css          # Estilos con Tailwind
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 20.19+ o 22.12+
- npm o yarn

### Instalación

1. **Clona el repositorio**
   ```bash
   git clone [repo-url]
   cd divebook
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` y añade tu API key de MapTiler:
   ```env
   VITE_MAPTILER_KEY=tu_api_key_aqui
   ```

4. **Ejecuta el servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abre tu navegador**
   ```
   http://localhost:5173
   ```

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

## 🌐 API Backend

La aplicación está configurada para conectarse a una API REST en `http://localhost:8000`. 

Los endpoints esperados son:
- `GET /api/zones/species?bbox=w,s,e,n` - Especies por zona
- `GET /api/posts?bbox=w,s,e,n` - Posts por zona

## 🚀 Despliegue

### Construcción para producción
```bash
npm run build
```

Los archivos se generan en `dist/` y están listos para desplegarse en cualquier servidor web estático.

### Opciones recomendadas:
- **Vercel** - `vercel --prod`
- **Netlify** - Arrastra la carpeta `dist/`
- **GitHub Pages** - Usando GitHub Actions

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Vite** - Herramienta de build ultra-rápida
- **React** - Librería de UI
- **MapLibre GL JS** - Mapas interactivos open source
- **Tailwind CSS** - Framework de CSS utility-first
