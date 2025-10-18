import { authService, useAuthStore } from "@/store/auth";
import { Session } from "@supabase/supabase-js";
import { useEffect, useState, useRef } from "react";

export const useAuthHook = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, session) => {
      if (_event === "INITIAL_SESSION" || _event === "SIGNED_IN") {
        if (hasInitialized.current && user?.userId) {
          setIsLoading(false);
          return;
        }

        hasInitialized.current = true;
        setIsLoading(false);
        setSession(session);
      }

      if (_event === "SIGNED_OUT") {
        setSession(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [user?.userId]);

  return { session, isLoading };
};

