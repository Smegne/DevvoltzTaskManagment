import { register } from 'next-pwa'

const isProduction = process.env.NODE_ENV === 'production'

register({
  dest: 'public',
  disable: !isProduction,
  register: true,
  skipWaiting: true,
})