"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorState, Transaction, TextSelection, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
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
import "./CollabEditor.css";

interface CollabEditorProps {
  docId: string;
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
  edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/collab-session`
    : "http://localhost:54321/functions/v1/collab-session",
  initialDoc
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
        return true;
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
          console.warn('Clearing invalid placeholder range', { from, to, docSize });
          placeholderRangeRef.current = null;
          setIsPendingAccept(false);
          isPendingAcceptRef.current = false;
        }
        
        return null; // Don't modify the transaction
      }
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
              if (code === 160) return ' ';
              return char;
            };

            const normalizedText = normalizeChar(text);
            const normalizedExpected = normalizeChar(expectedChar);

            if (normalizedText === normalizedExpected) {
              // Character matches! Remove placeholder mark from just this character
              const tr = view.state.tr.removeMark(
                from,
                from + 1,
                schema.marks.placeholder
              );
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

    // Create initial editor state
    let doc;
    if (initialDoc) {
      try {
        // Parse the initial document from JSON if provided
        doc = schema.nodeFromJSON(initialDoc);
      } catch (error) {
        console.error("Failed to parse initial document, using default:", error);
        doc = schema.node("doc", null, [
          schema.node("paragraph", null, [
            schema.text("Hey there, start editing your document..."),
          ]),
        ]);
      }
    } else {
      doc = schema.node("doc", null, [
        schema.node("paragraph", null, [
          schema.text("Hey there, start editing your document..."),
        ]),
      ]);
    }

    const state = EditorState.create({
      doc,
        plugins: [
          buildInputRules(), // Add markdown input rules (must be early in plugin order)
          placeholderValidationPlugin, // Validate placeholder range on document changes
          placeholderInputPlugin, // Add placeholder input handler
          buildKeymap(),
          keymap({
            ...baseKeymap,
            "Tab": handleTab, // Add Tab handler
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
        
        if (node.type.name === 'paragraph') {
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
      let markdown = '';
      
      state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          markdown += node.textContent + '\n';
        } else if (node.type.name === 'heading') {
          const level = node.attrs.level || 1;
          markdown += '#'.repeat(level) + ' ' + node.textContent + '\n';
        } else if (node.type.name === 'code_block') {
          markdown += '```\n' + node.textContent + '\n```\n';
        } else if (node.type.name === 'blockquote') {
          markdown += '> ' + node.textContent + '\n';
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
        }
        
        // Broadcast changes to Realtime if there are doc changes and not pending accept
        if (transaction.docChanged && channelRef.current && !isPendingAcceptRef.current) {
          const cursorInfo = getCursorInfo(newState);
          const markdown = docToMarkdown(newState);

          console.log('broadcasting editor change', {
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
        if (lineNumber && typeof lineNumber === 'number') {
          console.log('insert text at paragraph', lineNumber, cursorPosition, text);
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

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (view) {
        view.destroy();
      }
      editorViewRef.current = null;
    };
  }, [isHealthy, channelName, docId, insertTextAtParagraph, placeholderRangeRef, setIsPendingAccept, isPendingAcceptRef]);

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

  return (
    <div className="collab-editor-container relative h-[calc(100vh-50px)] flex flex-col overflow-hidden">
      <FloatingMenu view={editorView} />
      <div className="editor-info flex-shrink-0">
        <EditorTestControls 
          editorView={editorView}
          isPendingAccept={isPendingAccept}
          insertTextAtParagraph={insertTextAtParagraph}
        />
      </div>
      <div ref={editorRef} className="editor-content prose max-w-none flex-1 flex flex-col min-h-0" />
    </div>
  );
}

