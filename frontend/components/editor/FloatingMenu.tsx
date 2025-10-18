"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorView } from "prosemirror-view";
import { toggleMark } from "prosemirror-commands";
import { schema } from "@/lib/collab/schema";
import { MarkType } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";

interface FloatingMenuProps {
  view: EditorView | null;
}

interface MenuButton {
  mark: MarkType;
  label: string;
  title: string;
  className?: string;
}

const menuButtons: MenuButton[] = [
  { mark: schema.marks.strong, label: "B", title: "Bold (Ctrl/Cmd-B)", className: "font-bold" },
  { mark: schema.marks.em, label: "I", title: "Italic (Ctrl/Cmd-I)", className: "italic" },
  { mark: schema.marks.underline, label: "U", title: "Underline (Ctrl/Cmd-U)", className: "underline" },
  { mark: schema.marks.strikethrough, label: "S", title: "Strikethrough", className: "line-through" },
  { mark: schema.marks.code, label: "</>", title: "Code", className: "font-mono text-xs" },
  { mark: schema.marks.highlight, label: "H", title: "Highlight", className: "bg-yellow-200 px-1" },
];

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ view }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeMarks, setActiveMarks] = useState<Set<string>>(new Set());
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (!view) return;

    const updateMenu = () => {
      const { state } = view;
      const { selection } = state;
      const { from, to, empty } = selection;

      // Hide menu if selection is empty
      if (empty) {
        setPosition(null);
        return;
      }

      // Validate positions are within document bounds
      const docSize = state.doc.content.size;
      const validFrom = Math.max(0, Math.min(from, docSize));
      const validTo = Math.max(validFrom, Math.min(to, docSize));
      
      // If positions are invalid, hide menu
      if (validFrom >= validTo || validFrom < 0 || validTo > docSize) {
        setPosition(null);
        return;
      }

      // Get coordinates of the selection using validated positions
      const start = view.coordsAtPos(validFrom);
      const end = view.coordsAtPos(validTo);

      // Calculate menu position (centered below selection)
      const menuWidth = menuRef.current?.offsetWidth || 300;
      const left = (start.left + end.right) / 2 - menuWidth / 2;
      const top = end.bottom + 8; // 8px below selection

      setPosition({ top, left });

      // Update active marks
      const marks = new Set<string>();
      
      // Check which marks are active in the selection using validated positions
      menuButtons.forEach(({ mark }) => {
        if (state.doc.rangeHasMark(validFrom, validTo, mark)) {
          marks.add(mark.name);
        }
      });
      
      // Also check for link mark
      if (state.doc.rangeHasMark(validFrom, validTo, schema.marks.link)) {
        marks.add("link");
      }
      
      setActiveMarks(marks);
    };

    // Update menu on selection change
    const handleUpdate = () => {
      try {
        updateMenu();
      } catch (error) {
        console.error('Error updating floating menu:', error);
        setPosition(null);
      }
    };

    view.dom.addEventListener("mouseup", handleUpdate);
    view.dom.addEventListener("keyup", handleUpdate);
    view.dom.addEventListener("blur", () => setPosition(null));

    return () => {
      view.dom.removeEventListener("mouseup", handleUpdate);
      view.dom.removeEventListener("keyup", handleUpdate);
      view.dom.removeEventListener("blur", () => setPosition(null));
    };
  }, [view]);

  const handleMarkToggle = (mark: MarkType) => {
    if (!view) return;

    const { state, dispatch } = view;
    const command = toggleMark(mark);

    if (command(state, dispatch)) {
      view.focus();
    }
  };

  const handleLinkClick = () => {
    if (!view) return;
    
    const { state } = view;
    const { from, to } = state.selection;
    
    // Check if there's already a link
    const linkMark = state.doc.rangeHasMark(from, to, schema.marks.link);
    
    if (linkMark) {
      // Remove link
      const tr = state.tr.removeMark(from, to, schema.marks.link);
      view.dispatch(tr);
      view.focus();
    } else {
      // Show link input
      setShowLinkInput(true);
      setLinkUrl("");
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!view || !linkUrl) return;

    const { state, dispatch } = view;
    const { from, to } = state.selection;

    // Add link mark
    const tr = state.tr.addMark(from, to, schema.marks.link.create({ href: linkUrl }));
    dispatch(tr);
    
    setShowLinkInput(false);
    setLinkUrl("");
    view.focus();
  };

  if (!position || !view) return null;

  const hasLink = activeMarks.has("link");

  return (
    <div
      ref={menuRef}
      className="floating-menu fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => {
        // Prevent losing focus when clicking menu
        e.preventDefault();
      }}
    >
      {showLinkInput ? (
        <form onSubmit={handleLinkSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL"
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          {menuButtons.map(({ mark, label, title, className }) => {
            const isActive = activeMarks.has(mark.name);
            return (
              <button
                key={mark.name}
                type="button"
                title={title}
                onClick={() => handleMarkToggle(mark)}
                className={`
                  px-3 py-1.5 rounded transition-colors
                  ${className || ""}
                  ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }
                `}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            title={hasLink ? "Remove Link" : "Add Link (Ctrl/Cmd-K)"}
            onClick={handleLinkClick}
            className={`
              px-3 py-1.5 rounded transition-colors
              ${
                hasLink
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }
            `}
          >
            🔗
          </button>
        </div>
      )}
    </div>
  );
};

