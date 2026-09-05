import api from "./client";

export interface ValidationIssue {
  field: string;
  message: string;
  severity?: string;
  level?: string;
}

export interface ShowValidation {
  show_id: number;
  title: string;
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface CatalogueValidation {
  valid: boolean;
  shows: ShowValidation[];
}

export async function validateCatalogue(): Promise<CatalogueValidation> {
  const response = await api.get<CatalogueValidation>(
    "/validation"
  );

  return response.data;
}
