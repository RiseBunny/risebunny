/**
 * RiseBunny Auth — Discord & Firebase Oturum Entegrasyonu
 */
import { firebaseAuth } from './firebase-config.js';

export async function checkSessionAndSync() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return null;

    const session = await res.json();
    if (!session.ok || !session.user) return null;

    // Discord oturum bilgisi
    const user = session.user;

    // UI güncellemeleri
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
      userEmailEl.textContent = `${user.username} (${user.id})`;
    }

    return user;
  } catch (e) {
    console.error('Oturum doğrulama hatası:', e);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkSessionAndSync();
  const authScreen = document.getElementById('auth-screen');
  const panel = document.getElementById('panel');

  // Discord ID veya yetkili rol kontrolü
  const adminUIDs = ['oblLBCNGXEYF8plKq8KUr3m6o4f1', '1310366324731547798'];
  
  if (user && adminUIDs.includes(user.id)) {
    if (authScreen) authScreen.hidden = true;
    if (panel) panel.hidden = false;

    if (typeof window.loadForumUsers === 'function') {
      window.loadForumUsers();
    }
  } else if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged((fbUser) => {
      if (fbUser && adminUIDs.includes(fbUser.uid)) {
        if (authScreen) authScreen.hidden = true;
        if (panel) panel.hidden = false;
        if (typeof window.loadForumUsers === 'function') {
          window.loadForumUsers();
        }
      }
    });
  }
});