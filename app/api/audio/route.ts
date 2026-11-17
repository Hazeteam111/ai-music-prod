import { NextRequest, NextResponse } from "next/server";

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.smnz.de",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.moomoo.me",
  "https://pipedapi.syncpundit.io"
];

// Функция для работы с ОДНИМ конкретным сервером
async function getAudioFromInstance(apiBase: string, searchQuery: string) {
  // Даем каждому серверу максимум 6 секунд на всю работу
  const searchRes = await fetch(`${apiBase}/search?q=${encodeURIComponent(searchQuery)}&filter=all`, { 
    signal: AbortSignal.timeout(6000),
    cache: 'no-store'
  });
  
  if (!searchRes.ok) throw new Error("Search failed on " + apiBase);
  
  const searchData = await searchRes.json();
  const video = searchData.items?.find((item: any) => item.type === 'stream');
  if (!video) throw new Error("No video found");

  // Надежное извлечение ID видео
  const videoId = video.url.split('v=')[1]?.split('&')[0];
  if (!videoId) throw new Error("No video ID");
  
  const streamRes = await fetch(`${apiBase}/streams/${videoId}`, { 
    signal: AbortSignal.timeout(6000),
    cache: 'no-store' 
  });
  
  if (!streamRes.ok) throw new Error("Stream fetch failed");
  
  const streamData = await streamRes.json();
  const audioStreams = streamData.audioStreams;
  
  if (!audioStreams || audioStreams.length === 0) throw new Error("No audio streams");
  
  // Ищем формат M4A (mp4) для Apple/Safari, иначе берем лучший битрейт
  const bestAudio = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4')) 
                 || audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
                 
  if (!bestAudio?.url) throw new Error("No valid URL");
  
  return bestAudio.url;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const searchQuery = `${artist} ${title} audio`;

  try {
    // Promise.any запускает запросы ко ВСЕМ серверам ОДНОВРЕМЕННО. 
    // Он автоматически вернет результат того сервера, который ответит ПЕРВЫМ и без ошибки.
    const streamUrl = await Promise.any(
      PIPED_INSTANCES.map(instance => getAudioFromInstance(instance, searchQuery))
    );

    return NextResponse.json({ url: streamUrl, title: title }, { status: 200 });
  } catch (error) {
    // Сработает только если ВСЕ 5 серверов упали или не успели ответить
    console.error("All Piped instances failed");
    return NextResponse.json({ error: "Все зеркала недоступны" }, { status: 502 });
  }
}