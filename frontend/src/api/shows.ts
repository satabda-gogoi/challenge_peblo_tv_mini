import api from "./client";

export interface Category {
  id: number;
  name: string;
}

export interface Show {
  id: number;
  title: string;
  slug: string;
  synopsis: string | null;
  section: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  categories: string[];
}

export interface ShowCreate {
  title: string;
  slug: string;
  synopsis?: string | null;
  section?: string | null;
  category_ids: number[];
  status?: string;
}

export async function getShows(): Promise<Show[]> {
  const response = await api.get<Show[]>("/shows");
  return response.data;
}

export async function getShow(id: number): Promise<Show> {
  const response = await api.get<Show>(`/shows/${id}`);
  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>("/categories");
  return response.data;
}

export async function createShow(
  data: ShowCreate,
): Promise<Show> {
  const response = await api.post<Show>(
    "/shows",
    data,
  );

  return response.data;
}

export async function updateShow(
  id: number,
  data: Partial<ShowCreate>
): Promise<Show> {
  const response = await api.put<Show>(`/shows/${id}`, data);
  return response.data;
}

export async function deleteShow(
  id: number,
): Promise<void> {
  await api.delete(`/shows/${id}`);
}
