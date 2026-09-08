import { firebaseAuth } from './firebase-config.js';

export async function checkSessionAndSync() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return null;

    const session = await res.json();
    if (!session.ok || !session.user) return null;

    return session.user;
  } catch (e) {
    console.error('Oturum doğrulama hatası:', e);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkSessionAndSync();
  const authSlot = document.querySelector('[data-auth-slot]');

  if (authSlot) {
    if (user) {
      const avatarUrl = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
        : 'images/bot.svg';

      authSlot.innerHTML = `
        <div class="user-pill" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);padding:4px 12px;border-radius:99px;border:1px solid var(--line);">
          <img src="${avatarUrl}" alt="${user.username}" style="width:24px;height:24px;border-radius:50%">
          <span style="font-size:0.85rem;font-weight:600">${user.username}</span>
          <a href="/api/auth/logout" class="btn-logout" style="color:var(--faint);margin-left:4px;" title="Çıkış Yap"><i class="fa-solid fa-right-from-bracket"></i></a>
        </div>
      `;
    } else {
      authSlot.innerHTML = `
        <a href="/api/auth/discord/start" class="btn sm line"><i class="fa-brands fa-discord"></i> Discord ile Giriş</a>
      `;
    }
  }

  // Hesabım & Mağaza Paneli Rendering
  if (typeof window.initAccountAndShop === 'function') {
    window.initAccountAndShop(user);
  }
});