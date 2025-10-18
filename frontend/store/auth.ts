import { environment } from "@/environments";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import { authApi } from "@/query/authQuery";

class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  async getSession() {
    return await this.supabase.auth.getSession();
  }

  async signUp(email: string, password: string) {
    const result = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: environment.supabaseRedirectUrl,
      },
    });

    if (environment.appEnv !== "development") {
      // https://github.com/supabase/auth/issues/1517
      if (result.data.user?.identities && result.data.user.identities.length === 0) {
        throw new Error("User is already registered.");
      }
      return result;
    }

    if (result.error || !result.data.user?.id) {
      console.error("Failed to sign up", result.error);
      if (result.error) throw result.error;
      throw new Error(`Failed to sign up, please contact support`);
    }

    return result;
  }

  async signInWithPassword(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}

// Initialize auth service
const authService = new AuthService();

export interface User {
  email: string | null;
  accessToken: string | null;
  userId: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error: unknown }>;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  getAccessToken: () => Promise<string | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  logout: async () => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await authService.signOut();
      if (error) throw error;

      set({ user: null, isAuthenticated: false });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to logout";
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password) => {
    try {
      const { data, error } = await authService.signUp(email, password);
      if (error) throw error;

      let dbCreationSuccess = false;

      // After successful Supabase signup, create user in our database
      if (data?.session?.access_token) {
        try {
          await authApi.createUser(data.session.access_token);
          console.log("User created in database");
          dbCreationSuccess = true;
        } catch (dbError) {
          console.error("Failed to create user in database:", dbError);
          
          // Return failure if database creation fails
          return {
            success: false,
            error: dbError,
          };
        }
      }

      return {
        success: !!data?.user && dbCreationSuccess,
        error: error,
      };
    } catch (error: unknown) {
      console.error("error", error);
      
      return {
        success: false,
        error: error,
      };
    }
  },

  loginWithPassword: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await authService.signInWithPassword(email, password);

      if (error) throw error;

      if (data?.user && data?.session) {
        // Try to create user in database if they don't exist
        // The backend will check if user exists and only create if needed
        try {
          await authApi.createUser(data.session.access_token);
        } catch (dbError) {
          console.error("Failed to ensure user exists in database:", dbError);
          const errorMessage = dbError instanceof Error 
            ? dbError.message 
            : "Failed to initialize user account. Please try again or contact support.";
          
          // Sign out the user since we couldn't create their account
          await authService.signOut();
          
          set({ error: errorMessage });
          return false;
        }

        set({
          user: {
            email: data.user.email || null,
            accessToken: data.session.access_token,
            userId: data.user.id,
          },
          isAuthenticated: true,
        });
        
        return true;
      }
      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to login";
      set({ error: errorMessage });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  getAccessToken: async () => {
    const { data: sessionData } = await authService.getSession();
    return sessionData.session?.access_token || null;
  },

  clearError: () => set({ error: null }),
}));

// Export the auth service for direct access if needed
export { authService };

