"use client";

import CollabEditor from "@/components/editor/CollabEditor";

export default function NewNotePage() {
  return (
    <div className="p-6">
      <CollabEditor docId="new-note" />
    </div>
  );
}