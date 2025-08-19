export default function manifest() {
  return {
    name: 'Fixly - Local Services Marketplace',
    short_name: 'Fixly',
    description: 'Connect with trusted local service providers for all your home and business needs. Find reliable professionals for plumbing, electrical, carpentry, and more.',
    start_url: '/?utm_source=pwa&utm_medium=homescreen',
    display: 'standalone',
    background_color: '#FDFDFD',
    theme_color: '#0D9488',
    orientation: 'any',
    scope: '/',
    lang: 'en-US',
    categories: ['business', 'productivity', 'utilities', 'lifestyle'],
    id: 'com.fixly.app',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Find Jobs',
        short_name: 'Jobs',
        description: 'Browse available jobs in your area',
        url: '/dashboard/browse-jobs',
        icons: [{ src: '/apple-touch-icon.png', sizes: '96x96', type: 'image/png' }]
      },
      {
        name: 'Post Job',
        short_name: 'Post',
        description: 'Post a new job for service providers',
        url: '/dashboard/post-job',
        icons: [{ src: '/apple-touch-icon.png', sizes: '96x96', type: 'image/png' }]
      },
      {
        name: 'Messages',
        short_name: 'Chat',
        description: 'View your conversations',
        url: '/dashboard/messages',
        icons: [{ src: '/apple-touch-icon.png', sizes: '96x96', type: 'image/png' }]
      }
    ],
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
    launch_handler: {
      client_mode: ['navigate-existing', 'auto']
    },
    share_target: {
      action: '/dashboard/post-job',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'description',
        files: [{ name: 'images', accept: ['image/*'] }]
      }
    }
  }
}