const textarea = document.querySelector("textarea");
const saveBtn = document.querySelector("#save");
const history = document.querySelector("#history");
let authConfig = {};

// --- CORE AUTH ---
function getAndSaveToken() {
    const hash = window.location.hash;
    if (hash && hash.includes("id_token=")) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get("id_token");
        if (token) {
            localStorage.setItem("jwt", token);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

function updateAuthUI() {
    const token = localStorage.getItem("jwt");
    const authScreen = document.getElementById("auth-screen");
    const appContent = document.getElementById("app-content");

    if (token) {
        const payload = parseJwt(token);
        if (payload) {
            const username = payload["cognito:username"] || payload.email || "User";
            document.getElementById("current-user").innerText = "Welcome, " + username;
            authScreen.style.display = "none";
            appContent.style.display = "block";
            loadEntries();
            return;
        }
    }
    authScreen.style.display = "flex";
    appContent.style.display = "none";
}

// --- INIT ---
async function initApp() {
    // FIX 1 LOAD TOKEN FIRST
    getAndSaveToken();
    updateAuthUI();

    // THEN LOAD CONFIG
    try {
        const [configRes, infoRes] = await Promise.all([
            fetch('/api/config').catch(() => null),
            fetch('/api/instance-info').catch(() => null)
        ]);

        if (configRes && configRes.ok) authConfig = await configRes.json();
        
        if (infoRes && infoRes.ok) {
            const instanceData = await infoRes.json();
            const idElement = document.getElementById('instance-id');
            if (idElement) idElement.innerText = instanceData.instanceId;
        }
    } catch (e) {
        console.warn("Background fetch failed, but app still usable.");
    }
}

document.addEventListener("DOMContentLoaded", initApp);

// --- HELPER FUNCTIONS ---
function login() {
    if (!authConfig.cognitoDomain) return alert("Sabar, sistem lagi booting...");
    const domain = authConfig.cognitoDomain; 
    const clientId = authConfig.cognitoClientId;
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `https://${domain}/login?client_id=${clientId}&response_type=token&scope=email+openid&redirect_uri=${redirectUri}`;
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (e) { return null; }
}

function logout() {
    localStorage.clear();
    window.location.href = window.location.origin;
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const hamburger = document.getElementById('hamburger-btn');
    
    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
    hamburger.classList.toggle('active', isActive);
}

// --- APP LOGIC ---
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