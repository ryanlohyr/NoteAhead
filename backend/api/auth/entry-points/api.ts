import { Express, Router, Request, Response } from "express";
import dotenv from "dotenv";
import { AuthenticatedRequest } from "#shared/types";
import { createUser, getUser } from "../use-case/use-case";
import { verifyAuth } from "#middleware/auth";

dotenv.config();

function authRoutes(app: Express) {
  const router = Router();
  const prefix = "/auth";

  router.use(verifyAuth);

  router.get("/user", async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const userId = authReq.user.id;

    console.log("getting user", { userId });

    const user = await getUser(userId);

    console.log("user fetched", { user });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      user,
    });
    return;
  });

  router.post("/user", async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id: userId, email } = authReq.user;

    try {
      // check if user already exists
      const user = await getUser(userId);

      if (user) {
        res.status(200).json({
          data: user,
          success: true,
          message: "User already exists",
        });
        return;
      }

      const newUser = await createUser(userId);

      console.log("user created", { userId, email });

      res.status(200).json({
        data: newUser,
        success: true,
      });
    } catch (error) {
      console.error("error creating user", { userId, email, error });
      res.status(500).json({
        error: error,
        success: false,
      });
      return;
    }
    return;
  });

  app.use(prefix, router);
}

export default authRoutes;

