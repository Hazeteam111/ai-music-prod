"use client";

import { useState } from "react";
import Image from "next/image";

interface TrackData {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
}

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.smnz.de",
  "https://pipedapi.adminforge.de"
];

// Хелпер с таймаутом (4 секунды)
const fetchWithTimeout = async (url: string, ms = 4000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Добавляем флаг, чтобы понимать, играет полный трек или резервное превью
  const [isPreview, setIsPreview] = useState(false); 

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Введите название песни или артиста");
      return;
    }

    setLoading(true);
    setError(null);
    setTrackData(null);
    setAudioUrl(null);
    setIsPreview(false);

    try {
      // Шаг 1: Получаем метаданные (через твой бэкенд)
      const metaResponse = await fetch(`/api/spotify?q=${encodeURIComponent(searchQuery)}`);
      if (!metaResponse.ok) throw new Error("Трек не найден в базе");
      const track: TrackData = await metaResponse.json();
      setTrackData(track);

      const query = `${track.artist} ${track.title}`;
      let finalStreamUrl = null;
      let isFallback = false;

      // Шаг 2: Пробуем достать полный трек с Piped через быстрый CORS-прокси
      try {
        finalStreamUrl = await Promise.any(
          PIPED_INSTANCES.map(async (apiBase) => {
            const searchTarget = `${apiBase}/search?q=${encodeURIComponent(query + ' audio')}&filter=all`;
            // Используем corsproxy.io для обхода блокировок Cloudflare
            const proxySearch = `https://corsproxy.io/?${encodeURIComponent(searchTarget)}`;
            
            const searchRes = await fetchWithTimeout(proxySearch, 4000);
            const searchData = await searchRes.json();
            
            const video = searchData.items?.find((item: any) => item.type === 'stream');
            if (!video) throw new Error("Видео не найдено");

            const videoId = video.url.split('v=')[1]?.split('&')[0] || video.url.split('/watch?v=')[1];

            const streamTarget = `${apiBase}/streams/${videoId}`;
            const proxyStream = `https://corsproxy.io/?${encodeURIComponent(streamTarget)}`;
            
            const streamRes = await fetchWithTimeout(proxyStream, 4000);
            const streamData = await streamRes.json();
            
            const bestAudio = streamData.audioStreams?.find((s: any) => s.mimeType?.includes('audio/mp4')) 
                           || streamData.audioStreams?.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
                           
            if (!bestAudio?.url) throw new Error("Нет потока");
            return bestAudio.url; // Саму аудиоссылку проксировать не нужно, браузер её съест
          })
        );
      } catch (pipedError) {
        // ШАГ 3: ЖЕЛЕЗОБЕТОННЫЙ РЕЗЕРВ (Apple Music API)
        // Если пираты заблокировали запросы, мы тихо переключаемся на легальное 30-сек превью.
        console.warn("Piped недоступен, переключаемся на резерв Apple Music...");
        
        const appleRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`);
        const appleData = await appleRes.json();
        
        if (appleData.results && appleData.results[0]?.previewUrl) {
          finalStreamUrl = appleData.results[0].previewUrl;
          isFallback = true;
        } else {
          throw new Error("Абсолютно все серверы отказали в доступе.");
        }
      }

      setAudioUrl(finalStreamUrl);
      setIsPreview(isFallback);

    } catch (err) {
      console.error(err);
      setError("Аудиопоток временно недоступен. Попробуйте другой трек.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-surface to-background flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-textPrimary mb-2">AI Music</h1>
        <p className="text-textSecondary text-lg">
          Smart Audio Engine
        </p>
      </div>

      {/* Search Section */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Поиск песни или артиста..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-4 py-3 rounded-lg bg-surfaceLight text-textPrimary placeholder-textSecondary border border-surface focus:border-accent focus:outline-none transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-accent hover:bg-accentHover disabled:bg-textSecondary text-black font-semibold rounded-lg transition-colors duration-200"
          >
            {loading ? "Ищем..." : "Найти"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full max-w-xl mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Track Card */}
      {trackData && (
        <div className="w-full max-w-xl">
          <div className="bg-surfaceLight border border-surface rounded-xl overflow-hidden shadow-2xl">
            {trackData.coverUrl && (
              <div className="relative w-full aspect-square bg-surface">
                <Image
                  src={trackData.coverUrl}
                  alt={trackData.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div className="p-6">
              <h2 className="text-2xl font-bold text-textPrimary mb-1 truncate">
                {trackData.title}
              </h2>
              <p className="text-textSecondary mb-6 truncate">
                {trackData.artist}
              </p>

              {audioUrl ? (
                <div className="space-y-4">
                  <div className="bg-background rounded-lg p-4 border border-surface">
                    <audio
                      controls
                      autoPlay
                      className="w-full"
                      style={{ accentColor: "#1db954" }}
                    >
                      <source src={audioUrl} />
                      Браузер не поддерживает плеер.
                    </audio>
                  </div>
                  <p className="text-xs text-textSecondary text-center">
                    🎵 {isPreview ? "Сейчас играет (Демо 30 сек)" : "Сейчас играет (Полная версия)"}
                  </p>
                </div>
              ) : loading ? (
                <div className="bg-background rounded-lg p-8 border border-surface flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-textSecondary">Подключаем аудиопоток...</span>
                </div>
              ) : (
                <div className="bg-background rounded-lg p-8 border border-surface flex items-center justify-center">
                  <span className="text-red-400 text-sm">Аудиопоток недоступен</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => { setSearchQuery(""); setTrackData(null); setAudioUrl(null); setError(null); setIsPreview(false); }}
            className="w-full mt-4 px-4 py-2 text-textSecondary hover:text-textPrimary border border-textSecondary hover:border-textPrimary rounded-lg transition-colors"
          >
            ← Найти другой трек
          </button>
        </div>
      )}

      {!trackData && !loading && (
        <div className="text-center text-textSecondary">
          <div className="text-5xl mb-4">🎶</div>
          <p>Введи название трека, чтобы начать</p>
        </div>
      )}
    </main>
  );
}