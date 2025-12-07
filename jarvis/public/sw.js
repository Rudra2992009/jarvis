const CACHE_NAME = "jarvis-v2"
const STATIC_CACHE = "jarvis-static-v2"
const DYNAMIC_CACHE = "jarvis-dynamic-v2"

const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.jpg", "/icon-512.jpg"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log("Failed to cache some assets:", err)
      })
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - network first for API, cache first for static
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") return

  // Skip API requests - always go to network
  if (url.pathname.startsWith("/api/")) {
    return
  }

  // For navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match("/")
          })
        }),
    )
    return
  }

  // For static assets - cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, response)
                })
              }
            })
            .catch(() => {}),
        )
        return cachedResponse
      }

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          if (request.destination === "image") {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#1e293b" width="100" height="100"/><text fill="#64748b" x="50%" y="50%" text-anchor="middle">Offline</text></svg>',
              { headers: { "Content-Type": "image/svg+xml" } },
            )
          }
        })
    }),
  )
})

// Handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "JARVIS",
    body: "New notification",
    icon: "/icon-192.jpg",
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192.jpg",
      badge: "/icon-192.jpg",
      vibrate: [100, 50, 100],
      data: data.url || "/",
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    }),
  )
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "dismiss") return

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || "/")
      }
    }),
  )
})

// Handle background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages())
  }
})

async function syncMessages() {
  console.log("Syncing messages...")
}
