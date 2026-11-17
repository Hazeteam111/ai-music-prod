import { NextRequest, NextResponse } from "next/server";
import play from "play-dl";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get("title");
    const artist = searchParams.get("artist");
    const isPlayRequest = searchParams.get("play") === "true";

    if (!title || !artist) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const searchQuery = `${artist} ${title}`;

    try {
      // Инициализируем токен для работы на серверах Vercel
      const clientId = await play.getFreeClientID();
      await play.setToken({ soundcloud: { client_id: clientId } });

      const searchResults = await play.search(searchQuery, {
        limit: 1,
        source: { soundcloud: "tracks" }
      });

      if (!searchResults || searchResults.length === 0) {
        return NextResponse.json({ error: "No audio found" }, { status: 404 });
      }

      const track = searchResults[0];

      // Если запрос делает тег <audio>, транслируем поток напрямую
      if (isPlayRequest) {
        const streamData = await play.stream(track.url);
        return new NextResponse(streamData.stream as any, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Transfer-Encoding": "chunked",
          },
        });
      }

      // Если запрос делает React, отдаем ссылку на проксированный поток
      return NextResponse.json({
        url: `/api/audio?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&play=true`,
        title: track.name || title,
      }, { status: 200 });
      
    } catch (scError) {
      console.error("SoundCloud error:", scError);
      return NextResponse.json({ error: "Failed to retrieve audio" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}