"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import CollabEditor from "@/components/editor/CollabEditor";
import { useGetNote, useUpdateNote } from "@/query/notes";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

export default function NotePage() {
  const params = useParams();
  const noteId = params.id as string;
  
  const { data, isLoading, error } = useGetNote(noteId);
  const updateNote = useUpdateNote();
  
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Update local title when data loads
  useEffect(() => {
    if (data?.note?.title) {
      setTitle(data.note.title);
    }
  }, [data?.note?.title]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title !== data?.note?.title && title.trim()) {
      updateNote.mutate({
        id: noteId,
        data: { title: title.trim() },
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load note</p>
          <p className="mt-2 text-gray-600 text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        {isEditingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="text-3xl font-bold border-none focus-visible:ring-0 px-0"
            autoFocus
            placeholder="Untitled"
          />
        ) : (
          <div 
            className="group flex items-center gap-2 cursor-pointer"
            onClick={() => setIsEditingTitle(true)}
          >
            <h1 className="text-3xl font-bold hover:text-gray-700 transition-colors">
              {title || "Untitled"}
            </h1>
            <Pencil className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
      <CollabEditor docId={noteId} initialDoc={data.note.content} />
    </div>
  );
}
