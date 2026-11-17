import { NextRequest, NextResponse } from "next/server";

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.moomoo.me",
  "https://pipedapi.syncpundit.io"
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

    for (const apiBase of PIPED_INSTANCES) {
      try {
        const searchRes = await fetch(`${apiBase}/search?q=${encodeURIComponent(searchQuery)}&filter=all`, { cache: 'no-store' });
        if (!searchRes.ok) continue; 
        
        const searchData = await searchRes.json();
        const video = searchData.items?.find((item: any) => item.type === 'stream');
        if (!video) continue;

        const videoId = video.url.split('?v=')[1];
        
        const streamRes = await fetch(`${apiBase}/streams/${videoId}`, { cache: 'no-store' });
        if (!streamRes.ok) continue;
        
        const streamData = await streamRes.json();
        const audioStreams = streamData.audioStreams;
        
        if (audioStreams && audioStreams.length > 0) {
          const bestAudio = audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
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