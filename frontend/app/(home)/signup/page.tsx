"use client";

import { SignUp } from "@/components/Auth";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { useAuthHook } from "@/components/Auth/useAuthHook";

export default function SignUpPage() {
  const { isLoading } = useAuthHook(); 

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Simple Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 to-blue-600 relative">
        <div className="flex flex-col justify-center px-16 py-16 text-white">
          {/* Logo */}
          <div className="mb-16">
            <h1 className="text-4xl font-bold">NoteAhead</h1>
          </div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl font-semibold mb-4 leading-tight">
              Ready to start organizing your notes?
            </h2>
            
            {/* Stats */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-blue-200">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span>Free to start</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-200">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span>Powerful note management</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-200">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span>AI-powered features</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12 text-center">
            <h1 className="text-3xl font-bold text-blue-600">NoteAhead</h1>
          </div>

          {/* Signup Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Suspense fallback={
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
              </div>
            }>
              <SignUp />
            </Suspense>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

