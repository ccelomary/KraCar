import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/i18n/core";
const pages: Record<string, string> = {
  "": "/",
  "list-your-property": "/partners",
  support: "/support",
  faq: "/faq",
  "about-us": "/about",
  blog: "/blog",
  "terms-conditions": "/policies/terms",
  "privacy-policy": "/policies/privacy",
  "cookie-policy": "/policies/privacy",
  "cancellation-policy": "/policies/cancellation",
  "insurance-conditions": "/policies/terms",
};
const categories: Record<string, string> = {
  "car-rental": "cars",
  "things-to-do": "activities",
};
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ locale: string; path?: string[] }> },
) {
  const { locale, path = [] } = await context.params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const route = path.join("/");
  let destination = pages[route];
  if (path.length === 2 && path[0] === "category" && categories[path[1]])
    destination = `/explore?category=${categories[path[1]]}`;
  if (path.length === 2 && path[0] === "city")
    destination = `/explore?city=${encodeURIComponent(path[1].replace(/^./, (c) => c.toUpperCase()))}`;
  if (path.length === 2 && path[0] === "details")
    destination = `/experiences/${encodeURIComponent(path[1])}`;
  if (path.length === 2 && path[0] === "article")
    destination = `/article/${encodeURIComponent(path[1])}`;
  if (route === "car-search") {
    const query = new URLSearchParams({
      category: "cars",
      city: req.nextUrl.searchParams.get("pickup") || "",
      returnCity: req.nextUrl.searchParams.get("dropoff") || "",
      start: req.nextUrl.searchParams.get("pickup_date") || "",
      end: req.nextUrl.searchParams.get("dropoff_date") || "",
    });
    destination = `/explore?${query}`;
  }
  if (!destination) return new Response("Not found", { status: 404 });
  // A relative Location preserves the browser's host (127.0.0.1 and custom domains).
  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: destination },
  });
  response.cookies.set("atlas-locale", locale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
