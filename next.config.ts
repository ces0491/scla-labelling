import type { NextConfig } from "next";

const config: NextConfig = {
  // Server-only modules (Resend SDK, AWS SDK) need the Node runtime,
  // not the Edge runtime. Routes opt in via export const runtime = 'nodejs'
  // where needed.
  reactStrictMode: true,
};

export default config;
