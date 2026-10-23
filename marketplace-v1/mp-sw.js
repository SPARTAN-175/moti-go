/* Service worker reservado para push de Marketplace. No reemplaza service-worker.js de MOTI GO. */
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');
// Firebase Messaging requiere copiar aquí la configuración pública de firebase-config.js.
// No se activa hasta configurar la clave VAPID en marketplace.js y completar esta configuración.
const firebaseConfig = {
  apiKey: 'AIzaSyBQyULHw9P6V_nukIe_Np3_6LA2hdWuu5A',
  authDomain: 'moti-go-c562c.firebaseapp.com',
  projectId: 'moti-go-c562c',
  storageBucket: 'moti-go-c562c.firebasestorage.app',
  messagingSenderId: '403488200433',
  appId: '1:403488200433:web:695fd2eee203846546bb50'
};
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'MOTI GO Marketplace';
    const options = { body: payload.notification?.body || 'Tienes una actualización de tu compra.', icon: '../assets/branding/icon-192.png', data: payload.data || {} };
    self.registration.showNotification(title, options);
  });
}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html?vista=pedidos'));
});
