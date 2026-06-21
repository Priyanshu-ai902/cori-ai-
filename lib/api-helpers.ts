import { NextResponse } from "next/server";

export function jsonResponse(data: any, status = 200) {
  return new NextResponse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    ),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}
