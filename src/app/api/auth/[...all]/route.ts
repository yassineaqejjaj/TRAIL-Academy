import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/config";

// Created lazily so `next build` does not need a database.
export const GET = (req: Request) => toNextJsHandler(getAuth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(getAuth()).POST(req);
