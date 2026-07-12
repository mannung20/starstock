/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google 프로필 아바타
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
