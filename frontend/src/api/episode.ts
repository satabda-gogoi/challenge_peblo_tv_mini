import api from "./client";

export interface Episode {
  id: number;
  season_id: number;
  source_episode_id: string | null;
  episode_number: number;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EpisodeUpdate {
  source_episode_id?: string;
  episode_number?: number;
  title?: string;
  description?: string | null;
  duration_seconds?: number | null;
  status?: string;
}

export async function getEpisode(id: number): Promise<Episode> {
  const response = await api.get<Episode>(`/episodes/${id}`);
  return response.data;
}

export async function updateEpisode(
  id: number,
  data: EpisodeUpdate
): Promise<Episode> {
  const response = await api.put<Episode>(
    `/episodes/${id}`,
    data
  );
  return response.data;
}
