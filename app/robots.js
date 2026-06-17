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
          '/our-story',
          '/faq',
          '/help',
          '/disclaimer',
          '/cookie-policy',
          '/privacy-policy',
          '/terms-of-use',
          '/advertise',
          '/community',
        ],
        disallow: [
          '/buyer/',
          '/api/',
          '/login',
          '/signup',
          '/profile',
          '/saved-properties',
          '/temp-seller',
          '/debug-property',
          // Community: keep the public pages crawlable, block the logged-in app pages
          '/community/me',
          '/community/notifications',
          '/community/new',
          '/community/verify',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
