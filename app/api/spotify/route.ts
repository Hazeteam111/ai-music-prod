import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Missing search query parameter 'q'" },
        { status: 400 }
      );
    }

    // Обращаемся к открытому API Deezer (авторизация не требуется)
    const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    
    const response = await fetch(searchUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Deezer API failed with status ${response.status}`);
    }

    const data = await response.json();
    const tracks = data.data || [];

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found for the given query" },
        { status: 404 }
      );
    }

    const track = tracks[0];

    // Форматируем ответ точно так, как ожидает уже написанный фронтенд
    return NextResponse.json(
      {
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        // Берем обложку самого высокого качества (xl или big)
        coverUrl: track.album.cover_xl || track.album.cover_big || track.album.cover || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search API error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}