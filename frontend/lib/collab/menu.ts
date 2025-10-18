import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { liftListItem } from "prosemirror-schema-list";
import { undo, redo } from "prosemirror-history";
import { MenuItem } from "prosemirror-menu";
import { schema } from "./schema";
import { EditorState } from "prosemirror-state";
import { MarkType, NodeType } from "prosemirror-model";

// Helper function to check if a mark is active
function markActive(state: EditorState, type: MarkType) {
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

// Helper function to check if a block is active
function blockActive(state: EditorState, type: NodeType, attrs: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { $from, to, node } = state.selection as { $from: any; to: number; node?: any };
  if (node) return node.hasMarkup(type, attrs);
  return to <= $from.end() && $from.parent.hasMarkup(type, attrs);
}

// Helper to create mark toggle menu item
function markItem(markType: MarkType, options: { title: string; label: string; class?: string }) {
  return new MenuItem({
    title: options.title,
    label: options.label,
    class: options.class,
    active(state) {
      return markActive(state, markType);
    },
    enable(state) {
      return toggleMark(markType)(state);
    },
    run: toggleMark(markType),
  });
}

// Helper to create block menu item
function blockTypeItem(nodeType: NodeType, options: { title: string; label: string; attrs?: Record<string, unknown>; class?: string }) {
  return new MenuItem({
    title: options.title,
    label: options.label,
    class: options.class,
    active(state) {
      return blockActive(state, nodeType, options.attrs || {});
    },
    enable(state) {
      return setBlockType(nodeType, options.attrs)(state);
    },
    run: setBlockType(nodeType, options.attrs),
  });
}

// Helper to create wrap menu item
function wrapItem(nodeType: NodeType, options: { title: string; label: string; attrs?: Record<string, unknown>; class?: string }) {
  return new MenuItem({
    title: options.title,
    label: options.label,
    class: options.class,
    active(state) {
      return blockActive(state, nodeType, options.attrs || {});
    },
    enable(state) {
      return wrapIn(nodeType, options.attrs)(state);
    },
    run: wrapIn(nodeType, options.attrs),
  });
}

// Create menu items for our enhanced schema
export const buildMenuItems = () => {
  const items: Record<string, MenuItem> = {};

  // Inline formatting marks
  items.toggleStrong = markItem(schema.marks.strong, {
    title: "Toggle bold (Ctrl/Cmd-B)",
    label: "B",
    class: "menu-item-bold",
  });

  items.toggleEm = markItem(schema.marks.em, {
    title: "Toggle italic (Ctrl/Cmd-I)",
    label: "I",
    class: "menu-item-italic",
  });

  items.toggleUnderline = markItem(schema.marks.underline, {
    title: "Toggle underline (Ctrl/Cmd-U)",
    label: "U",
    class: "menu-item-underline",
  });

  items.toggleStrikethrough = markItem(schema.marks.strikethrough, {
    title: "Toggle strikethrough",
    label: "S",
    class: "menu-item-strikethrough",
  });

  items.toggleHighlight = markItem(schema.marks.highlight, {
    title: "Toggle highlight",
    label: "H",
    class: "menu-item-highlight",
  });

  items.toggleCode = markItem(schema.marks.code, {
    title: "Toggle code font (Ctrl/Cmd-`)",
    label: "</>",
    class: "menu-item-code",
  });

  items.toggleSubscript = markItem(schema.marks.subscript, {
    title: "Toggle subscript",
    label: "X₂",
    class: "menu-item-subscript",
  });

  items.toggleSuperscript = markItem(schema.marks.superscript, {
    title: "Toggle superscript",
    label: "X²",
    class: "menu-item-superscript",
  });

  // Block types
  items.makeParagraph = blockTypeItem(schema.nodes.paragraph, {
    title: "Change to paragraph",
    label: "¶",
    class: "menu-item-paragraph",
  });

  items.makeCodeBlock = blockTypeItem(schema.nodes.code_block, {
    title: "Change to code block",
    label: "{ }",
    class: "menu-item-code-block",
  });

  // Headings
  for (let i = 1; i <= 6; i++) {
    items[`makeHead${i}`] = blockTypeItem(schema.nodes.heading, {
      title: `Change to heading ${i}`,
      label: `H${i}`,
      attrs: { level: i },
      class: `menu-item-heading-${i}`,
    });
  }

  // Lists
  items.wrapBulletList = wrapItem(schema.nodes.bullet_list, {
    title: "Wrap in bullet list",
    label: "•",
    class: "menu-item-bullet-list",
  });

  items.wrapOrderedList = wrapItem(schema.nodes.ordered_list, {
    title: "Wrap in ordered list",
    label: "1.",
    class: "menu-item-ordered-list",
  });

  items.wrapBlockQuote = wrapItem(schema.nodes.blockquote, {
    title: "Wrap in block quote",
    label: "❝",
    class: "menu-item-blockquote",
  });

  items.liftListItem = new MenuItem({
    title: "Lift out of list",
    label: "↑",
    enable(state) {
      return liftListItem(schema.nodes.list_item)(state);
    },
    run: liftListItem(schema.nodes.list_item),
  });

  // History
  items.undo = new MenuItem({
    title: "Undo last change (Ctrl/Cmd-Z)",
    label: "↶",
    class: "menu-item-undo",
    enable(state) {
      return undo(state);
    },
    run: undo,
  });

  items.redo = new MenuItem({
    title: "Redo last undone change (Ctrl/Cmd-Y)",
    label: "↷",
    class: "menu-item-redo",
    enable(state) {
      return redo(state);
    },
    run: redo,
  });

  return items;
};

export const getFullMenu = () => {
  const items = buildMenuItems();
  
  return [
    // Inline formatting
    [items.toggleStrong, items.toggleEm, items.toggleUnderline, items.toggleStrikethrough],
    [items.toggleHighlight, items.toggleCode],
    [items.toggleSubscript, items.toggleSuperscript],
    // Block types
    [items.makeParagraph, items.makeCodeBlock],
    // Headings
    [items.makeHead1, items.makeHead2, items.makeHead3],
    // Lists and quotes
    [items.wrapBulletList, items.wrapOrderedList, items.wrapBlockQuote, items.liftListItem],
    // History
    [items.undo, items.redo],
  ];
};

