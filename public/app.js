const textarea = document.querySelector("textarea");
const saveBtn = document.querySelector("#save");
const history = document.querySelector("#history");

saveBtn.onclick = async () => {
  const content = textarea.value.trim();
  if (!content) return;

  await fetch("/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  textarea.value = "";
  loadEntries();
};

async function loadEntries() {
  const res = await fetch("/entries");
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
    await fetch(`/entries/${id}`, { method: "DELETE" });
    loadEntries();
  }
}

async function reflect(id) {
  const res = await fetch(`/entries/${id}/reflection`, { method: "POST" });
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

loadEntries();
fetchInstanceInfo();