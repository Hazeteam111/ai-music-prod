import { NextRequest, NextResponse } from "next/server";

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.smnz.de",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.moomoo.me"
];

async function fetchWithTimeout(url: string, timeout = 3000) {
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

    for (const apiBase of PIPED_INSTANCES) {
      try {
        const searchRes = await fetchWithTimeout(`${apiBase}/search?q=${encodeURIComponent(searchQuery)}&filter=all`, 3000);
        if (!searchRes.ok) continue; 
        
        const searchData = await searchRes.json();
        const video = searchData.items?.find((item: any) => item.type === 'stream');
        if (!video) continue;

        // Извлекаем ID видео
        const videoId = video.url.split('/watch?v=')[1] || video.url.split('?v=')[1];
        if (!videoId) continue;
        
        const streamRes = await fetchWithTimeout(`${apiBase}/streams/${videoId}`, 3000);
        if (!streamRes.ok) continue;
        
        const streamData = await streamRes.json();
        const audioStreams = streamData.audioStreams;
        
        if (audioStreams && audioStreams.length > 0) {
          // Ищем M4A (mp4) формат для максимальной совместимости, иначе берем с лучшим битрейтом
          const bestAudio = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4')) 
                         || audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
          streamUrl = bestAudio.url;
          break; 
        }
      } catch (e) {
        continue;
      }
    }

    if (!streamUrl) {
      return NextResponse.json({ error: "Не удалось найти аудио на зеркалах" }, { status: 502 });
    }

    return NextResponse.json({ url: streamUrl, title: title }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}