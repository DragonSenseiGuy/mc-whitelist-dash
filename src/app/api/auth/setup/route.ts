import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { hasAdmin, createAdmin } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (hasAdmin()) {
    return NextResponse.json(
      { error: "Admin account already exists" },
      { status: 400 }
    );
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  createAdmin(email, hash);

  const token = signToken({ email });
  setAuthCookie(token);

  return NextResponse.json({ success: true });
}
