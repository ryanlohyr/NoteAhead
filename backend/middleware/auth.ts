import { createClient } from "@supabase/supabase-js";
import { NextFunction } from "express";
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Create Supabase client with the service role key for auth verification
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * List of admin users (can be moved to environment variables)
 */
const ADMIN_EMAILS = ["ryanloh29@gmail.com"];

/**
 * Middleware to verify if a user is authenticated with Supabase
 *
 * Extracts the JWT from the Authorization header and verifies it
 * Sets req.user if authentication is successful
 */
export const verifyAuth = (req: any, res: any, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    // Extract the token (remove 'Bearer ' prefix if it exists)
    const token = authHeader.split(" ")[1] || authHeader;

    console.log("attempting to get user from token");

    // Verify the JWT token with Supabase
    supabase.auth
      .getUser(token)
      .then(({ data: { user }, error }) => {
        if (error || !user) {
          return res.status(401).json({ error: "Invalid or expired token" });
        }

        if (!user.email || !user.id) {
          console.error("Edge case: Invalid user payload, should not happen.", { user });
          return res.status(401).json({ error: "Invalid user payload" });
        }

        // Add the user to the request object for use in route handlers
        req.user = user;

        // Check if user is admin
        if (ADMIN_EMAILS.includes(user?.email || "")) {
          req.user.isAdmin = true;
        } else {
          req.user.isAdmin = false;
        }

        console.log("user fetched from token");

        // User is authenticated, proceed to the route handler
        next();
      })
      .catch((error) => {
        console.error("Authentication failed:", error);
        return res.status(500).json({ error: "Authentication failed" });
      });
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

