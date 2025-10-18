import { noteDb, NoteRecord } from "#db/index.js";

export const getAllNotesUseCase = async (userId: string): Promise<NoteRecord[]> => {
  return noteDb.getAllNotes(userId);
};

export const getNoteUseCase = async (noteId: string, userId: string): Promise<NoteRecord | null> => {
  return noteDb.getNote(noteId, userId);
};

export const createNoteUseCase = async (
  title: string,
  content: unknown,
  userId: string,
  folderId?: string
): Promise<NoteRecord> => {
  return noteDb.createNote({
    title,
    content,
    userId,
    folderId,
  });
};

export const updateNoteUseCase = async (
  noteId: string,
  userId: string,
  data: {
    title?: string;
    content?: unknown;
    folderId?: string;
  }
): Promise<NoteRecord | null> => {
  return noteDb.updateNote(noteId, userId, data);
};

export const deleteNoteUseCase = async (noteId: string, userId: string): Promise<boolean> => {
  return noteDb.deleteNote(noteId, userId);
};

