import { useAuthStore } from "@/store/auth";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  responseType?: "json" | "blob";
}

export const makeApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  return `${baseUrl}${path}`;
};

/**
 * Wraps the native fetch API with authentication capabilities
 * Automatically adds auth headers when requireAuth is true
 * Handles authentication errors by signing out and redirecting to login
 */
export const fetchWrapper = async <T>(url: string, options: FetchOptions = {}): Promise<T> => {
  const { requireAuth = true, responseType = "json", ...fetchOptions } = options;

  // Default headers
  const headers = new Headers(fetchOptions.headers || {});

  // Set content type if not already set
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Add auth token if required
  if (requireAuth) {
    const token = await useAuthStore.getState().getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Execute fetch with merged options
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Check if response is OK
  if (!response.ok) {
    // Handle authentication errors (401 Unauthorized)
    if (response.status === 401) {
      console.error("Authentication error detected. Signing out...");
      
      // Sign out from Supabase
      await useAuthStore.getState().logout();
      
      // Clear all localStorage data to ensure clean state
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = "/login";
      }
      
      throw new Error("Authentication expired. Please log in again.");
    }

    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  // Return JSON response
  return (responseType === "json" ? response.json() : response.blob()) as Promise<T>;
};

