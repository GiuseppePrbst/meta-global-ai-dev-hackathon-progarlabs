import path from "node:path";

/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  poweredByHeader: false,
};

export default config;
