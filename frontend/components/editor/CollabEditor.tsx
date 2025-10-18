"use client";

import React, { useEffect, useRef, useState } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Step } from "prosemirror-transform";
import { history } from "prosemirror-history";
import { collab, receiveTransaction, sendableSteps, getVersion } from "prosemirror-collab";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { menuBar } from "prosemirror-menu";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { schema } from "@/lib/collab/schema";
import { GET, POST } from "@/lib/collab/http";
import { Reporter } from "@/lib/collab/reporter";
import { commentPlugin, commentUI } from "@/lib/collab/comment";
import { getFullMenu } from "@/lib/collab/menu";
import { buildKeymap } from "@/lib/collab/keymap";
import { FloatingMenu } from "./FloatingMenu";

interface CollabEditorProps {
  docId: string;
  apiUrl?: string;
}

function badVersion(err: Error & { status?: number }): boolean {
  return err.status === 400 && /invalid version/i.test(err.toString());
}

class State {
  edit: EditorState | null;
  comm: string;

  constructor(edit: EditorState | null, comm: string) {
    this.edit = edit;
    this.comm = comm;
  }
}

function repeat<T>(val: T, n: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) result.push(val);
  return result;
}

function userString(n: number): string {
  return "(" + n + " user" + (n === 1 ? "" : "s") + ")";
}

interface DispatchAction {
  type: string;
  doc?: unknown;
  version?: number;
  users?: number;
  comments?: { version: number; comments: unknown[] };
  error?: Error;
  transaction?: Transaction;
  requestDone?: boolean;
}

class EditorConnection {
  report: Reporter;
  url: string;
  state: State;
  request: (Promise<string> & { abort?: () => void }) | null;
  backOff: number;
  view: EditorView | null;
  onUpdateUsers?: (users: number) => void;

  constructor(report: Reporter, url: string, onUpdateUsers?: (users: number) => void) {
    this.report = report;
    this.url = url;
    this.state = new State(null, "start");
    this.request = null;
    this.backOff = 0;
    this.view = null;
    this.onUpdateUsers = onUpdateUsers;
    this.dispatch = this.dispatch.bind(this);
    this.start();
  }

  dispatch(action: DispatchAction) {
    let newEditState: EditorState | null = null;
    if (action.type === "loaded") {
      if (this.onUpdateUsers && action.users !== undefined) this.onUpdateUsers(action.users);
      // Create editor state with comments config for plugin initialization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editState = EditorState.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc: action.doc as any,
        plugins: [
          buildKeymap(),
          keymap(baseKeymap),
          dropCursor(),
          gapCursor(),
          menuBar({ floating: false, content: getFullMenu() }),
          history(),
          collab({ version: action.version || 0 }),
          commentPlugin,
          commentUI((transaction: Transaction) => this.dispatch({ type: "transaction", transaction })),
        ],
        comments: action.comments,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      this.state = new State(editState, "poll");
      this.poll();
    } else if (action.type === "restart") {
      this.state = new State(null, "start");
      this.start();
    } else if (action.type === "poll") {
      this.state = new State(this.state.edit, "poll");
      this.poll();
    } else if (action.type === "recover") {
      if (action.error && (action.error as Error & { status?: number }).status && (action.error as Error & { status?: number }).status! < 500) {
        this.report.failure(action.error);
        this.state = new State(null, "");
      } else {
        this.state = new State(this.state.edit, "recover");
        if (action.error) this.recover(action.error);
      }
    } else if (action.type === "transaction" && action.transaction) {
      newEditState = this.state.edit!.apply(action.transaction);
    }

    if (newEditState) {
      let sendable;
      if (newEditState.doc.content.size > 40000) {
        if (this.state.comm !== "detached") this.report.failure("Document too big. Detached.");
        this.state = new State(newEditState, "detached");
      } else if (
        (this.state.comm === "poll" || action.requestDone) &&
        (sendable = this.sendable(newEditState))
      ) {
        this.closeRequest();
        this.state = new State(newEditState, "send");
        this.send(newEditState, sendable);
      } else if (action.requestDone) {
        this.state = new State(newEditState, "poll");
        this.poll();
      } else {
        this.state = new State(newEditState, this.state.comm);
      }
    }

    // Sync the editor with this.state.edit
    if (this.state.edit) {
      if (this.view) {
        this.view.updateState(this.state.edit);
      }
    }
  }

  start() {
    this.run(GET(this.url)).then(
      (data: string) => {
        const parsed = JSON.parse(data);
        this.report.success();
        this.backOff = 0;
        this.dispatch({
          type: "loaded",
          doc: schema.nodeFromJSON(parsed.doc),
          version: parsed.version,
          users: parsed.users,
          comments: { version: parsed.commentVersion, comments: parsed.comments },
        });
      },
      (err: Error) => {
        this.report.failure(err);
      }
    );
  }

  poll() {
    const query =
      "version=" +
      getVersion(this.state.edit!) +
      "&commentVersion=" +
      (commentPlugin.getState(this.state.edit!) as { version: number }).version;
    this.run(GET(this.url + "/events?" + query)).then(
      (data: string) => {
        this.report.success();
        const parsed = JSON.parse(data);
        this.backOff = 0;
        if (parsed.steps && (parsed.steps.length || parsed.comment.length)) {
          const tr = receiveTransaction(
            this.state.edit!,
            parsed.steps.map((j: unknown) => Step.fromJSON(schema, j)),
            parsed.clientIDs
          );
          tr.setMeta(commentPlugin, {
            type: "receive",
            version: parsed.commentVersion,
            events: parsed.comment,
            sent: 0,
          });
          this.dispatch({ type: "transaction", transaction: tr, requestDone: true });
        } else {
          this.poll();
        }
        if (this.onUpdateUsers) this.onUpdateUsers(parsed.users);
      },
      (err: Error & { status?: number }) => {
        if (err.status === 410 || badVersion(err)) {
          this.report.failure(err);
          this.dispatch({ type: "restart" });
        } else if (err) {
          this.dispatch({ type: "recover", error: err });
        }
      }
    );
  }

  sendable(editState: EditorState) {
    const steps = sendableSteps(editState);
    const comments = (commentPlugin.getState(editState) as { unsentEvents: () => unknown[] }).unsentEvents();
    if (steps || comments.length) return { steps, comments };
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(editState: EditorState, { steps, comments }: { steps: any; comments: unknown[] }) {
    const json = JSON.stringify({
      version: getVersion(editState),
      steps: steps ? steps.steps.map((s: Step) => s.toJSON()) : [],
      clientID: steps ? steps.clientID : 0,
      comment: comments || [],
    });
    this.run(POST(this.url + "/events", json, "application/json")).then(
      (data: string) => {
        this.report.success();
        this.backOff = 0;
        const tr = steps
          ? receiveTransaction(
              this.state.edit!,
              steps.steps,
              repeat(steps.clientID, steps.steps.length)
            )
          : this.state.edit!.tr;
        tr.setMeta(commentPlugin, {
          type: "receive",
          version: JSON.parse(data).commentVersion,
          events: [],
          sent: comments.length,
        });
        this.dispatch({ type: "transaction", transaction: tr, requestDone: true });
      },
      (err: Error & { status?: number }) => {
        if (err.status === 409) {
          this.backOff = 0;
          this.dispatch({ type: "poll" });
        } else if (badVersion(err)) {
          this.report.failure(err);
          this.dispatch({ type: "restart" });
        } else {
          this.dispatch({ type: "recover", error: err });
        }
      }
    );
  }

  recover(err: Error) {
    const newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200;
    if (newBackOff > 1000 && this.backOff < 1000) this.report.delay(err);
    this.backOff = newBackOff;
    setTimeout(() => {
      if (this.state.comm === "recover") this.dispatch({ type: "poll" });
    }, this.backOff);
  }

  closeRequest() {
    if (this.request && this.request.abort) {
      this.request.abort();
      this.request = null;
    }
  }

  run(request: Promise<string> & { abort?: () => void }) {
    return (this.request = request);
  }

  close() {
    this.closeRequest();
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  setView(view: EditorView | null, container?: HTMLElement) {
    if (this.view) this.view.destroy();
    this.view = view;
    if (view && container) {
      container.innerHTML = "";
      container.appendChild(view.dom);
    }
  }
}

export default function CollabEditor({ docId, apiUrl = "http://localhost:8080" }: CollabEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<EditorConnection | null>(null);
  const [users, setUsers] = useState<number>(0);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const report = new Reporter();
    const url = `${apiUrl}/api/collab/docs/${docId}`;
    const connection = new EditorConnection(report, url, (count) => setUsers(count));
    connectionRef.current = connection;

    // Wait for the editor state to be loaded
    const checkViewInterval = setInterval(() => {
      if (connection.state.edit && !connection.view) {
        const view = new EditorView(editorRef.current!, {
          state: connection.state.edit,
          dispatchTransaction: (transaction: Transaction) =>
            connection.dispatch({ type: "transaction", transaction }),
        });
        connection.setView(view, editorRef.current!);
        setEditorView(view);
        clearInterval(checkViewInterval);
      }
    }, 100);

    return () => {
      clearInterval(checkViewInterval);
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    };
  }, [docId, apiUrl]);

  return (
    <div className="collab-editor-container relative h-[calc(100vh-50px)] flex flex-col overflow-hidden">
      <FloatingMenu view={editorView} />
      <div className="editor-info flex-shrink-0">
        <h2 className="text-xl font-semibold mb-2">{docId}</h2>
        <div className="text-sm text-gray-600">{userString(users)}</div>
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

