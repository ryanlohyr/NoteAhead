import { EditorState, Transaction } from "prosemirror-state";
import { schema } from "./schema";

/**
 * Convert all markdown header syntax (# Header, ## Header, etc.) in the document to actual heading nodes
 */
export function convertMarkdownHeadersInDocument(state: EditorState): Transaction | null {
  const tr = state.tr;
  let modified = false;

  // Regex to find markdown headers at the start of a line or paragraph
  // Matches: # Header, ## Header, ### Header, etc. (up to 6 levels)
  const markdownHeaderRegex = /^(#{1,6})\s+(.+)$/;

  state.doc.descendants((node, pos) => {
    // Only process text nodes
    if (!node.isText || !node.text) return;

    const text = node.text;
    const match = markdownHeaderRegex.exec(text);

    if (match) {
      const hashes = match[1];
      const level = hashes.length; // Number of # determines the level
      const headerText = match[2];
      const from = pos;
      const to = pos + node.nodeSize;

      // Skip converting if any part of this range has the placeholder mark
      if (state.doc.rangeHasMark(from, to, schema.marks.placeholder)) {
        console.log('⏭️ Skipping markdown header conversion inside placeholder range', { from, to });
        return;
      }

      console.log('🔄 Converting markdown header:', { level, headerText, from, to });

      // Get the parent node to check if we're in a paragraph
      const $pos = state.doc.resolve(from);
      const parent = $pos.parent;

      // Only convert if we're in a paragraph or similar block
      if (parent.type.name === "paragraph" || parent.type.isTextblock) {
        // Delete the markdown syntax text
        tr.delete(from, to);

        // Create a heading node with the extracted text
        const headingNode = schema.nodes.heading.create(
          { level },
          schema.text(headerText)
        );

        // Insert the heading node
        tr.insert(from, headingNode);

        modified = true;
      }
    }
  });

  return modified ? tr : null;
}

