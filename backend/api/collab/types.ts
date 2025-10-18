import { Node as PMNode } from "prosemirror-model";
import { Step } from "prosemirror-transform";

export interface Comment {
  from: number;
  to: number;
  text: string;
  id: number;
}

export interface CommentEvent {
  type: "create" | "delete";
  id: number;
  from?: number;
  to?: number;
  text?: string;
}

export interface Instance {
  id: string;
  doc: PMNode;
  version: number;
  steps: Step[];
  lastActive: number;
  users: Record<string, boolean>;
  userCount: number;
  waiting: WaitingClient[];
  comments: Comments;
  collecting: NodeJS.Timeout | null;
}

export interface WaitingClient {
  resp: any;
  inst: Instance;
  ip: string;
  done: boolean;
  finish: () => void;
  abort: () => void;
  send: (output: any) => void;
}

export class Comments {
  comments: Comment[];
  events: CommentEvent[];
  version: number;

  constructor(comments?: Comment[]) {
    this.comments = comments || [];
    this.events = [];
    this.version = 0;
  }

  mapThrough(mapping: any): void {
    for (let i = this.comments.length - 1; i >= 0; i--) {
      const comment = this.comments[i];
      const from = mapping.map(comment.from, 1);
      const to = mapping.map(comment.to, -1);
      if (from >= to) {
        this.comments.splice(i, 1);
      } else {
        comment.from = from;
        comment.to = to;
      }
    }
  }

  created(data: { from: number; to: number; text: string; id: number }): void {
    this.comments.push({ from: data.from, to: data.to, text: data.text, id: data.id });
    this.events.push({ type: "create", id: data.id });
    this.version++;
  }

  index(id: number): number | undefined {
    for (let i = 0; i < this.comments.length; i++) {
      if (this.comments[i].id === id) return i;
    }
    return undefined;
  }

  deleted(id: number): void {
    const found = this.index(id);
    if (found !== undefined) {
      this.comments.splice(found, 1);
      this.version++;
      this.events.push({ type: "delete", id });
    }
  }

  eventsAfter(startIndex: number): CommentEvent[] {
    const result: CommentEvent[] = [];
    for (let i = startIndex; i < this.events.length; i++) {
      const event = this.events[i];
      if (event.type === "delete") {
        result.push(event);
      } else {
        const found = this.index(event.id);
        if (found !== undefined) {
          const comment = this.comments[found];
          result.push({
            type: "create",
            id: event.id,
            text: comment.text,
            from: comment.from,
            to: comment.to,
          });
        }
      }
    }
    return result;
  }

  static fromJSON(comments: Comment[]): Comments {
    return new Comments(comments);
  }
}

export interface DocData {
  doc: any;
  users: number;
  version: number;
  comments: Comment[];
  commentVersion: number;
}

export interface EventData {
  version: number;
  commentVersion: number;
  steps: any[];
  clientIDs: number[];
  comment: CommentEvent[];
  users: number;
}

export interface AddEventRequest {
  version: number;
  steps: any[];
  comment?: CommentEvent[];
  clientID: number;
}

export interface AddEventResponse {
  version: number;
  commentVersion: number;
}

