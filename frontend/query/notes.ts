import { toast } from "sonner";
import { fetchWrapper, makeApiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Note = {
  id: string;
  title: string;
  content: any; // ProseMirror JSON
  userId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Note API functions
 * Centralized API logic for all note operations
 */
export const noteApi = {
  /**
   * Get all notes for a user
   */
  getAllNotes: async (): Promise<{ notes: Note[]; success: boolean }> => {
    const url = makeApiUrl("/api/notes");
    const data = await fetchWrapper<{ notes: Note[]; success: boolean }>(url, {
      method: "GET",
    });
    return data;
  },

  /**
   * Get a specific note by ID
   */
  getNote: async (id: string): Promise<{ note: Note; success: boolean }> => {
    const url = makeApiUrl(`/api/notes/${id}`);
    const data = await fetchWrapper<{ note: Note; success: boolean }>(url, {
      method: "GET",
    });
    return data;
  },

  /**
   * Create a new note
   */
  createNote: async (
    title: string,
    content: any,
    folderId?: string
  ): Promise<{ note: Note; success: boolean }> => {
    const url = makeApiUrl("/api/notes");
    const data = await fetchWrapper<{ note: Note; success: boolean }>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        folderId,
      }),
    });
    return data;
  },

  /**
   * Update an existing note
   */
  updateNote: async (
    id: string,
    data: {
      title?: string;
      content?: any;
      folderId?: string;
    }
  ): Promise<{ note: Note; success: boolean }> => {
    const url = makeApiUrl(`/api/notes/${id}`);
    const result = await fetchWrapper<{ note: Note; success: boolean }>(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return result;
  },

  /**
   * Delete a note
   */
  deleteNote: async (id: string): Promise<{ success: boolean }> => {
    const url = makeApiUrl(`/api/notes/${id}`);
    const data = await fetchWrapper<{ success: boolean }>(url, {
      method: "DELETE",
    });
    return data;
  },
};

/**
 * Hook to get all notes
 */
export const useGetAllNotes = () => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: () => noteApi.getAllNotes(),
  });
};

/**
 * Hook to get a specific note
 */
export const useGetNote = (id: string) => {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => noteApi.getNote(id),
    enabled: !!id,
  });
};

/**
 * Hook to create a note
 */
export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      folderId,
    }: {
      title: string;
      content: any;
      folderId?: string;
    }) => {
      return noteApi.createNote(title, content, folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      toast.error("Failed to create note", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

/**
 * Hook to update a note
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        content?: any;
        folderId?: string;
      };
    }) => {
      return noteApi.updateNote(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update note", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

/**
 * Hook to delete a note
 */
export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return noteApi.deleteNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete note", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

