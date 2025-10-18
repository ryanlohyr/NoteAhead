export const getMetadataTitle = () => {
  const instance = process.env.NEXT_NOTEAHEAD_INSTANCE || "0";
  return instance === "1" ? "NoteAhead - Instance 1" : "NoteAhead - Instance 0";
};

export const getMetadataDescription = () => {
  const instance = process.env.NEXT_NOTEAHEAD_INSTANCE || "0";
  return instance === "1" 
    ? "Your note-taking application - Instance 1"
    : "Your note-taking application - Instance 0";
};

