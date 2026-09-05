import api from "./client";

export interface Artwork {
  id: number;
  episode_id: number;
  type: string;
  storage_uri: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtworkCreate {
  type: string;
  storage_uri: string;
  alt_text?: string | null;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  mime_type?: string | null;
}

export async function getEpisodeArtworks(
  episodeId: number
): Promise<Artwork[]> {
  const response = await api.get<Artwork[]>(
    `/episodes/${episodeId}/artworks`
  );
  return response.data;
}

export async function createArtwork(
  episodeId: number,
  data: ArtworkCreate
): Promise<Artwork> {
  const response = await api.post<Artwork>(
    `/episodes/${episodeId}/artworks`,
    data
  );
  return response.data;
}

export async function updateArtwork(
  id: number,
  data: Partial<ArtworkCreate>
): Promise<Artwork> {
  const response = await api.put<Artwork>(
    `/artworks/${id}`,
    data
  );
  return response.data;
}

export async function deleteArtwork(id: number): Promise<void> {
  await api.delete(`/artworks/${id}`);
}

export async function uploadEpisodeArtwork(
  episodeId: number,
  artworkType: string,
  file: File,
  altText?: string
): Promise<Artwork> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", artworkType);
  formData.append("artwork_type", artworkType);
  if (altText) {
    formData.append("alt_text", altText);
  }

  const response = await api.post<Artwork>(
    `/episodes/${episodeId}/artworks/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

