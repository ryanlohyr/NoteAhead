"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthHook } from "./useAuthHook";
import { useAuthStore } from "@/store/auth";
import { usePathname, useRouter } from "next/navigation";

const allowedRoutes = ["/login", "/signup"];

const LoadingScreen = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuthHook();
  const [finishHandlingAuth, setFinishHandlingAuth] = useState(false);
  const router = useRouter();
  const { setUser, user } = useAuthStore();
  const pathname = usePathname();
  const authCompletedRef = useRef<boolean>(false);

  const performAuth = async (): Promise<boolean> => {
    if (!session) {
      setUser(null);
      if (!allowedRoutes.includes(pathname)) {
        router.push("/login");
      }
      return true; // Not an error, just no session
    }

    if (authCompletedRef.current) {
      return true;
    }

    authCompletedRef.current = true;

    const { user: userFromSession } = session;

    try {
      setUser({
        email: userFromSession.email || null,
        accessToken: session.access_token,
        userId: userFromSession.id,
      });

      return true;
    } catch (error) {
      console.error("Error during auth:", error);
      return false;
    }
  };

  useEffect(() => {
    const handleAuth = async () => {
      if (isLoading || user?.userId || authCompletedRef.current) {
        if (isLoading) {
          return;
        }

        setFinishHandlingAuth(true);
        return;
      }

      await performAuth();
      setFinishHandlingAuth(true);
    };

    handleAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isLoading, router, setUser]);

  if (!finishHandlingAuth) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

