import api from "./client";

export interface Catalogue {
  generated_at: string;
  version: number;
  shows_count?: number;
  shows: CatalogueShow[];
  sections?: Record<string, CatalogueShow[]>;
}

export interface CatalogueArtworkMap {
  poster?: string | null;
  banner?: string | null;
  thumbnail?: string | null;
  [key: string]: string | null | undefined;
}

export interface CatalogueShow {
  id: string;
  raw_id?: number;
  title: string;
  slug: string;
  synopsis: string | null;
  section: string | null;
  categories: string[];
  artwork: CatalogueArtworkMap;
  trailers?: CatalogueEpisode[];
  seasons: CatalogueSeason[];
}

export interface CatalogueSeason {
  season_number: number;
  episodes: CatalogueEpisode[];
}

export interface CatalogueEpisode {
  id?: number;
  source_episode_id?: string;
  episode_number: number;
  title: string;
  description?: string | null;
  duration_seconds: number | null;
  content_group?: string | null;
  available_languages?: string[];
  languages: Record<
    string,
    {
      video_uri: string;
    }
  >;
  artwork: Record<string, string>;
}

export async function getCatalogue(): Promise<Catalogue> {
  const response = await api.get<Catalogue>("/catalogue");
  return response.data;
}

export async function searchCatalogue(
  query: string
): Promise<Catalogue> {
  const response = await api.get<Catalogue>(
    `/catalogue/search?q=${encodeURIComponent(query)}`
  );
  return response.data;
}

export async function getCatalogueByCategory(
  category: string
): Promise<Catalogue> {
  const response = await api.get<Catalogue>(
    `/catalogue/category/${encodeURIComponent(category)}`
  );
  return response.data;
}
