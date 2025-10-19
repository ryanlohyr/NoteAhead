"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorState, Transaction, TextSelection, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { history } from "prosemirror-history";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { schema } from "@/lib/collab/schema";
import { Reporter } from "@/lib/collab/reporter";
import { commentPlugin, commentUI } from "@/lib/collab/comment";
import { buildKeymap } from "@/lib/collab/keymap";
import { buildInputRules } from "@/lib/collab/inputrules";
import { FloatingMenu } from "./FloatingMenu";
import { EditorTestControls } from "./EditorTestControls";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEditorInsertion } from "@/hooks/useEditorInsertion";
import { useUpdateNote } from "@/query/notes";
import { filePageLinkPlugin } from "@/lib/collab/filePageLink";
import { convertMarkdownLinksInDocument } from "@/lib/collab/convertMarkdownLinks";
import { convertMarkdownHeadersInDocument } from "@/lib/collab/convertMarkdownHeaders";
import { useFileManagerStore } from "@/store/fileManager";
import { useRightSidebarStore } from "@/store/sidebar";
import { useEditorStore } from "@/store/editor";
import { useSidebar } from "@/components/ui/sidebar";
import "./CollabEditor.css";

interface CollabEditorProps {
  docId: string;
  noteName?: string;
  edgeFunctionUrl?: string;
  initialDoc?: any; // ProseMirror JSON document
}

interface HealthCheckResponse {
  status: string;
  channel: string;
  docId: string;
  userId: string;
  timestamp: string;
}

export default function CollabEditor({
  docId,
  noteName,
  edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/collab-session`
    : "http://localhost:54321/functions/v1/collab-session",
  initialDoc,
}: CollabEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [channelName, setChannelName] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reportRef = useRef<Reporter>(new Reporter());
  const hasUnsavedChanges = useRef<boolean>(false);
  const updateNote = useUpdateNote();
  const autoConvertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDocContentRef = useRef<string>("");

  // Get stores for file page link handling
  const scrollToPageRef = useFileManagerStore((state) => state.scrollToPageRef);
  const selectFile = useFileManagerStore((state) => state.selectFile);
  const currentFileId = useFileManagerStore((state) => state.selectedFileId);
  const { isRightOpen, openRight, setActiveView } = useRightSidebarStore();
  const { setOpen: setLeftSidebarOpen } = useSidebar();
  const setInsertTextFunction = useEditorStore((state) => state.setInsertTextFunction);

  // Use the editor insertion hook
  const {
    insertTextAtParagraph,
    placeholderRangeRef,
    isPendingAccept,
    setIsPendingAccept,
    isPendingAcceptRef,
  } = useEditorInsertion(editorViewRef);

  // Health check effect
  useEffect(() => {
    const checkHealth = async () => {
      try {
        reportRef.current.success();

        // Get JWT from Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${edgeFunctionUrl}?docId=${docId}`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`);
        }

        const data: HealthCheckResponse = await response.json();

        if (data.status === "healthy") {
          setIsHealthy(true);
          setChannelName(data.channel);
          reportRef.current.success();
        } else {
          throw new Error("Edge function not healthy");
        }
      } catch (error) {
        console.error("Health check failed:", error);
        reportRef.current.failure(error as Error);
        setIsHealthy(false);
      }
    };

    checkHealth();
  }, [docId, edgeFunctionUrl]);

  // Initialize editor and Realtime connection
  useEffect(() => {
    if (!editorRef.current || !isHealthy || !channelName) return;

    // Custom Tab key handler to remove placeholder mark
    const handleTab = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
      const placeholderRange = placeholderRangeRef.current;
      if (!placeholderRange) return false;

      const { from, to } = placeholderRange;

      // Validate and clamp positions to valid range
      const docSize = state.doc.content.size;
      const validFrom = Math.max(0, Math.min(from, docSize));
      const validTo = Math.max(validFrom, Math.min(to, docSize));

      if (validFrom >= validTo || validFrom < 0) {
        // Invalid range, clear it
        placeholderRangeRef.current = null;
        setIsPendingAccept(false);
        isPendingAcceptRef.current = false;
        return false;
      }

      // Check if there's placeholder text in the document
      const hasMark = state.doc.rangeHasMark(validFrom, validTo, schema.marks.placeholder);

      if (hasMark && dispatch) {
        let tr = state.tr.removeMark(validFrom, validTo, schema.marks.placeholder);
        // Use the transaction's document to create the selection
        const safeSelectionPos = Math.min(validTo, tr.doc.content.size);
        tr = tr.setSelection(TextSelection.create(tr.doc, safeSelectionPos));
        dispatch(tr);
        placeholderRangeRef.current = null; // Clear the reference
        setIsPendingAccept(false); // Clear pending state
        isPendingAcceptRef.current = false;
        // After accepting placeholder text, convert any markdown links and headers
        if (editorViewRef.current) {
          const convertTr = convertMarkdownLinksInDocument(editorViewRef.current.state);
          if (convertTr) {
            editorViewRef.current.dispatch(convertTr);
          }
          const convertHeadersTr = convertMarkdownHeadersInDocument(editorViewRef.current.state);
          if (convertHeadersTr) {
            editorViewRef.current.dispatch(convertHeadersTr);
          }
        }
        return true;
      }

      // If no placeholder handling occurred, still attempt markdown link and header conversion on Tab
      if (editorViewRef.current) {
        const convertTr = convertMarkdownLinksInDocument(editorViewRef.current.state);
        if (convertTr) {
          editorViewRef.current.dispatch(convertTr);
        }
        const convertHeadersTr = convertMarkdownHeadersInDocument(editorViewRef.current.state);
        if (convertHeadersTr) {
          editorViewRef.current.dispatch(convertHeadersTr);
        }
        if (convertTr || convertHeadersTr) {
          return true;
        }
      }

      return false;
    };

    // Plugin to validate placeholder range on every document change
    const placeholderValidationPlugin = new Plugin({
      key: new PluginKey("placeholderValidation"),
      appendTransaction(transactions, oldState, newState) {
        const placeholderRange = placeholderRangeRef.current;
        if (!placeholderRange) return null;

        const { from, to } = placeholderRange;
        const docSize = newState.doc.content.size;

        // Check if the range is now invalid
        if (from < 0 || to > docSize || from >= to) {
          console.warn("Clearing invalid placeholder range", { from, to, docSize });
          placeholderRangeRef.current = null;
          setIsPendingAccept(false);
          isPendingAcceptRef.current = false;
        }

        return null; // Don't modify the transaction
      },
    });

    // Plugin to add placeholder class to empty paragraphs
    const placeholderClassPlugin = new Plugin({
      key: new PluginKey("placeholderClass"),
      state: {
        init() {
          return DecorationSet.empty;
        },
        apply(tr, set) {
          return set.map(tr.mapping, tr.doc);
        },
      },
      props: {
        decorations(state) {
          const doc = state.doc;
          const decorations: Decoration[] = [];

          // Check if document is effectively empty (only one paragraph with no content)
          if (doc.childCount === 1) {
            const firstChild = doc.firstChild;
            if (
              firstChild &&
              firstChild.type.name === "paragraph" &&
              firstChild.content.size === 0
            ) {
              // Add a node decoration with the class
              decorations.push(
                Decoration.node(0, firstChild.nodeSize, {
                  class: "is-editor-empty",
                })
              );
            }
          }

          return decorations.length > 0
            ? DecorationSet.create(doc, decorations)
            : DecorationSet.empty;
        },
      },
    });

    // Plugin to handle autocomplete-like behavior for placeholder text
    const placeholderInputPlugin = new Plugin({
      key: new PluginKey("placeholderInput"),
      props: {
        handleTextInput(view, from, to, text) {
          const placeholderRange = placeholderRangeRef.current;
          if (!placeholderRange) return false;

          const { from: placeholderFrom, to: placeholderTo } = placeholderRange;

          // Validate and clamp placeholder range to document bounds
          const docSize = view.state.doc.content.size;
          const validFrom = Math.max(0, Math.min(placeholderFrom, docSize));
          const validTo = Math.max(validFrom, Math.min(placeholderTo, docSize));

          if (validFrom >= validTo || validFrom < 0 || validTo > docSize) {
            // Invalid range, clear it
            placeholderRangeRef.current = null;
            setIsPendingAccept(false);
            isPendingAcceptRef.current = false;
            return false;
          }

          // Check if we're at the start or within the placeholder
          if (from >= validFrom && from <= validTo) {
            // Get the placeholder text (using validated positions)
            const placeholderText = view.state.doc.textBetween(validFrom, validTo);

            // Get the position within the placeholder text
            const posInPlaceholder = from - validFrom;
            const expectedChar = placeholderText[posInPlaceholder];

            // If we're beyond the placeholder text length, delete it
            if (expectedChar === undefined) {
              const tr = view.state.tr.delete(validFrom, validTo);
              view.dispatch(tr);
              placeholderRangeRef.current = null;
              setIsPendingAccept(false);
              isPendingAcceptRef.current = false;
              return false;
            }

            // Normalize spaces: treat regular space (32) and non-breaking space (160) as equal
            const normalizeChar = (char: string) => {
              const code = char.charCodeAt(0);
              // Convert non-breaking space (160) to regular space (32)
              if (code === 160) return " ";
              return char;
            };

            const normalizedText = normalizeChar(text);
            const normalizedExpected = normalizeChar(expectedChar);

            if (normalizedText === normalizedExpected) {
              // Character matches! Remove placeholder mark from just this character
              const tr = view.state.tr.removeMark(from, from + 1, schema.marks.placeholder);
              // Move cursor forward
              const nextPos = Math.min(from + 1, tr.doc.content.size);
              tr.setSelection(TextSelection.create(tr.doc, nextPos));
              view.dispatch(tr);

              // Update the placeholder range to reflect the new start position
              placeholderRangeRef.current = {
                from: from + 1,
                to: validTo,
              };

              // If we've accepted the whole text, clear the reference and pending state
              if (from + 1 >= validTo) {
                placeholderRangeRef.current = null;
                setIsPendingAccept(false);
                isPendingAcceptRef.current = false;
              }

              return true;
            } else {
              // Character doesn't match! Delete the entire placeholder
              const tr = view.state.tr.delete(validFrom, validTo);
              view.dispatch(tr);
              placeholderRangeRef.current = null;
              setIsPendingAccept(false); // Clear pending state
              isPendingAcceptRef.current = false;

              // Let the typed character be inserted normally by returning false
              return false;
            }
          }

          return false;
        },
      },
    });

    // Plugin to handle Ctrl key to trigger the same behavior as Tab
    const ctrlKeyPlugin = new Plugin({
      key: new PluginKey("ctrlKeyHandler"),
      props: {
        handleKeyDown(view, event) {
          if (
            event.key === "Control" &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            // Reuse Tab handler logic
            return handleTab(view.state, (tr: Transaction) => view.dispatch(tr));
          }
          return false;
        },
      },
    });

    // Create initial editor state
    let doc;
    if (initialDoc) {
      try {
        // Parse the initial document from JSON if provided
        doc = schema.nodeFromJSON(initialDoc);
      } catch (error) {
        console.error("Failed to parse initial document, using default:", error);
        doc = schema.node("doc", null, [schema.node("paragraph")]);
      }
    } else {
      doc = schema.node("doc", null, [schema.node("paragraph")]);
    }

    const state = EditorState.create({
      doc,
      plugins: [
        buildInputRules(), // Add markdown input rules (must be early in plugin order)
        placeholderValidationPlugin, // Validate placeholder range on document changes
        placeholderClassPlugin, // Add placeholder class to empty paragraphs
        placeholderInputPlugin, // Add placeholder input handler
        ctrlKeyPlugin, // Handle Ctrl key as action trigger
        filePageLinkPlugin({
          scrollToPageRef,
          isRightOpen,
          openRight,
          setLeftSidebarOpen,
          setActiveView,
          selectFile,
          currentFileId
        }), // Custom file page link rendering
        buildKeymap(),
        keymap({
          ...baseKeymap,
          Tab: handleTab, // Add Tab handler
        }),
        dropCursor(),
        gapCursor(),
        history(),
        commentPlugin,
        commentUI((transaction: Transaction) => {
          if (view) {
            const newState = view.state.apply(transaction);
            view.updateState(newState);

            // Broadcast change to Realtime
            if (channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "editor-change",
                payload: {
                  doc: newState.doc.toJSON(),
                  noteName,
                  timestamp: Date.now(),
                },
              });
            }
          }
        }),
      ],
    });

    // Helper function to get cursor position and line number
    const getCursorInfo = (state: EditorState) => {
      const { from } = state.selection;
      let currentLineNumber = 0;
      let cursorLineNumber = 0;
      let isAtEndOfLine = false;
      let cursorPositionInLine = 0;
      let found = false;

      state.doc.descendants((node, pos) => {
        if (found) return false; // Stop if already found

        if (node.type.name === "paragraph") {
          currentLineNumber++;
          const paragraphStart = pos + 1; // +1 to skip opening tag
          const paragraphEnd = pos + node.nodeSize - 1; // -1 to exclude closing tag

          // Check if cursor is within this paragraph
          if (from >= paragraphStart && from <= paragraphEnd) {
            cursorLineNumber = currentLineNumber;
            // Check if cursor is at the end of this paragraph
            isAtEndOfLine = from === paragraphEnd;
            // Calculate position within this line
            cursorPositionInLine = from - paragraphStart;
            found = true;
            return false; // stop descending into children
          }
        }
      });

      return {
        cursorPosition: from,
        lineNumber: cursorLineNumber,
        isAtEndOfLine,
        cursorPositionInLine,
      };
    };

    // Helper function to convert doc to markdown
    const docToMarkdown = (state: EditorState): string => {
      let markdown = "";

      state.doc.descendants((node) => {
        if (node.type.name === "paragraph") {
          markdown += node.textContent + "\n";
        } else if (node.type.name === "heading") {
          const level = node.attrs.level || 1;
          markdown += "#".repeat(level) + " " + node.textContent + "\n";
        } else if (node.type.name === "code_block") {
          markdown += "```\n" + node.textContent + "\n```\n";
        } else if (node.type.name === "blockquote") {
          markdown += "> " + node.textContent + "\n";
        }
      });

      return markdown.trim();
    };

    // Create editor view
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);

        // Mark that we have unsaved changes
        if (transaction.docChanged) {
          hasUnsavedChanges.current = true;

          // Auto-convert markdown links after typing stops
          const currentContent = newState.doc.textContent;
          const contentChanged = currentContent !== lastDocContentRef.current;

          if (contentChanged && currentContent.length > 5) {
            // Clear previous timer
            if (autoConvertTimerRef.current) {
              clearTimeout(autoConvertTimerRef.current);
            }

            // Set new timer to convert links and headers after 1 second of no typing
            autoConvertTimerRef.current = setTimeout(() => {
              if (view && !view.isDestroyed) {
                console.log("⏰ Auto-converting markdown links and headers...");
                const tr = convertMarkdownLinksInDocument(view.state);
                if (tr) {
                  view.dispatch(tr);
                  console.log("✅ Auto-conversion of links completed");
                }
                const headersTr = convertMarkdownHeadersInDocument(view.state);
                if (headersTr) {
                  view.dispatch(headersTr);
                  console.log("✅ Auto-conversion of headers completed");
                }
              }
            }, 1000); // 1 second delay

            lastDocContentRef.current = currentContent;
          }
        }

        // Broadcast changes to Realtime if there are doc changes and not pending accept
        if (transaction.docChanged && channelRef.current && !isPendingAcceptRef.current) {
          const cursorInfo = getCursorInfo(newState);
          const markdown = docToMarkdown(newState);

          console.log("broadcasting editor change", {
            cursorInfo,
            markdown,
            cursorCurrentLine: cursorInfo.lineNumber,
            cursorPositionAtCurrentLine: cursorInfo.cursorPositionInLine,
            isAtEndOfLine: cursorInfo.isAtEndOfLine,
            cursorPosition: cursorInfo.cursorPosition,
            lineNumber: cursorInfo.lineNumber,
            isAtEndOfLine: cursorInfo.isAtEndOfLine,
            cursorCurrentLine: cursorInfo.lineNumber,
            cursorPositionAtCurrentLine: cursorInfo.cursorPositionInLine,
            timestamp: Date.now(),
          });
          channelRef.current.send({
            type: "broadcast",
            event: "editor-change",
            payload: {
              doc: newState.doc.toJSON(),
              markdown,
              noteName,
              cursorPosition: cursorInfo.cursorPosition,
              lineNumber: cursorInfo.lineNumber,
              isAtEndOfLine: cursorInfo.isAtEndOfLine,
              cursorCurrentLine: cursorInfo.lineNumber,
              cursorPositionAtCurrentLine: cursorInfo.cursorPositionInLine,
              timestamp: Date.now(),
            },
          });
        }
      },
    });

    setEditorView(view);
    editorViewRef.current = view;

    // Setup Realtime channel
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "editor-update" }, (payload) => {
        console.log("Received editor update from server:", payload);
        // Handle incoming updates if needed
        // For single-user editing, this might just be a confirmation
      })
      .on("broadcast", { event: "insert-text" }, (payload) => {
        console.log("Received insert-text command from server:", payload);

        // Only process if there's no pending insertion
        if (isPendingAcceptRef.current) {
          console.log("Ignoring insert-text: already pending accept");
          return;
        }

        const { lineNumber, cursorPosition, text } = payload.payload;
        if (lineNumber && typeof lineNumber === "number") {
          console.log("insert text at paragraph", lineNumber, cursorPosition, text);
          insertTextAtParagraph(
            lineNumber,
            cursorPosition !== undefined ? cursorPosition : undefined,
            text || `Text inserted at line ${lineNumber}!`
          );
        }
      })
      .subscribe((status) => {
        console.log(`Channel ${channelName} status:`, status);
        if (status === "SUBSCRIBED") {
          reportRef.current.success();
        } else if (status === "CHANNEL_ERROR") {
          reportRef.current.failure(new Error("Channel connection failed"));
        }
      });

    channelRef.current = channel;
    
    // Register insert function with global editor store
    setInsertTextFunction(insertTextAtParagraph, docId);

    return () => {
      // Clean up auto-convert timer
      if (autoConvertTimerRef.current) {
        clearTimeout(autoConvertTimerRef.current);
        autoConvertTimerRef.current = null;
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Unregister insert function from global editor store
      setInsertTextFunction(null, null);
      
      if (view) {
        view.destroy();
      }
      editorViewRef.current = null;
    };
  }, [
    isHealthy,
    channelName,
    docId,
    noteName,
    insertTextAtParagraph,
    placeholderRangeRef,
    setIsPendingAccept,
    isPendingAcceptRef,
    scrollToPageRef,
    isRightOpen,
    openRight,
    setLeftSidebarOpen,
    setActiveView,
    selectFile,
    setInsertTextFunction,
  ]);

  // Auto-save effect - saves content every 5 seconds if there are changes
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges.current && editorViewRef.current) {
        const currentDoc = editorViewRef.current.state.doc.toJSON();

        console.log("Auto-saving document...");
        updateNote.mutate(
          {
            id: docId,
            data: { content: currentDoc },
          },
          {
            onSuccess: () => {
              hasUnsavedChanges.current = false;
              console.log("Document auto-saved successfully");
            },
            onError: (error) => {
              console.error("Auto-save failed:", error);
            },
          }
        );
      }
    }, 5000); // 5 seconds

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [docId, updateNote]);

  // Handler to convert markdown links
  // const handleConvertLinks = () => {
  //   if (!editorViewRef.current) return;

  //   const tr = convertMarkdownLinksInDocument(editorViewRef.current.state);
  //   if (tr) {
  //     editorViewRef.current.dispatch(tr);
  //     console.log("✅ Markdown links converted!");
  //   } else {
  //     console.log("ℹ️ No markdown links found to convert");
  //   }
  // };

  return (
    <div className="collab-editor-container relative h-[calc(100vh-50px)] flex flex-col overflow-hidden">
      <FloatingMenu view={editorView} />
      <div className="editor-info flex-shrink-0 p-2 border-b border-gray-200 flex items-center gap-2">
        <EditorTestControls
          editorView={editorView}
          isPendingAccept={isPendingAccept}
          insertTextAtParagraph={insertTextAtParagraph}
        />
      </div>
      <div
        ref={editorRef}
        className="editor-content prose max-w-none flex-1 flex flex-col min-h-0"
      />
    </div>
  );
}
