import api from "./client";

export interface Season {
  id: number;
  show_id: number;
  season_number: number;
  created_at: string;
  updated_at: string;
}

export interface SeasonCreate {
  season_number: number;
}

export async function getSeasons(showId: number): Promise<Season[]> {
  const response = await api.get<Season[]>(`/shows/${showId}/seasons`);
  return response.data;
}

export async function createSeason(
  showId: number,
  data: SeasonCreate
): Promise<Season> {
  const response = await api.post<Season>(
    `/shows/${showId}/seasons`,
    data
  );
  return response.data;
}

export async function deleteSeason(id: number): Promise<void> {
  await api.delete(`/seasons/${id}`);
}
