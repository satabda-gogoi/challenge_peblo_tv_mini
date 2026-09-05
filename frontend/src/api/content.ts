import api from "./client";

export interface EpisodeContent {
  id: number;
  content_group_id: number;
  language: string;
  video_uri: string;
  created_at: string;
  updated_at: string;
}

export interface ContentCreate {
  language: string;
  video_uri: string;
}

export async function getEpisodeContents(
  episodeId: number
): Promise<EpisodeContent[]> {
  const response = await api.get<EpisodeContent[]>(
    `/episodes/${episodeId}/contents`
  );
  return response.data;
}

export async function createEpisodeContent(
  episodeId: number,
  data: ContentCreate
): Promise<EpisodeContent> {
  const response = await api.post<EpisodeContent>(
    `/episodes/${episodeId}/contents`,
    data
  );
  return response.data;
}

export async function updateEpisodeContent(
  id: number,
  data: Partial<ContentCreate>
): Promise<EpisodeContent> {
  const response = await api.put<EpisodeContent>(
    `/contents/${id}`,
    data
  );
  return response.data;
}

export async function deleteEpisodeContent(id: number): Promise<void> {
  await api.delete(`/contents/${id}`);
}
