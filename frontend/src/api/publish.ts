import api from "./client";

export interface PublishResponse {
  publish_run_id: number;
  outcome: string;
  shows_count: number;
  episodes_count: number;
  catalogue_uri?: string | null;
  error_message?: string | null;
}

export interface PublishRun {
  id: number;
  published_by: number;
  started_at: string;
  completed_at: string | null;
  shows_count: number;
  episodes_count: number;
  outcome: string;
  catalogue_uri: string | null;
  error_message: string | null;
  created_at: string;
}

export async function publishCatalogue(): Promise<PublishResponse> {
  const response = await api.post<PublishResponse>("/publish");
  return response.data;
}

export async function getPublishRuns(): Promise<PublishRun[]> {
  const response = await api.get<PublishRun[]>("/publish/runs");
  return response.data;
}

export async function getPublishRun(
  id: number
): Promise<PublishRun> {
  const response = await api.get<PublishRun>(
    `/publish/runs/${id}`
  );
  return response.data;
}
