const textarea = document.querySelector("textarea");
const saveBtn = document.querySelector("#save");
const history = document.querySelector("#history");

let authConfig = {};

// --- 1. INITIALIZATION LOGIC (Gabungan & Anti-Race Condition) ---
async function initApp() {
    // 1. Ambil Token dari URL dengan pengecekan aman (Fix Error split)
    const hash = window.location.hash;
    if (hash && hash.includes("id_token=")) {
        try {
            const tokenPart = hash.split("&").find(s => s.startsWith("id_token="));
            if (tokenPart) {
                const token = tokenPart.split("=")[1];
                localStorage.setItem("jwt", token);
                window.location.hash = ""; 
            }
        } catch (err) {
            console.error("Gagal parsing token:", err);
        }
    }

    try {
        // 2. Ambil Config & Metadata
        const [configRes, infoRes] = await Promise.all([
            fetch('/api/config'),
            fetch('/api/instance-info')
        ]);

        if (!configRes.ok) throw new Error("Server config error");

        authConfig = await configRes.json();
        const instanceData = await infoRes.json();

        const idElement = document.getElementById('instance-id');
        if (idElement) idElement.innerText = instanceData.instanceId;

        updateAuthUI();
    } catch (e) {
        console.error("Gagal inisialisasi aplikasi:", e);
        // Alert ini bantu biar kita tau kalau fetch-nya gagal
        alert("Gagal konek ke backend. Coba refresh lagi.");
    }
}

// Jalankan initApp begitu halaman siap
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    
    // Draft logic
    const savedDraft = localStorage.getItem("draft_entry");
    if (savedDraft) textarea.value = savedDraft;
});

// --- 2. AUTH FUNCTIONS ---
function login() {
    // Validasi biar gak nembak URL 'undefined'
    if (!authConfig.cognitoDomain || !authConfig.cognitoClientId) {
        alert("Config belum siap, tunggu sebentar atau refresh halaman.");
        return;
    }

    const domain = authConfig.cognitoDomain; 
    const clientId = authConfig.cognitoClientId;
    const redirectUri = encodeURIComponent(window.location.origin);
    
    window.location.href = `https://${domain}/login?client_id=${clientId}&response_type=token&scope=email+openid&redirect_uri=${redirectUri}`;
}

function logout() {
    localStorage.clear();
    location.reload();
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (e) { return null; }
}

function updateAuthUI() {
    const token = localStorage.getItem("jwt");
    if (token) {
        const payload = parseJwt(token);
        // Cek apakah token masih berlaku (opsional tapi bagus)
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

// --- 3. UI HELPERS ---
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const isActive = sidebar.classList.toggle('active');
    overlay.style.display = isActive ? 'block' : 'none';
}

// --- 4. APP LOGIC (Entries & Reflection) ---
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