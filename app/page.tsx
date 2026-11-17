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
  "https://pipedapi.adminforge.de",
  "https://pipedapi.moomoo.me"
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Введите название песни или артиста");
      return;
    }

    setLoading(true);
    setError(null);
    setTrackData(null);
    setAudioUrl(null);

    try {
      // Шаг 1: Метаданные (обложка и точное название) идут через наш бэкенд
      const metaResponse = await fetch(`/api/spotify?q=${encodeURIComponent(searchQuery)}`);
      if (!metaResponse.ok) throw new Error("Трек не найден в базе");
      const track: TrackData = await metaResponse.json();
      setTrackData(track);

      // Шаг 2: Ищем аудио, оборачивая запросы в AllOrigins для обхода CORS
      const query = `${track.artist} ${track.title} audio`;
      
      const streamUrl = await Promise.any(
        PIPED_INSTANCES.map(async (apiBase) => {
          // Запрос поиска оборачиваем в CORS-прокси
          const searchTarget = `${apiBase}/search?q=${encodeURIComponent(query)}&filter=all`;
          const searchProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(searchTarget)}`;
          
          const searchRes = await fetch(searchProxy);
          if (!searchRes.ok) throw new Error("Proxy error");
          
          const searchJson = await searchRes.json();
          if (!searchJson.contents) throw new Error("Empty contents");
          const searchData = JSON.parse(searchJson.contents);
          
          const video = searchData.items?.find((item: any) => item.type === 'stream');
          if (!video) throw new Error("No video");

          // Извлекаем ID
          const videoId = video.url.split('v=')[1]?.split('&')[0] || video.url.split('/watch?v=')[1];
          if (!videoId) throw new Error("No ID");

          // Запрос прямых ссылок на потоки тоже через прокси
          const streamTarget = `${apiBase}/streams/${videoId}`;
          const streamProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(streamTarget)}`;
          
          const streamRes = await fetch(streamProxy);
          const streamJson = await streamRes.json();
          const streamData = JSON.parse(streamJson.contents);
          
          // Выбираем лучший аудиопоток
          const bestAudio = streamData.audioStreams?.find((s: any) => s.mimeType?.includes('audio/mp4')) 
                         || streamData.audioStreams?.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
                         
          if (!bestAudio?.url) throw new Error("No url");
          
          // Саму ссылку возвращаем как есть — браузер вставит её в <audio> и CORS ругаться не будет
          return bestAudio.url;
        })
      );

      setAudioUrl(streamUrl);

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
          Deezer metadata × Piped Direct Audio
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
                  <p className="text-xs text-textSecondary text-center">🎵 Сейчас играет</p>
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
            onClick={() => { setSearchQuery(""); setTrackData(null); setAudioUrl(null); setError(null); }}
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