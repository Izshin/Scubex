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
  depthMin?: number;
  depthMax?: number;
  tempMin?: number;
  tempMax?: number;
  firstYear?: number;
  lastYear?: number;
  globalRecords?: number;
  iucnCategory?: string;
  description?: string;
  wikipediaUrl?: string;
  invasive?: boolean;
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
  depthMin?: number;
  depthMax?: number;
  tempMin?: number;
  tempMax?: number;
  firstYear?: number;
  lastYear?: number;
  globalRecords?: number;
  iucnCategory?: string;
  description?: string;
  wikipediaUrl?: string;
  invasive?: boolean;
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

export async function deleteAccount(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) {
    throw new Error(`Delete account failed: ${response.status}`);
  }
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
  try {
    const params = new URLSearchParams({
      lat: scanData.lat.toString(),
      lng: scanData.lng.toString(),
      radius: scanData.radius.toString()
    });
    
    const apiUrl = `${API_BASE_URL}/api/species?${params.toString()}`;
    
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

    const transformedSpecies: FrontendSpeciesData[] = backendData
      .map((species, index) => ({
        taxon_id: index.toString(), // Use index as ID since backend doesn't provide one
        common_name: species.commonName,
        scientific_name: species.scientificName,
        records: species.numberOfOccurrences,
        last_record: species.recordDate ? formatDate(species.recordDate) : 'Fecha desconocida',
        photoUrl: species.photoUrl,
        phylum: species.phylum,
        depthMin: species.depthMin,
        depthMax: species.depthMax,
        tempMin: species.tempMin,
        tempMax: species.tempMax,
        firstYear: species.firstYear,
        lastYear: species.lastYear,
        globalRecords: species.globalRecords,
        iucnCategory: species.iucnCategory,
        description: species.description,
        wikipediaUrl: species.wikipediaUrl,
        invasive: species.invasive,
      }))
      .sort((a, b) => b.records - a.records);

    const totalOccurrences = transformedSpecies.reduce((sum, species) => sum + species.records, 0);

    return {
      species: transformedSpecies,
      counts: {
        total_taxa: transformedSpecies.length,
        total_occurrences: totalOccurrences
      },
      source: ["OBIS", "iNaturalist"]
    };
    
  } catch (error) {
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
    
  } catch {
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
  likeCount: number;
  commentCount: number;
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

// Interaction types
export interface CommentData {
  id: number;
  text: string;
  createdAt: string;
  author: {
    name: string;
    picture: string;
    email: string;
  };
}

export interface LikeStatus {
  liked: boolean;
  count: number;
}

export interface SaveStatus {
  saved: boolean;
}

// Like/Unlike
export async function toggleLike(pubId: number): Promise<LikeStatus> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Toggle like failed: ${response.status}`);
  return response.json();
}

export async function getLikeStatus(pubId: number): Promise<LikeStatus> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/like`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Get like status failed: ${response.status}`);
  return response.json();
}

// Save/Unsave
export async function toggleSave(pubId: number): Promise<SaveStatus> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Toggle save failed: ${response.status}`);
  return response.json();
}

export async function getSaveStatus(pubId: number): Promise<SaveStatus> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/save`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Get save status failed: ${response.status}`);
  return response.json();
}

// Comments
export async function getComments(pubId: number): Promise<CommentData[]> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/comments`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Get comments failed: ${response.status}`);
  return response.json();
}

export async function addComment(pubId: number, text: string): Promise<CommentData> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`Add comment failed: ${response.status}`);
  return response.json();
}

export async function deleteComment(pubId: number, commentId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/publications/${pubId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Delete comment failed: ${response.status}`);
}

// ── User / Social types ──

export interface UserSummary {
  name: string;
  email: string;
  picture: string;
}

export interface PublicProfileData {
  name: string;
  email: string;
  picture: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  publicationCount: number;
  publications: PublicationData[];
}

export interface FollowStatus {
  following: boolean;
  followerCount: number;
}

// Public profile
export async function getPublicProfile(email: string): Promise<PublicProfileData> {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Get profile failed: ${response.status}`);
  return response.json();
}

// Follow / Unfollow
export async function toggleFollow(email: string): Promise<FollowStatus> {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Toggle follow failed: ${response.status}`);
  return response.json();
}

// Followers / Following lists
export async function getFollowers(email: string): Promise<UserSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}/followers`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Get followers failed: ${response.status}`);
  return response.json();
}

export async function getFollowingList(email: string): Promise<UserSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}/following`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Get following failed: ${response.status}`);
  return response.json();
}

// Saved publications (own profile)
export async function getSavedPublications(): Promise<PublicationData[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/me/saved`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Get saved failed: ${response.status}`);
  return response.json();
}

// Daily forecast item (evaluated server-side by backend)
export interface DailyForecastItem {
  date: string;
  weatherCode: number | null;
  tempMax: number | null;
  tempMin: number | null;
  precipProbMax: number | null;
  windSpeedMax: number | null;
  waveHeightMax: number | null;
  swellHeightMax: number | null;
  divingCondition: 'good' | 'moderate' | 'bad';
}

export async function getDailyForecast(lat: number, lng: number): Promise<DailyForecastItem[]> {
  const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() });
  const response = await fetch(`${API_BASE_URL}/api/weather/forecast?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Forecast API error: ${response.status}`);
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

// ── Notifications ──

export interface NotificationData {
  id: number;
  type: 'FOLLOW' | 'LIKE' | 'COMMENT' | 'MENTION';
  read: boolean;
  createdAt: string;
  actorName: string;
  actorPicture: string;
  actorEmail: string;
  publicationId: number | null;
  publicationTitle: string;
  commentSnippet: string;
}

export async function getNotifications(): Promise<NotificationData[]> {
  const res = await fetch(`${API_BASE_URL}/api/notifications`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
}

export async function deleteNotification(id: number): Promise<void> {
  await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
}

// ── User search (mention autocomplete) ──

export async function searchUsers(q: string): Promise<UserSummary[]> {
  if (q.length < 2) return [];
  const res = await fetch(
    `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(q)}`,
    { headers: { ...getAuthHeaders() } },
  );
  if (!res.ok) return [];
  return res.json();
}