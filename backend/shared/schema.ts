import { Schema, MarkSpec } from "prosemirror-model";
import { schema as base } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

// Enhanced marks with additional formatting options
const marks: { [key: string]: MarkSpec } = {
  ...base.spec.marks.toObject(),
  
  // Add underline mark
  underline: {
    parseDOM: [
      { tag: "u" },
      {
        style: "text-decoration",
        getAttrs: (value) => (value === "underline" ? {} : false),
      },
    ],
    toDOM: () => ["u", 0],
  },

  // Add strikethrough mark
  strikethrough: {
    parseDOM: [
      { tag: "s" },
      { tag: "strike" },
      { tag: "del" },
      {
        style: "text-decoration",
        getAttrs: (value) => (value === "line-through" ? {} : false),
      },
    ],
    toDOM: () => ["s", 0],
  },

  // Add highlight mark
  highlight: {
    attrs: {
      color: { default: "yellow" },
    },
    parseDOM: [
      {
        tag: "mark",
        getAttrs: (node: any) => {
          const color = node.style?.backgroundColor || "yellow";
          return { color };
        },
      },
    ],
    toDOM: (mark) => [
      "mark",
      {
        style: `background-color: ${mark.attrs.color}`,
      },
      0,
    ],
  },

  // Add subscript mark
  subscript: {
    excludes: "superscript",
    parseDOM: [{ tag: "sub" }],
    toDOM: () => ["sub", 0],
  },

  // Add superscript mark
  superscript: {
    excludes: "subscript",
    parseDOM: [{ tag: "sup" }],
    toDOM: () => ["sup", 0],
  },
};

export const schema = new Schema({
  nodes: addListNodes(base.spec.nodes, "paragraph block*", "block"),
  marks: marks,
});

