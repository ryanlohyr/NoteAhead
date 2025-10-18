import { Node as PMNode } from "prosemirror-model";
import { Mapping } from "prosemirror-transform";
import { schema } from "#shared/schema.js";
import { Comments, Instance, WaitingClient, CommentEvent } from "./types";
import { Step } from "prosemirror-transform";

const MAX_STEP_HISTORY = 10000;

class CollabInstance implements Instance {
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

  constructor(id: string, doc?: PMNode, comments?: Comments) {
    this.id = id;
    this.doc =
      doc ||
      schema.node("doc", null, [
        schema.node("paragraph", null, [
          schema.text("This is a collaborative test document. Start editing to make it more interesting!"),
        ]),
      ]);
    this.comments = comments || new Comments();
    this.version = 0;
    this.steps = [];
    this.lastActive = Date.now();
    this.users = Object.create(null);
    this.userCount = 0;
    this.waiting = [];
    this.collecting = null;
  }

  stop(): void {
    if (this.collecting != null) clearTimeout(this.collecting);
  }

  addEvents(version: number, steps: Step[], comments: CommentEvent[] | undefined, clientID: number): false | { version: number; commentVersion: number } {
    this.checkVersion(version);
    if (this.version !== version) return false;
    let doc = this.doc;
    const maps = [];
    for (let i = 0; i < steps.length; i++) {
      (steps[i] as any).clientID = clientID;
      const result = steps[i].apply(doc);
      if (!result.doc) {
        throw new Error("Failed to apply step");
      }
      doc = result.doc;
      maps.push(steps[i].getMap());
    }
    this.doc = doc;
    this.version += steps.length;
    this.steps = this.steps.concat(steps);
    if (this.steps.length > MAX_STEP_HISTORY) {
      this.steps = this.steps.slice(this.steps.length - MAX_STEP_HISTORY);
    }

    this.comments.mapThrough(new Mapping(maps));
    if (comments) {
      for (let i = 0; i < comments.length; i++) {
        const event = comments[i];
        if (event.type === "delete") {
          this.comments.deleted(event.id);
        } else if (event.type === "create" && event.from !== undefined && event.to !== undefined && event.text !== undefined) {
          this.comments.created({ from: event.from, to: event.to, text: event.text, id: event.id });
        }
      }
    }

    this.sendUpdates();
    return { version: this.version, commentVersion: this.comments.version };
  }

  sendUpdates(): void {
    while (this.waiting.length) this.waiting.pop()!.finish();
  }

  checkVersion(version: number): void {
    if (version < 0 || version > this.version) {
      const err = new Error("Invalid version " + version) as any;
      err.status = 400;
      throw err;
    }
  }

  getEvents(version: number, commentVersion: number): false | { steps: Step[]; comment: CommentEvent[]; users: number } {
    this.checkVersion(version);
    const startIndex = this.steps.length - (this.version - version);
    if (startIndex < 0) return false;
    const commentStartIndex = this.comments.events.length - (this.comments.version - commentVersion);
    if (commentStartIndex < 0) return false;

    return {
      steps: this.steps.slice(startIndex),
      comment: this.comments.eventsAfter(commentStartIndex),
      users: this.userCount,
    };
  }

  collectUsers(): void {
    const oldUserCount = this.userCount;
    this.users = Object.create(null);
    this.userCount = 0;
    this.collecting = null;
    for (let i = 0; i < this.waiting.length; i++) {
      this._registerUser(this.waiting[i].ip);
    }
    if (this.userCount !== oldUserCount) this.sendUpdates();
  }

  registerUser(ip: string): void {
    if (!(ip in this.users)) {
      this._registerUser(ip);
      this.sendUpdates();
    }
  }

  _registerUser(ip: string): void {
    if (!(ip in this.users)) {
      this.users[ip] = true;
      this.userCount++;
      if (this.collecting == null) {
        this.collecting = setTimeout(() => this.collectUsers(), 5000);
      }
    }
  }
}

const instances: Record<string, CollabInstance> = Object.create(null);
let instanceCount = 0;
const maxCount = 20;

function getInstance(id: string, ip?: string): CollabInstance {
  let inst = instances[id];
  if (!inst) {
    inst = newInstance(id);
  }
  if (ip) inst.registerUser(ip);
  inst.lastActive = Date.now();
  return inst;
}

function newInstance(id: string, doc?: PMNode, comments?: Comments): CollabInstance {
  if (++instanceCount > maxCount) {
    let oldest: CollabInstance | null = null;
    for (const id in instances) {
      const inst = instances[id];
      if (!oldest || inst.lastActive < oldest.lastActive) oldest = inst;
    }
    if (oldest) {
      oldest.stop();
      delete instances[oldest.id];
      --instanceCount;
    }
  }
  instances[id] = new CollabInstance(id, doc, comments);
  return instances[id];
}

function instanceInfo(): Array<{ id: string; users: number }> {
  const found: Array<{ id: string; users: number }> = [];
  for (const id in instances) {
    found.push({ id: id, users: instances[id].userCount });
  }
  return found;
}

export { getInstance, instanceInfo, newInstance, CollabInstance };

