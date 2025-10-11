export async function getZoneSpecies(bbox: number[]) {
  // DEMO: Datos mock para desarrollo (sin backend)
  // TODO: Reemplazar con llamada real cuando tengas backend
  console.log('Simulando consulta para zona:', bbox);
  
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Datos de ejemplo basados en la zona del Mediterráneo
  const mockData = {
    species: [
      {
        taxon_id: "1",
        common_name: "Pez Payaso del Mediterráneo",
        scientific_name: "Amphiprion mediterraneus",
        records: 156,
        last_record: "2024-09-15"
      },
      {
        taxon_id: "2", 
        common_name: "Pulpo Común",
        scientific_name: "Octopus vulgaris",
        records: 234,
        last_record: "2024-10-01"
      },
      {
        taxon_id: "3",
        common_name: "Mero Atlántico",
        scientific_name: "Epinephelus marginatus",
        records: 89,
        last_record: "2024-09-28"
      },
      {
        taxon_id: "4",
        scientific_name: "Posidonia oceanica",
        records: 445,
        last_record: "2024-10-05"
      },
      {
        taxon_id: "5",
        common_name: "Estrella de Mar Roja",
        scientific_name: "Echinaster sepositus",
        records: 67,
        last_record: "2024-09-20"
      }
    ],
    counts: {
      total_taxa: 5
    },
    source: ["iNaturalist", "GBIF", "MedFish"]
  };
  
  return mockData;
  
  // Código original (comentado hasta que tengas backend):
  /*
  const params = new URLSearchParams({ bbox: bbox.join(",") });
  const res = await fetch(`/api/zones/species?${params.toString()}`);
  if (!res.ok) throw new Error("Failed species fetch");
  return res.json();
  */
}

export async function getPosts(bbox: number[]) {
  const params = new URLSearchParams({ bbox: bbox.join(",") });
  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed posts fetch");
  return res.json();
}