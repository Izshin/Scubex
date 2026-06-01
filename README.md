# Scubex

Scubex es una aplicación web para buceadores que combina un mapa interactivo con herramientas de planificación de inmersiones. Desde el mapa puedes explorar la fauna marina de cualquier zona consultando datos científicos reales, ver las condiciones meteorológicas y marinas actuales para decidir si el día es apto para bucear, y leer o publicar experiencias de otras personas en ese mismo punto.

La aplicación tiene un frontend en React con TypeScript, desplegado en Vercel, y un backend en Spring Boot con Java 21, desplegado en Railway con una base de datos PostgreSQL.

## Qué puedes hacer en Scubex

**Escáner de biodiversidad marina.** Haz clic en cualquier punto del mapa y elige un radio de búsqueda. Scubex consulta la base de datos científica OBIS, que tiene más de 150 millones de registros de ocurrencias marinas validados, y enriquece cada especie con la foto y el nombre común de iNaturalist. El resultado es una lista de los animales que han sido avistados científicamente en esa zona, con datos de profundidad, temperatura, estado IUCN y registros históricos. Los resultados se cachean en base de datos para que consultas repetidas de la misma zona sean instantáneas.

**Panel de condiciones climáticas.** Antes de meterte al agua, el panel de clima muestra en tiempo real la temperatura, el viento, la visibilidad, la altura del oleaje, la corriente oceánica y la temperatura del mar para el punto marcado. Un algoritmo de puntuación ponderada evalúa automáticamente si las condiciones son buenas, tolerables o adversas para bucear, teniendo en cuenta que el oleaje y la corriente pesan más que si va a llover.

**Publicaciones geolocalizadas.** Los usuarios autenticados pueden crear publicaciones ancladas a un punto del mapa, con título, descripción y foto. Cualquier visitante puede ver las publicaciones de la zona que está explorando directamente desde los marcadores del mapa. Las publicaciones incluyen likes, comentarios y la posibilidad de guardarlas para después.

**Autenticación con Google.** El inicio de sesión es en un solo clic con la cuenta de Google. El backend verifica la identidad con Google y emite un token propio que autentica las peticiones posteriores sin volver a consultar a Google.

**Perfiles de usuario.** Cada usuario tiene un perfil con sus publicaciones, sus guardados y la posibilidad de seguir a otros usuarios. Hay notificaciones cuando alguien te sigue, comenta o da like a tus publicaciones.

## Cómo ejecutarlo localmente

Necesitas Java 21 o superior, Maven y Node.js 20 o superior.

Primero arranca el backend:

```bash
cd scubex-backend
./mvnw spring-boot:run
```

En Windows usa `mvnw.cmd spring-boot:run`. El backend estará disponible en `http://localhost:8080`.

Luego arranca el frontend en otra terminal:

```bash
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

Para que el mapa funcione necesitas una clave gratuita de MapTiler. Regístrate en [maptiler.com](https://www.maptiler.com), crea un proyecto y copia la clave. Luego crea un archivo `.env` en la raíz del proyecto con:

```
VITE_MAPTILER_KEY=tu_clave_aqui
VITE_API_BASE_URL=http://localhost:8080
```

La autenticación con Google requiere configurar un cliente OAuth2 en Google Cloud Console. Para desarrollo local puedes omitir esta parte: el escáner de biodiversidad y el panel de clima funcionan sin autenticación.

## Stack tecnológico

El frontend usa React 18 con TypeScript, Vite como bundler, MapLibre GL JS para el mapa, MobX para el estado global, TanStack Query para la gestión de peticiones y caché, Framer Motion para las animaciones y Tailwind CSS para los estilos.

El backend usa Spring Boot con Java 21, Spring Security para la autenticación JWT, Spring Data JPA con Hibernate para la persistencia en PostgreSQL y RestTemplate para las llamadas a las APIs externas. Las pruebas unitarias usan JUnit 5 con Mockito.

## APIs externas

Scubex utiliza cuatro servicios externos, todos gratuitos y sin cuota de uso significativa para el volumen de la aplicación:

- **OBIS** (`api.obis.org`): registros científicos de biodiversidad marina. Sin clave de API.
- **iNaturalist** (`api.inaturalist.org`): fotografías y nombres comunes de especies. Sin clave de API, con límite de 100 peticiones por minuto.
- **Open-Meteo** (`api.open-meteo.com` y `marine-api.open-meteo.com`): datos atmosféricos y marinos en tiempo real. Sin clave de API.
- **Nominatim** (`nominatim.openstreetmap.org`): geocoding directo e inverso para el buscador de lugares y los nombres de ubicación en las publicaciones. Sin clave de API.

## Despliegue

El frontend está desplegado en Vercel directamente desde el repositorio. El backend y la base de datos PostgreSQL están en Railway. Las variables de entorno sensibles (clave JWT, Client ID de Google, URL de la base de datos) se configuran en los paneles de cada servicio y no se incluyen en el repositorio.

## Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo con recarga en caliente
npm run build     # Compilación para producción
npm run preview   # Vista previa del build de producción
npm run lint      # Análisis estático con ESLint
```

```bash
cd scubex-backend
./mvnw test                    # Ejecutar pruebas unitarias
./mvnw test jacoco:report      # Ejecutar pruebas y generar informe de cobertura
./mvnw package                 # Compilar y empaquetar como JAR
```
