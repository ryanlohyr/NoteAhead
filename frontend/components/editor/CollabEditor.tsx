"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorState, Transaction, TextSelection, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history } from "prosemirror-history";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { menuBar } from "prosemirror-menu";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { schema } from "@/lib/collab/schema";
import { Reporter } from "@/lib/collab/reporter";
import { commentPlugin, commentUI } from "@/lib/collab/comment";
import { getFullMenu } from "@/lib/collab/menu";
import { buildKeymap } from "@/lib/collab/keymap";
import { FloatingMenu } from "./FloatingMenu";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface CollabEditorProps {
  docId: string;
  edgeFunctionUrl?: string;
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
    : "http://localhost:54321/functions/v1/collab-session"
}: CollabEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [channelName, setChannelName] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reportRef = useRef<Reporter>(new Reporter());
  const placeholderRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [isPendingAccept, setIsPendingAccept] = useState<boolean>(false);

  // Function to insert text at the 6th paragraph
  const insertTextAtParagraph6 = () => {
    if (!editorView) return;

    let targetPos = 0;
    let paragraphCount = 0;
    let lastParagraphPos = 0;
    
    // Count paragraphs and track positions
    editorView.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        paragraphCount++;
        lastParagraphPos = pos + node.nodeSize;
        if (paragraphCount === 6) {
          targetPos = pos + node.nodeSize;
          return false; // stop iterating
        }
      }
    });
    
    let transaction = editorView.state.tr;
    
    // If we have fewer than 6 paragraphs, create the missing ones
    if (paragraphCount < 6) {
      const paragraphsNeeded = 6 - paragraphCount;
      const insertPos = lastParagraphPos || editorView.state.doc.content.size;
      
      // Create empty paragraphs
      for (let i = 0; i < paragraphsNeeded; i++) {
        const emptyParagraph = schema.node('paragraph');
        transaction = transaction.insert(insertPos + (i * 2), emptyParagraph);
      }
      
      // Calculate position of the 6th paragraph after insertion
      // Each paragraph node takes 2 positions (opening + closing)
      targetPos = insertPos + (paragraphsNeeded * 2) - 1;
    }
    
    // Insert the text with placeholder mark at the 6th paragraph
    const textToInsert = "Text inserted at paragraph 6!";
    const placeholderMark = schema.marks.placeholder.create();
    
    transaction = transaction.insert(
      targetPos,
      schema.text(textToInsert, [placeholderMark])
    );
    
    // Store the range of the placeholder text
    placeholderRangeRef.current = {
      from: targetPos,
      to: targetPos + textToInsert.length,
    };
    
    // Set pending accept state to true
    setIsPendingAccept(true);
    
    editorView.dispatch(transaction);
  };

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
      
      // Check if there's placeholder text in the document
      const hasMark = state.doc.rangeHasMark(from, to, schema.marks.placeholder);
      
      if (hasMark && dispatch) {
        let tr = state.tr.removeMark(from, to, schema.marks.placeholder);
        // Use the transaction's document to create the selection
        tr = tr.setSelection(TextSelection.create(tr.doc, to));
        dispatch(tr);
        placeholderRangeRef.current = null; // Clear the reference
        setIsPendingAccept(false); // Clear pending state
        return true;
      }
      
      return false;
    };

    // Plugin to handle autocomplete-like behavior for placeholder text
    const placeholderInputPlugin = new Plugin({
      key: new PluginKey("placeholderInput"),
      props: {
        handleTextInput(view, from, to, text) {
          const placeholderRange = placeholderRangeRef.current;
          if (!placeholderRange) return false;

          const { from: placeholderFrom, to: placeholderTo } = placeholderRange;

          // Check if we're at the start or within the placeholder
          if (from >= placeholderFrom && from <= placeholderTo) {
            // Get the placeholder text
            const placeholderText = view.state.doc.textBetween(placeholderFrom, placeholderTo);
            
            // Get the position within the placeholder text
            const posInPlaceholder = from - placeholderFrom;
            const expectedChar = placeholderText[posInPlaceholder];

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
              tr.setSelection(TextSelection.create(tr.doc, from + 1));
              view.dispatch(tr);
              
              // Update the placeholder range to reflect the new start position
              placeholderRangeRef.current = {
                from: from + 1,
                to: placeholderTo,
              };
              
              // If we've accepted the whole text, clear the reference and pending state
              if (from + 1 >= placeholderTo) {
                placeholderRangeRef.current = null;
                setIsPendingAccept(false);
              }
              
              return true;
            } else {
              // Character doesn't match! Delete the entire placeholder
              const tr = view.state.tr.delete(placeholderFrom, placeholderTo);
              view.dispatch(tr);
              placeholderRangeRef.current = null;
              setIsPendingAccept(false); // Clear pending state
              
              // Let the typed character be inserted normally by returning false
              return false;
            }
          }

          return false;
        },
      },
    });

    // Create initial editor state
    const initialDoc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("Start editing your document..."),
      ]),
    ]);

    const state = EditorState.create({
      doc: initialDoc,
        plugins: [
          placeholderInputPlugin, // Add placeholder input handler
          buildKeymap(),
          keymap({
            ...baseKeymap,
            "Tab": handleTab, // Add Tab handler
          }),
          dropCursor(),
          gapCursor(),
          menuBar({ floating: false, content: getFullMenu() }),
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

    // Create editor view
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        
        // Broadcast changes to Realtime if there are doc changes
        if (transaction.docChanged && channelRef.current) {
          console.log("Broadcasting editor change to Realtime");
          console.log(newState.doc.toJSON());

          channelRef.current.send({
            type: "broadcast",
            event: "editor-change",
            payload: {
              doc: newState.doc.toJSON(),
              timestamp: Date.now(),
            },
          });
        }
      },
    });

    setEditorView(view);

    // Setup Realtime channel
    const channel = supabase.channel(channelName);
    
    channel
      .on("broadcast", { event: "editor-update" }, (payload) => {
        console.log("Received editor update from server:", payload);
        // Handle incoming updates if needed
        // For single-user editing, this might just be a confirmation
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
    };
  }, [isHealthy, channelName, docId]);

  return (
    <div className="collab-editor-container relative h-[calc(100vh-50px)] flex flex-col overflow-hidden">
      <FloatingMenu view={editorView} />
      <div className="editor-info flex-shrink-0">
        <h2 className="text-xl font-semibold mb-2">{docId}</h2>
        <div className="text-sm text-gray-600 flex items-center gap-4">
          <div>
            {isHealthy ? "Connected" : "Connecting..."}
            {channelName && <span className="ml-2 text-xs text-gray-400">• {channelName}</span>}
            {isPendingAccept && (
              <span className="ml-2 text-xs text-orange-500 font-medium">
                • Pending Accept (Tab to accept all)
              </span>
            )}
          </div>
          <button
            onClick={insertTextAtParagraph6}
            disabled={!editorView || isPendingAccept}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Insert Text at Line 6
          </button>
        </div>
      </div>
      <div ref={editorRef} className="editor-content prose max-w-none flex-1 flex flex-col min-h-0" />
      <style jsx global>{`
        .editor-content {
          overflow: hidden;
        }

        .editor-content > div {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .ProseMirror {
          flex: 1;
          min-height: 0;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 0 0 4px 4px;
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          overflow-y: auto;
        }

        .ProseMirror-focused {
          border-color: #4a90e2;
        }

        /* Text formatting styles */
        .ProseMirror u {
          text-decoration: underline;
        }

        .ProseMirror s {
          text-decoration: line-through;
        }

        .ProseMirror mark {
          background-color: yellow;
          padding: 0 2px;
        }

        .ProseMirror sub {
          vertical-align: sub;
          font-size: smaller;
        }

        .ProseMirror sup {
          vertical-align: super;
          font-size: smaller;
        }

        .ProseMirror strong {
          font-weight: bold;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror code {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
        }

        .ProseMirror .placeholder-text {
          color: #999;
          opacity: 0.7;
        }

        .ProseMirror pre {
          background-color: #f5f5f5;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
        }

        .ProseMirror blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1rem;
          margin-left: 0;
          color: #666;
        }

        .comment {
          background-color: #fffacd;
          border-bottom: 2px solid #ffd700;
        }

        .tooltip-wrapper {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 0.5rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }

        .commentList {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .commentText {
          padding: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .commentDelete {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          margin-left: 0.5rem;
        }

        .commentDelete:hover {
          background: #cc0000;
        }

        .ProseMirror-report {
          position: fixed;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          z-index: 10000;
        }

        .ProseMirror-report-fail {
          background-color: #ff4444;
          color: white;
        }

        .ProseMirror-report-delay {
          background-color: #ffa500;
          color: white;
        }

        /* Enhanced Menu Bar Styles */
        .ProseMirror-menubar {
          border: 1px solid #ddd;
          border-bottom: none;
          border-radius: 4px 4px 0 0;
          padding: 0.5rem;
          background: linear-gradient(to bottom, #ffffff, #f9f9f9);
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .ProseMirror-menubar .ProseMirror-menuitem {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          border: 1px solid transparent;
          border-radius: 4px;
          background: white;
          transition: all 0.2s;
          font-size: 14px;
        }

        .ProseMirror-menubar .ProseMirror-menuitem:hover:not([disabled]) {
          background: #e9ecef;
          border-color: #ddd;
        }

        .ProseMirror-menubar .ProseMirror-menuitem.ProseMirror-menu-active {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .ProseMirror-menubar .ProseMirror-menuitem[disabled] {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Custom styling for menu item labels */
        .menu-item-bold { font-weight: bold; }
        .menu-item-italic { font-style: italic; }
        .menu-item-underline { text-decoration: underline; }
        .menu-item-strikethrough { text-decoration: line-through; }
        .menu-item-highlight { background: yellow; }
        .menu-item-code { font-family: monospace; }
        .menu-item-code-block { font-family: monospace; }
        .menu-item-heading-1 { font-weight: bold; font-size: 16px; }
        .menu-item-heading-2 { font-weight: bold; font-size: 14px; }
        .menu-item-heading-3 { font-weight: bold; font-size: 12px; }
        .menu-item-blockquote { font-size: 18px; }
        .menu-item-undo { font-size: 18px; }
        .menu-item-redo { font-size: 18px; }

        /* Dropdown and separator */
        .ProseMirror-menuseparator {
          border-left: 1px solid #ddd;
          margin: 0 0.25rem;
        }

        /* Gap cursor */
        .ProseMirror-gapcursor {
          display: none;
          pointer-events: none;
          position: absolute;
        }

        .ProseMirror-gapcursor:after {
          content: "";
          display: block;
          position: absolute;
          top: -2px;
          width: 20px;
          border-top: 1px solid black;
          animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
        }

        @keyframes ProseMirror-cursor-blink {
          to {
            visibility: hidden;
          }
        }

        .ProseMirror-focused .ProseMirror-gapcursor {
          display: block;
        }

        /* Drop cursor */
        .ProseMirror-dropcursor {
          position: absolute;
          pointer-events: none;
          border-left: 2px solid #4a90e2;
          height: 1.2em;
        }
      `}</style>
    </div>
  );
}

