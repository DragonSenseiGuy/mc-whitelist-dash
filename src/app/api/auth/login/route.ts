import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdmin } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const admin = getAdmin(email);
  if (!admin) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = signToken({ email });
  setAuthCookie(token);

  return NextResponse.json({ success: true });
}
