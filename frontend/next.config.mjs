// Wallet features need Privy everywhere, so a build without it must fail loudly.
if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
  throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is required. Set it in frontend/.env.local.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
