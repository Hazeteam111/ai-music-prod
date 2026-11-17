import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  return NextResponse.json({
    clientIdExists: !!clientId,
    clientIdLength: clientId?.length || 0,
    clientSecretExists: !!clientSecret,
    clientSecretLength: clientSecret?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  });
}
