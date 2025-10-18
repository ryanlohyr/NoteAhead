"use client";

import React, { useState } from "react";
import type { EditorView } from "prosemirror-view";

interface EditorTestControlsProps {
  editorView: EditorView | null;
  isPendingAccept: boolean;
  insertTextAtParagraph: (
    lineNumber: number,
    cursorPosition: number | undefined,
    text: string
  ) => void;
}

export function EditorTestControls({
  editorView,
  isPendingAccept,
  insertTextAtParagraph,
}: EditorTestControlsProps) {
  const [testLineNumber, setTestLineNumber] = useState<string>("1");
  const [testCursorPosition, setTestCursorPosition] = useState<string>("0");
  const [testText, setTestText] = useState<string>("Hello world");

  // Only render in test mode
  if (process.env.NEXT_PUBLIC_IS_TEST !== "true") {
    return null;
  }

  return (
    <>
      {" "}
      <div className="text-sm text-gray-600 mb-2">
        <div>
          {isHealthy ? "Connected" : "Connecting..."}
          {channelName && <span className="ml-2 text-xs text-gray-400">• {channelName}</span>}
          {isPendingAccept && (
            <span className="ml-2 text-xs text-orange-500 font-medium">
              • Pending Accept (Tab to accept all)
            </span>
          )}
          
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <input
          type="number"
          value={testLineNumber}
          onChange={(e) => setTestLineNumber(e.target.value)}
          placeholder="Line #"
          className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
        />
        <input
          type="number"
          value={testCursorPosition}
          onChange={(e) => setTestCursorPosition(e.target.value)}
          placeholder="Cursor Pos"
          className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
        />
        <input
          type="text"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Text to insert"
          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const lineNum = parseInt(testLineNumber) || 1;
            const cursorPos = testCursorPosition === "" ? undefined : parseInt(testCursorPosition);
            insertTextAtParagraph(lineNum, cursorPos, testText);
          }}
          disabled={!editorView || isPendingAccept}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Insert Text
        </button>
      </div>
    </>
  );
}
