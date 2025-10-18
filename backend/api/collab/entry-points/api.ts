import { Express, Router, Request, Response } from "express";
import { getInstance, instanceInfo } from "../instance";
import { Step } from "prosemirror-transform";
import { schema } from "#shared/schema.js";
import { AddEventRequest, EventData, DocData } from "../types";

function collabRoutes(app: Express) {
  const router = Router();
  const prefix = "/api/collab";

  function reqIP(request: Request): string {
    return (request.headers["x-forwarded-for"] as string) || request.socket.remoteAddress || "unknown";
  }

  function nonNegInteger(str: string): number {
    const num = Number(str);
    if (!isNaN(num) && Math.floor(num) === num && num >= 0) return num;
    const err = new Error("Not a non-negative integer: " + str) as any;
    err.status = 400;
    throw err;
  }

  // GET /api/collab/docs - List all documents
  router.get("/docs", (req: Request, res: Response) => {
    try {
      const info = instanceInfo();
      res.json(info);
    } catch (error) {
      console.error("Error listing docs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/collab/docs/:id - Get document state
  router.get("/docs/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const inst = getInstance(id, reqIP(req));
      const data: DocData = {
        doc: inst.doc.toJSON(),
        users: inst.userCount,
        version: inst.version,
        comments: inst.comments.comments,
        commentVersion: inst.comments.version,
      };
      res.json(data);
    } catch (error: any) {
      console.error("Error getting doc:", error);
      res.status(error.status || 500).json({ error: error.message || "Internal server error" });
    }
  });

  // GET /api/collab/docs/:id/events - Get events (long polling)
  router.get("/docs/:id/events", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const version = nonNegInteger(req.query.version as string);
      const commentVersion = nonNegInteger(req.query.commentVersion as string);

      const inst = getInstance(id, reqIP(req));
      const data = inst.getEvents(version, commentVersion);

      if (data === false) {
        return res.status(410).json({ error: "History no longer available" });
      }

      // If there are events, return them immediately
      if (data.steps.length || data.comment.length) {
        const eventData: EventData = {
          version: inst.version,
          commentVersion: inst.comments.version,
          steps: data.steps.map((s) => s.toJSON()),
          clientIDs: data.steps.map((step: any) => step.clientID),
          comment: data.comment,
          users: data.users,
        };
        return res.json(eventData);
      }

      // Otherwise, wait for new events (long polling)
      const timeout = setTimeout(() => {
        wait.abort();
        wait.send({
          version: inst.version,
          commentVersion: inst.comments.version,
          steps: [],
          clientIDs: [],
          comment: [],
          users: inst.userCount,
        });
      }, 1000 * 60 * 5); // 5 minute timeout

      const wait = {
        resp: res,
        inst: inst,
        ip: reqIP(req),
        done: false,
        abort: function () {
          const found = this.inst.waiting.indexOf(this);
          if (found > -1) this.inst.waiting.splice(found, 1);
          clearTimeout(timeout);
        },
        send: function (output: any) {
          if (this.done) return;
          res.json(output);
          this.done = true;
          clearTimeout(timeout);
        },
        finish: function () {
          const newData = inst.getEvents(version, commentVersion);
          if (newData === false) {
            this.send({ error: "History no longer available" });
            return;
          }
          this.send({
            version: inst.version,
            commentVersion: inst.comments.version,
            steps: newData.steps.map((s) => s.toJSON()),
            clientIDs: newData.steps.map((step: any) => step.clientID),
            comment: newData.comment,
            users: newData.users,
          });
        },
      };

      inst.waiting.push(wait);

      res.on("close", () => {
        wait.abort();
      });
    } catch (error: any) {
      console.error("Error getting events:", error);
      res.status(error.status || 500).json({ error: error.message || "Internal server error" });
    }
  });

  // POST /api/collab/docs/:id/events - Submit events
  router.post("/docs/:id/events", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body as AddEventRequest;
      const version = nonNegInteger(String(data.version));
      const steps = data.steps.map((s) => Step.fromJSON(schema, s));
      const inst = getInstance(id, reqIP(req));
      const result = inst.addEvents(version, steps, data.comment, data.clientID);

      if (!result) {
        return res.status(409).json({ error: "Version not current" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error adding events:", error);
      res.status(error.status || 500).json({ error: error.message || "Internal server error" });
    }
  });

  app.use(prefix, router);
}

export default collabRoutes;

