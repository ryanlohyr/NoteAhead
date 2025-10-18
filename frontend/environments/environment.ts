export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  backendApiUrl: string;
  supabaseRedirectUrl: string;
  appEnv: string;
}

export const environment: EnvironmentConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  backendApiUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:3001",
  supabaseRedirectUrl: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "http://localhost:3000",
  appEnv: process.env.APP_ENV || "development",
};

