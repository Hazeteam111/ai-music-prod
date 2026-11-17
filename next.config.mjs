/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn-images.dzcdn.net',
      },
      // Если там уже есть домены Spotify (например, i.scdn.co), можешь оставить их тоже
    ],
  },
};

export default nextConfig;