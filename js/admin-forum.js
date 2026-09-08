/**
 * Admin Paneli — Forum Üyeleri Yönetimi
 */

async function loadForumUsers() {
  const container = document.getElementById('forum-users');
  if (!container) return;
  container.innerHTML = '<div class="msg-empty">Kullanıcılar yükleniyor...</div>';

  try {
    if (typeof db === 'undefined') {
      throw new Error('Firestore veritabanı bağlantısı bulunamadı.');
    }

    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
      container.innerHTML = '<div class="msg-empty">Kayıtlı forum üyesi bulunamadı.</div>';
      return;
    }

    let html = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Rol</th>
            <th>Durum</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
    `;

    snapshot.forEach(doc => {
      const u = doc.data() || {};
      const uid = doc.id;
      const isDiscordUser = uid.length > 15 && !isNaN(uid);

      const username = escapeHtml(u.username || 'İsimsiz Kullanıcı');
      const role = escapeHtml(u.role || 'member');
      const isBanned = Boolean(u.banned);

      html += `
        <tr data-uid="${uid}">
          <td>
            <strong>${username}</strong>
            <br><small style="color:var(--muted)">${isDiscordUser ? 'Discord ID: ' : 'UID: '}${uid}</small>
          </td>
          <td><span class="badge badge-role">${role}</span></td>
          <td>${isBanned ? '<span class="badge danger">Banlı</span>' : '<span class="badge success">Aktif</span>'}</td>
          <td>
            <button type="button" onclick="toggleUserBan('${uid}', ${!isBanned})" class="btn btn-sm ${isBanned ? 'btn-primary' : 'btn-outline danger'}">
              ${isBanned ? 'Banı Kaldır' : 'Banla'}
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    console.error('Forum üyeleri yüklenirken hata:', err);
    container.innerHTML = `<div class="msg-empty" style="color:var(--danger)">Üyeler çekilemedi: ${escapeHtml(err.message)}</div>`;
  }
}

async function toggleUserBan(uid, shouldBan) {
  if (!confirm(`Bu kullanıcının ban durumunu değiştirmek istediğinize emin misiniz?`)) return;
  try {
    await db.collection('users').doc(uid).update({
      banned: shouldBan
    });
    alert('Kullanıcı durumu başarıyla güncellendi.');
    loadForumUsers();
  } catch (err) {
    alert('İşlem başarısız: ' + err.message);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadForumUsers = loadForumUsers;
window.toggleUserBan = toggleUserBan;

document.addEventListener('DOMContentLoaded', () => {
  const forumTab = document.querySelector('[data-tab="forum"]');
  if (forumTab) {
    forumTab.addEventListener('click', loadForumUsers);
  }
});