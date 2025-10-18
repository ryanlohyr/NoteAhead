"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateNote } from "@/query/notes";

export default function NewNotePage() {
  const router = useRouter();
  const createNoteMutation = useCreateNote();

  useEffect(() => {
    // Create a new note with default content and redirect to it
    const createNewNote = async () => {
      try {
        const result = await createNoteMutation.mutateAsync({
          title: "Untitled Note",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
              },
            ],
          },
        });

        if (result.success && result.note) {
          router.push(`/notes/${result.note.id}`);
        }
      } catch (error) {
        console.error("Failed to create note:", error);
      }
    };

    createNewNote();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Creating new note...</p>
      </div>
    </div>
  );
}