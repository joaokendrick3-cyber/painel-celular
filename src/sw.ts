// @ts-nocheck  (service worker: roda fora da página, com tipos próprios)
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: any

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Chegou um aviso do computador: mostra a notificação e põe o número no ícone.
self.addEventListener('push', (evento) => {
  let d = { titulo: 'PAINEL', corpo: '', naoLidas: 0 }
  try { d = { ...d, ...evento.data.json() } } catch { /* sem dados: usa o padrão */ }
  evento.waitUntil(
    Promise.all([
      self.registration.showNotification(d.titulo, { body: d.corpo, icon: 'icone-192.png', badge: 'icone-192.png', tag: 'painel-aviso', renotify: true }),
      d.naoLidas > 0 && self.navigator.setAppBadge ? self.navigator.setAppBadge(d.naoLidas).catch(() => {}) : Promise.resolve()
    ])
  )
})

// Tocou na notificação: abre (ou traz para a frente) o app.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) if ('focus' in j) return j.focus()
      return self.clients.openWindow(self.registration.scope)
    })
  )
})
