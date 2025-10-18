import { EditorState, Transaction } from "prosemirror-state";
import { schema } from "./schema";

/**
 * Convert all markdown link syntax [text](url) in the document to actual link marks
 */
export function convertMarkdownLinksInDocument(state: EditorState): Transaction | null {
  const tr = state.tr;
  let modified = false;

  // Regex to find markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = node.text;
      let match;
      const matches: Array<{ start: number; end: number; text: string; url: string }> = [];

      // Find all markdown links in this text node
      while ((match = markdownLinkRegex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          url: match[2],
        });
      }

      // Process matches in reverse order to maintain correct positions
      for (let i = matches.length - 1; i >= 0; i--) {
        const { start, end, text: linkText, url } = matches[i];
        const from = pos + start;
        const to = pos + end;

        // Skip converting if any part of this range has the placeholder mark
        if (state.doc.rangeHasMark(from, to, schema.marks.placeholder)) {
          console.log('⏭️ Skipping markdown link conversion inside placeholder range', { from, to });
          continue;
        }

        console.log('🔄 Converting markdown link:', { linkText, url, from, to });

        // Delete the markdown syntax
        tr.delete(from, to);

        // Insert the link text with link mark
        const linkMark = schema.marks.link.create({ href: url });
        const linkNode = schema.text(linkText, [linkMark]);
        tr.insert(from, linkNode);

        modified = true;
      }
    }
  });

  return modified ? tr : null;
}

