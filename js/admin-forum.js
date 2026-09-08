/**
 * RiseBunny Admin Paneli — Forum Üyeleri Yönetimi
 */

// HTML Karakter Kaçırma (XSS Koruması)
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Forum Kullanıcılarını Firestore'dan Yükle
async function loadForumUsers() {
  const container = document.getElementById('forum-users');
  if (!container) return;

  container.innerHTML = '<div class="msg-empty"><i class="fa-solid fa-spinner fa-spin"></i> Kullanıcılar yükleniyor...</div>';

  try {
    if (typeof db === 'undefined' || !db) {
      throw new Error('Firestore veritabanı bağlantısı hazır değil.');
    }

    // users koleksiyonunu çek
    const snapshot = await db.collection('users').get();
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="msg-empty">Kayıtlı forum üyesi bulunamadı.</div>';
      return;
    }

    let users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    // Arama Filtresi Uygula
    const searchInput = document.getElementById('fu-search');
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

    if (query) {
      users = users.filter(u => 
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.id && u.id.toLowerCase().includes(query))
      );
    }

    if (users.length === 0) {
      container.innerHTML = '<div class="msg-empty">Arama kriterine uygun üye bulunamadı.</div>';
      return;
    }

    // Tabloyu Oluştur
    let html = `
      <table class="admin-table" style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead>
          <tr style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.1); padding:8px;">
            <th style="padding:10px;">Kullanıcı / ID</th>
            <th style="padding:10px;">Rol</th>
            <th style="padding:10px;">Durum</th>
            <th style="padding:10px; text-align:right;">İşlemler</th>
          </tr>
        </thead>
        <tbody>
    `;

    users.forEach(u => {
      const uid = u.id;
      const isDiscordUser = uid.length > 15 && !isNaN(uid);
      const username = escapeHtml(u.username || u.email || 'İsimsiz Kullanıcı');
      const role = escapeHtml(u.role || 'member');
      const isBanned = Boolean(u.banned);

      html += `
        <tr data-uid="${uid}" style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:10px;">
            <strong>${username}</strong>
            <br><small style="color:var(--muted, #888); font-size:0.78rem;">${isDiscordUser ? 'Discord ID: ' : 'UID: '}${uid}</small>
          </td>
          <td style="padding:10px;"><span class="badge badge-role" style="padding:3px 8px; border-radius:4px; font-size:0.8rem; background:rgba(255,255,255,0.1);">${role}</span></td>
          <td style="padding:10px;">
            ${isBanned 
              ? '<span class="badge danger" style="color:#ff4d4d; font-weight:bold;">Banlı</span>' 
              : '<span class="badge success" style="color:#2ecc71; font-weight:bold;">Aktif</span>'}
          </td>
          <td style="padding:10px; text-align:right;">
            <button type="button" onclick="toggleUserBan('${uid}', ${!isBanned})" class="btn btn-sm ${isBanned ? 'btn-primary' : 'btn-outline danger'}" style="padding:5px 10px; font-size:0.8rem; cursor:pointer;">
              ${isBanned ? '<i class="fa-solid fa-unlock"></i> Banı Kaldır' : '<i class="fa-solid fa-ban"></i> Banla'}
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (err) {
    console.error('Forum üyeleri yüklenirken hata oluştu:', err);
    container.innerHTML = `<div class="msg-empty" style="color:#ff4d4d;">Üyeler çekilemedi: ${escapeHtml(err.message)}</div>`;
  }
}

// Ban Aç / Kapa İşlemi
async function toggleUserBan(uid, shouldBan) {
  if (!confirm(`Bu kullanıcının ban durumunu değiştirmek istediğinize emin misiniz?`)) return;
  try {
    await db.collection('users').doc(uid).update({
      banned: shouldBan
    });
    alert('Kullanıcı ban durumu güncellendi.');
    loadForumUsers();
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

// Kurucu Dışındaki Hesapları Temizleme (Purge)
async function purgeForumUsers() {
  const masterUIDs = ['oblLBCNGXEYF8plKq8KUr3m6o4f1', '1310366324731547798'];
  if (!confirm("Kurucu hesapları hariç TÜM forum kullanıcıları silinecek! Emin misiniz?")) return;

  try {
    const snapshot = await db.collection('users').get();
    let count = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
      if (!masterUIDs.includes(doc.id)) {
        batch.delete(doc.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      alert(`${count} adet hesap başarıyla temizlendi.`);
    } else {
      alert("Silinecek ek hesap bulunamadı.");
    }
    loadForumUsers();
  } catch (err) {
    alert("Temizlik hatası: " + err.message);
  }
}

// Global Dışa Aktarımlar
window.loadForumUsers = loadForumUsers;
window.toggleUserBan = toggleUserBan;
window.purgeForumUsers = purgeForumUsers;

// Olay Dinleyicileri Dinamik Bağlama
document.addEventListener('DOMContentLoaded', () => {
  // Arama girdisi eventi
  const searchInput = document.getElementById('fu-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      loadForumUsers();
    });
  }

  // Kalıntı temizleme butonu eventi
  const purgeBtn = document.getElementById('fu-purge');
  if (purgeBtn) {
    purgeBtn.addEventListener('click', purgeForumUsers);
  }
});