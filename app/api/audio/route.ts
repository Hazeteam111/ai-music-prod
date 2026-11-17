import { NextRequest, NextResponse } from "next/server";

const INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza",
  "https://invidious.jing.rocks"
];

// Хелпер для обрыва зависших запросов (спасает от 10-секундного лимита Vercel)
async function fetchWithTimeout(url: string, timeout = 2000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
  clearTimeout(id);
  return response;
}

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

    // Перебираем зеркала. На каждое дается ровно 2 секунды.
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const searchRes = await fetchWithTimeout(`${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}`, 2000);
        if (!searchRes.ok) continue;

        const results = await searchRes.json();
        const video = results.find((v: any) => v.type === 'video');
        if (!video) continue;

        // itag=140 — это прямая ссылка на аудио M4A (128kbps)
        streamUrl = `${instance}/latest_version?id=${video.videoId}&itag=140`;
        break; 
      } catch (e) {
        // Если сервер упал или не ответил за 2с, мы не виснем, а просто идем к следующему
        continue;
      }
    }

    if (!streamUrl) {
      return NextResponse.json({ error: "Не удалось найти аудио на серверах" }, { status: 502 });
    }

    return NextResponse.json({ url: streamUrl, title: title }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}