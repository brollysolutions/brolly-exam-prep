import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  transpilePackages: ['@tslprb/design-tokens', '@tslprb/api-contracts', '@tslprb/fixtures'],
  async redirects() {
    return [
      { source: '/privacy%20policy', destination: '/privacy-policy', permanent: true },
      { source: '/account%20deletion', destination: '/account-deletion', permanent: true },
      {
        source: '/test/pc-constable-03',
        destination: '/test/constablemocktest03',
        permanent: false,
      },
      {
        source: '/test/pc-constable-03/result',
        destination: '/test/constablemocktest03/result',
        permanent: false,
      },
      {
        source: '/test/pc-constable-03/solutions',
        destination: '/test/constablemocktest03/solution',
        permanent: false,
      },
      {
        source: '/test/constablemocktest03/solutions',
        destination: '/test/constablemocktest03/solution',
        permanent: false,
      },
      { source: '/test/pc-brolly-01/:path*', destination: '/tests', permanent: false },
      {
        source: '/test/pc-constable-01',
        destination: '/test/constablemocktest01',
        permanent: false,
      },
      {
        source: '/test/pc-constable-01/result',
        destination: '/test/constablemocktest01/result',
        permanent: false,
      },
      {
        source: '/test/pc-constable-01/solutions',
        destination: '/test/constablemocktest01/solution',
        permanent: false,
      },
      {
        source: '/test/constablemocktest01/solutions',
        destination: '/test/constablemocktest01/solution',
        permanent: false,
      },
      {
        source: '/test/pc-constable-02',
        destination: '/test/constablemocktest02',
        permanent: false,
      },
      {
        source: '/test/pc-constable-02/result',
        destination: '/test/constablemocktest02/result',
        permanent: false,
      },
      {
        source: '/test/pc-constable-02/solutions',
        destination: '/test/constablemocktest02/solution',
        permanent: false,
      },
      {
        source: '/test/constablemocktest02/solutions',
        destination: '/test/constablemocktest02/solution',
        permanent: false,
      },
      { source: '/test/si-brolly-02', destination: '/tests/simocktest02', permanent: false },
      { source: '/test/si-brolly-03', destination: '/tests/simocktest03', permanent: false },
      {
        source: '/test/si-brolly-03/result',
        destination: '/tests/simocktest03/result',
        permanent: false,
      },
      {
        source: '/test/si-brolly-03/solutions',
        destination: '/tests/simocktest03/solutions',
        permanent: false,
      },
      {
        source: '/test/si-brolly-02/solutions',
        destination: '/tests/simocktest02/solutions',
        permanent: false,
      },
      { source: '/\\(tabs\\)', destination: '/', permanent: false },
      { source: '/\\(tabs\\)/:path*', destination: '/:path*', permanent: false },
      { source: '/\\(auth\\)/:path*', destination: '/:path*', permanent: false },
      { source: '/\\(onboarding\\)/:path*', destination: '/:path*', permanent: false },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default nextConfig;
