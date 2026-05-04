import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function err(code: string, message: string, status = 400) {
  return NextResponse.json(
    { data: null, error: { code, message } },
    { status }
  );
}
