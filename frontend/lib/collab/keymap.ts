import { toggleMark } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import { undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { schema } from "./schema";
import { Plugin } from "prosemirror-state";

// Create keyboard shortcuts for marks
export function buildKeymap(): Plugin {
  const keys: { [key: string]: any } = {
    "Mod-b": toggleMark(schema.marks.strong),
    "Mod-i": toggleMark(schema.marks.em),
    "Mod-u": toggleMark(schema.marks.underline),
    "Mod-`": toggleMark(schema.marks.code),
    "Mod-z": undo,
    "Mod-y": redo,
    "Mod-Shift-z": redo,
    Backspace: undoInputRule,
  };

  return keymap(keys);
}

