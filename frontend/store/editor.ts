import { create } from "zustand";

interface EditorState {
  insertTextFn: ((lineNumber: number, cursorPosition: number | undefined, text: string, usePlaceholder?: boolean) => void) | null;
  currentDocId: string | null;
  
  // Actions
  setInsertTextFunction: (fn: ((lineNumber: number, cursorPosition: number | undefined, text: string, usePlaceholder?: boolean) => void) | null, docId: string | null) => void;
  insertNotesIntoEditor: (formattedNotes: string, lineNumber?: number, cursorPosition?: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  insertTextFn: null,
  currentDocId: null,

  setInsertTextFunction: (fn, docId) =>
    set({
      insertTextFn: fn,
      currentDocId: docId,
    }),

  insertNotesIntoEditor: (formattedNotes, lineNumber = 1, cursorPosition = 0) => {
    const { insertTextFn } = get();

    if (!insertTextFn) {
      console.warn("No editor insert function available. Cannot insert notes.");
      return;
    }

    console.log("📝 Inserting notes into editor:", {
      lineNumber,
      cursorPosition,
      text: formattedNotes.substring(0, 100) + "...",
    });

    // Split by newline and add each line with spacing
    const lines = formattedNotes.split('\n');
    let currentLine = lineNumber;
    
    lines.forEach((line, index) => {
      // For the first line, use the provided cursor position
      // For subsequent lines, start at position 0
      const position = index === 0 ? cursorPosition : 0;
      
      // Add the line content with a space at the beginning (except for empty lines)
      const textToInsert = line.trim() === '' ? '' : ` ${line}`;
      
      // Insert without placeholder (usePlaceholder = false)
      insertTextFn(currentLine, position, textToInsert, false);
      currentLine++; // Move to next line
    });
  },
}));

