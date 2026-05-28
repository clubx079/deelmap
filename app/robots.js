const SITE = 'https://deelmap.com'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/marketplace',
          '/deals/',
          '/how-to-find-off-market-properties',
          '/how-to-wholesale-real-estate',
          '/what-is-arv',
          '/wholesale-real-estate',
          '/vs/',
          '/about',
          '/faq',
          '/reviews',
        ],
        disallow: [
          '/buyer/',
          '/api/',
          '/login',
          '/signup',
          '/profile',
          '/saved-properties',
          '/temp-seller',
          '/test-email',
          '/testmsg',
          '/debug-property',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
