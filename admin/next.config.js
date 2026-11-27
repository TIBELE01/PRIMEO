/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ne pas annoncer la technologie du serveur (en-tête X-Powered-By)
  poweredByHeader: false,
  images: {
    domains: ['res.cloudinary.com', 'api.dicebear.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Back-office privé : jamais indexé par les moteurs de recherche
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
