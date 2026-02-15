const textarea = document.querySelector("textarea");
const saveBtn = document.querySelector("#save");
const history = document.querySelector("#history");

let authConfig = {};

// 1. Ambil config dari server pas awal load
async function initApp() {

    // --- 1. INITIALIZATION LOGIC ---
    const hash = window.location.hash;
    if (hash.includes("id_token=")) {
        const token = hash.split("&").find(s => s.startsWith("id_token=")).split("=")[1];
        localStorage.setItem("jwt", token);
        window.location.hash = ""; 
    }

    try {
        const res = await fetch('/api/config');
        authConfig = await res.json();
        updateAuthUI();
    } catch (e) {
        console.error("Gagal ambil config auth");
    }
}

function login() {
    // Pake data dari server, bukan hardcode!
    const domain = authConfig.cognitoDomain; 
    const clientId = authConfig.cognitoClientId;
    const redirectUri = encodeURIComponent(window.location.origin);
    
    window.location.href = `https://${domain}/login?client_id=${clientId}&response_type=token&scope=email+openid&redirect_uri=${redirectUri}`;
}

document.addEventListener("DOMContentLoaded", initApp);

// Update UI pas awal load
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    fetchInstanceInfo();
    
    const savedDraft = localStorage.getItem("draft_entry");
    if (savedDraft) textarea.value = savedDraft;
});

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const isActive = sidebar.classList.toggle('active');
    overlay.style.display = isActive ? 'block' : 'none';
}

// --- 2. AUTH FUNCTIONS ---
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (e) { return null; }
}

function logout() {
    localStorage.clear();
    location.reload();
}

function updateAuthUI() {
    const token = localStorage.getItem("jwt");
    if (token) {
        const payload = parseJwt(token);
        if (payload) {
            const username = payload["cognito:username"] || payload.sub.substring(0, 8);
            document.getElementById("current-user").innerText = "Welcome, " + username;
            document.getElementById("auth-screen").style.display = "none";
            document.getElementById("app-content").style.display = "block";
            
            loadEntries();
            return;
        }
    }
    document.getElementById("auth-screen").style.display = "block";
    document.getElementById("app-content").style.display = "none";
}

// --- 3. APP LOGIC ---
textarea.oninput = () => {
    localStorage.setItem("draft_entry", textarea.value);
};
saveBtn.onclick = async () => {
  const content = textarea.value.trim();
  if (!content) return;

  await fetch("/entries", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("jwt")
     },
    body: JSON.stringify({ content })
  });

  localStorage.removeItem("draft_entry");
  textarea.value = "";
  loadEntries();
};

async function loadEntries() {
  const res = await fetch("/entries", {
  headers: {
    "Authorization": "Bearer " + localStorage.getItem("jwt")
  }
});
  const entries = await res.json();

  history.innerHTML = "";
  entries.forEach(e => {
    const d = new Date(e.created_at);
    const box = document.createElement("details");

    box.innerHTML = `
      <summary>
        ${d.toDateString()} – ${d.toLocaleTimeString()}
        <button class="delete-btn" onclick="event.stopPropagation(); deleteEntry('${e.id}')" title="Delete entry">×</button>
      </summary>
      <div class="entry-content">
        <p class="journal-text">${e.content}</p>

        <div class="reflection" id="reflect-${e.id}">
          ${e.reflection
            ? `<strong>${e.mood}</strong><p>${e.reflection}</p>`
            : `<button onclick="event.stopPropagation(); reflect('${e.id}')">振り返りを見る</button>`}
          </div>
      </div>
    `;

    history.appendChild(box);
  });
}

async function deleteEntry(id) {
  if (confirm("削除しますか？")) {
    await fetch(`/entries/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("jwt")
      }
    });
    loadEntries();
  }
}

async function reflect(id) {
  const res = await fetch(`/entries/${id}/reflection`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("jwt")
    }
  });
  const data = await res.json();

  const div = document.getElementById(`reflect-${id}`);
  div.innerHTML = `<strong>${data.mood}</strong><p>${data.text}</p>`;
}

async function fetchInstanceInfo() {
  try {
    const response = await fetch('/api/instance-info');
    const data = await response.json();

    const idElement = document.getElementById('instance-id');
    if (idElement) {
      idElement.innerText = data.instanceId;
    }
  } catch (err) {
    console.error("メタデータの取得に失敗しました:", err);
  }
}