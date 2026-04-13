// Backend API types
interface BackendSpeciesResponse {
  scientificName: string;
  commonName?: string;
  numberOfOccurrences: number;
  latitude: number;
  longitude: number;
  recordDate?: string;
  photoUrl?: string;
  phylum?: string;
}

// Frontend display types  
interface FrontendSpeciesData {
  taxon_id: string;
  common_name?: string;
  scientific_name: string;
  records: number;
  last_record: string;
  photoUrl?: string;
  phylum?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem('scubex_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user?.token) {
        return { Authorization: `Bearer ${user.token}` };
      }
    } catch { /* ignored */ }
  }
  return {};
}

export async function loginWithGoogle(credential: string): Promise<{ token: string; user: { name: string; email: string; picture: string } }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }
  return response.json();
}

export async function updateProfile(customName: string, customPictureUrl: string): Promise<{ token: string; user: { name: string; email: string; picture: string } }> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ customName, customPictureUrl }),
  });
  if (!response.ok) {
    throw new Error(`Profile update failed: ${response.status}`);
  }
  return response.json();
}

// Test function to check if backend is running
export async function testBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/species?lat=36.52&lng=-5.98&radius=1000`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getZoneSpecies(scanData: { lat: number; lng: number; radius: number }) {
  console.log('🌊 Calling real backend API:', scanData);
  
  // Test backend connection first
  const isBackendRunning = await testBackendConnection();
  if (!isBackendRunning) {
    console.warn(`⚠️ Backend is not running or not accessible at ${API_BASE_URL}`);
  }
  
  try {
    // Build the API URL with query parameters
    const params = new URLSearchParams({
      lat: scanData.lat.toString(),
      lng: scanData.lng.toString(),
      radius: scanData.radius.toString()
    });
    
    const apiUrl = `${API_BASE_URL}/api/species?${params.toString()}`;
    console.log('📡 API Call:', apiUrl);
    
    // Make the API call to your Spring Boot backend
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const backendData: BackendSpeciesResponse[] = await response.json();
    console.log('✅ Backend response:', backendData);
    
    // Transform backend data to frontend format and sort by number of records (most first)
    const transformedSpecies: FrontendSpeciesData[] = backendData
      .map((species, index) => ({
        taxon_id: index.toString(), // Use index as ID since backend doesn't provide one
        common_name: species.commonName,
        scientific_name: species.scientificName,
        records: species.numberOfOccurrences,
        last_record: species.recordDate ? formatDate(species.recordDate) : 'Fecha desconocida',
        photoUrl: species.photoUrl,
        phylum: species.phylum
      }))
      .sort((a, b) => b.records - a.records); // Sort by records in descending order (most records first)
    
    console.log('📊 Species sorted by records (highest first):', transformedSpecies.map(s => `${s.scientific_name}: ${s.records} records`));
    
    // Calculate total occurrences across all species
    const totalOccurrences = transformedSpecies.reduce((sum, species) => sum + species.records, 0);
    console.log('🔢 Total occurrences found:', totalOccurrences);
    
    // Return in the format expected by the frontend
    const frontendData = {
      species: transformedSpecies,
      counts: {
        total_taxa: transformedSpecies.length,
        total_occurrences: totalOccurrences
      },
      source: ["OBIS", "iNaturalist"] // Your backend uses these APIs
    };
    
    console.log('🐠 Transformed data:', frontendData);
    return frontendData;
    
  } catch (error) {
    console.error('❌ Error calling backend API:', error);
    
    // Provide helpful error information
    console.log('🔄 Providing error information instead of mock data...');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('Failed to fetch') || errorMessage.includes('Network');
    
    return {
      species: [
        {
          taxon_id: "error_1",
          common_name: isConnectionError ? "Error de conexión" : "Error del servidor",
          scientific_name: isConnectionError ? 
            `Verifique que el backend esté ejecutándose en ${API_BASE_URL}` : 
            `Error: ${errorMessage}`,
          records: 0,
          last_record: "N/A"
        }
      ],
      counts: {
        total_taxa: 0
      },
      source: ["Error"]
    };
  }
}

// Helper function to format dates
function formatDate(dateString: string): string {
  try {
    if (!dateString) return 'Fecha desconocida';
    
    // Handle different date formats from backend
    let date: Date;
    
    if (dateString.includes('T')) {
      // ISO format: "2023-08-15T10:30:00Z"
      date = new Date(dateString);
    } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date format: "2023-08-15"
      date = new Date(dateString);
    } else if (dateString.match(/^\d{4}$/)) {
      // Year only: "2023"
      date = new Date(parseInt(dateString), 0, 1);
    } else {
      return dateString; // Return as-is if can't parse
    }
    
    // Format as "YYYY-MM-DD"
    return date.toISOString().split('T')[0];
    
  } catch (error) {
    console.warn('⚠️ Error formatting date:', dateString, error);
    return 'Fecha inválida';
  }
}

// Publication types
export interface PublicationData {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  author: {
    email: string;
    name: string;
    picture: string;
  };
}

export async function createPublication(data: {
  title: string;
  description?: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
}): Promise<PublicationData> {
  const response = await fetch(`${API_BASE_URL}/api/publications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Create publication failed: ${response.status}`);
  return response.json();
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (!response.ok) throw new Error(`Image upload failed: ${response.status}`);
  const data = await response.json();
  return `${API_BASE_URL}${data.imageUrl}`;
}

export async function getPublications(): Promise<PublicationData[]> {
  const response = await fetch(`${API_BASE_URL}/api/publications`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Fetch publications failed: ${response.status}`);
  return response.json();
}

export async function getPublicationsInArea(latMin: number, latMax: number, lngMin: number, lngMax: number): Promise<PublicationData[]> {
  const params = new URLSearchParams({
    latMin: latMin.toString(),
    latMax: latMax.toString(),
    lngMin: lngMin.toString(),
    lngMax: lngMax.toString(),
  });
  const response = await fetch(`${API_BASE_URL}/api/publications/area?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Fetch area publications failed: ${response.status}`);
  return response.json();
}

export async function deletePublication(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Delete publication failed: ${response.status}`);
}

export async function updatePublication(id: number, data: { title: string; description?: string; imageUrl?: string }): Promise<PublicationData> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Update publication failed: ${response.status}`);
  return response.json();
}

// Weather types
export interface WeatherData {
  // Atmospheric
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  snowfall: number | null;
  visibility: number | null;
  weatherCode: number | null;
  // Marine
  waveHeight: number | null;
  waveDirection: number | null;
  wavePeriod: number | null;
  seaSurfaceTemperature: number | null;
  oceanCurrentVelocity: number | null;
  oceanCurrentDirection: number | null;
  swellWaveHeight: number | null;
  seaLevelHeight: number | null;
  // Diving condition (computed by backend)
  divingCondition: 'good' | 'moderate' | 'bad' | null;
}

export async function getWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
  });

  const apiUrl = `${API_BASE_URL}/api/weather?${params.toString()}`;
  console.log('🌤️ Weather API Call:', apiUrl);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data: WeatherData = await response.json();
  console.log('✅ Weather response:', data);
  return data;
}