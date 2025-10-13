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

// Test function to check if backend is running
export async function testBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/api/species?lat=36.52&lng=-5.98&radius=1000', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
    console.warn('⚠️ Backend is not running or not accessible at http://localhost:8080');
  }
  
  try {
    // Build the API URL with query parameters
    const params = new URLSearchParams({
      lat: scanData.lat.toString(),
      lng: scanData.lng.toString(),
      radius: scanData.radius.toString()
    });
    
    const apiUrl = `http://localhost:8080/api/species?${params.toString()}`;
    console.log('📡 API Call:', apiUrl);
    
    // Make the API call to your Spring Boot backend
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
            "Verifique que el backend esté ejecutándose en http://localhost:8080" : 
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

export async function getPosts(bbox: number[]) {
  const params = new URLSearchParams({ bbox: bbox.join(",") });
  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed posts fetch");
  return res.json();
}