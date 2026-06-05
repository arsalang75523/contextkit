import { createOpenApiDocument } from "@/lib/openapi";

export const runtime = "edge";

export function GET() {
  return Response.json(createOpenApiDocument());
}
