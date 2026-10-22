/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === "true" || process.env.DEPLOY_TARGET === "gh-pages";
let assetPrefix = "";
let basePath = "";

if (isGithubActions) {
  // Use repo name as basePath for GitHub Pages project site
  const repo = process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}`
    : "/College-Predictor";
  assetPrefix = repo;
  basePath = repo;
}

const nextConfig = {
  output: isGithubActions ? "export" : undefined,
  basePath: basePath || undefined,
  assetPrefix: assetPrefix || undefined,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
