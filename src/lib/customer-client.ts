"use client";
import { createAuthClient } from "better-auth/react";
export const customerClient = createAuthClient({
  basePath: "/api/customer-auth",
});
