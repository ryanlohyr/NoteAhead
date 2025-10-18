import { makeApiUrl } from "@/lib/api";

export interface CreateUserResponse {
  success: boolean;
  data: {
    id: string;
    userId: string;
    fullName: string | null;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

export interface GetUserResponse {
  user: {
    id: string;
    userId: string;
    fullName: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export const authApi = {
  createUser: async (accessToken: string): Promise<CreateUserResponse> => {
    const response = await fetch(makeApiUrl("/auth/user"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    return response.json();
  },

  getUser: async (accessToken: string): Promise<GetUserResponse> => {
    const response = await fetch(makeApiUrl("/auth/user"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.statusText}`);
    }

    return response.json();
  },
};

