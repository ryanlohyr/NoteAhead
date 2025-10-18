import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    isAdmin: boolean;
    email: string;
  };
}

