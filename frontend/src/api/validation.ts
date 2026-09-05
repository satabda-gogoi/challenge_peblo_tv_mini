import api from "./client";

export interface ValidationIssue {
  field: string;
  message: string;
  severity?: string;
  level?: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export async function validateEpisode(
  episodeId: number
): Promise<ValidationResponse> {
  const response = await api.get<ValidationResponse>(
    `/episodes/${episodeId}/validation`
  );
  return response.data;
}
