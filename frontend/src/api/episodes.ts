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

export interface EpisodeCreate {
  source_episode_id: string;
  episode_number: number;
  title: string;
  description?: string | null;
  duration_seconds?: number | null;
  status?: string;
}

export async function getEpisodes(seasonId: number): Promise<Episode[]> {
  const response = await api.get<Episode[]>(
    `/seasons/${seasonId}/episodes`
  );
  return response.data;
}

export async function createEpisode(
  seasonId: number,
  data: EpisodeCreate
): Promise<Episode> {
  const response = await api.post<Episode>(
    `/seasons/${seasonId}/episodes`,
    data
  );
  return response.data;
}

export async function updateEpisode(
  id: number,
  data: Partial<EpisodeCreate>
): Promise<Episode> {
  const response = await api.put<Episode>(
    `/episodes/${id}`,
    data
  );

  return response.data;
}

export async function deleteEpisode(id: number): Promise<void> {
  await api.delete(`/episodes/${id}`);
}
