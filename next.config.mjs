/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode off: its dev double-mount conflicts with Leaflet's map init.
  reactStrictMode: false,
};

export default nextConfig;
