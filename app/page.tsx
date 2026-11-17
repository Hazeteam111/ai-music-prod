"use client";

import { useState } from "react";
import Image from "next/image";

interface TrackData {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a song name or artist");
      return;
    }

    setLoading(true);
    setError(null);
    setTrackData(null);
    setAudioUrl(null);

    try {
      // Step 1: Fetch track metadata
      const spotifyResponse = await fetch(
        `/api/spotify?q=${encodeURIComponent(searchQuery)}`
      );

      if (!spotifyResponse.ok) {
        throw new Error("Track not found");
      }

      const track: TrackData = await spotifyResponse.json();
      setTrackData(track);

      // Step 2: Fetch audio URL
      const audioResponse = await fetch(
        `/api/audio?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
          track.artist
        )}`
      );

      if (!audioResponse.ok) {
        throw new Error("Could not find audio on servers");
      }

      const audioData = await audioResponse.json();
      setAudioUrl(audioData.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred. Please try again."
      );
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
          Spotify metadata × YouTube audio
        </p>
      </div>

      {/* Search Section */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search a song or artist..."
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
            {loading ? "Searching..." : "Search"}
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
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  <p className="text-xs text-textSecondary text-center">🎵 Now playing</p>
                </div>
              ) : loading ? (
                <div className="bg-background rounded-lg p-8 border border-surface flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-textSecondary">Finding audio...</span>
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
            ← Search Another Song
          </button>
        </div>
      )}

      {!trackData && !loading && (
        <div className="text-center text-textSecondary">
          <div className="text-5xl mb-4">🎶</div>
          <p>Start searching for your favorite song</p>
        </div>
      )}
    </main>
  );
}