import { NextRequest, NextResponse } from "next/server";

// Открытые европейские зеркала Invidious
const INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us",
  "https://invidious.jing.rocks",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza"
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get("title");
    const artist = searchParams.get("artist");

    if (!title || !artist) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const searchQuery = `${artist} ${title} audio`;
    let streamUrl = null;

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        // 1. Быстрый поиск через API
        const searchRes = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}`, { cache: 'no-store' });
        if (!searchRes.ok) continue;

        const results = await searchRes.json();
        const video = results.find((v: any) => v.type === 'video');
        if (!video) continue;

        // 2. Формируем прямую ссылку на проксированный аудиопоток 
        // (itag=140 это стандартный качественный аудиопоток M4A/AAC)
        streamUrl = `${instance}/latest_version?id=${video.videoId}&itag=140`;
        break; 
      } catch (e) {
        continue;
      }
    }

    if (!streamUrl) {
      return NextResponse.json({ error: "Не удалось найти аудио" }, { status: 502 });
    }

    // Возвращаем прямую ссылку фронтенду, а он уже вставит её в тег <audio src="...">
    return NextResponse.json({ url: streamUrl, title: title }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}