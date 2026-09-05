import api from "./client";

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    "/auth/login",
    {
      username,
      password,
    },
  );

  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>("/auth/me");

  return response.data;
}

export function logout() {
  localStorage.removeItem("access_token");
}
