function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let relative = "";
  if (diffDay > 0) relative = `${diffDay}d ago`;
  else if (diffHr > 0) relative = `${diffHr}h ago`;
  else if (diffMin > 0) relative = `${diffMin}m ago`;
  else relative = `${diffSec}s ago`;

  return `${d.toLocaleString()} (${relative})`;
}

function formatSize(bytes) {
  return bytes > 1000
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${bytes.toLocaleString()} bytes`;
}

function estimateSize(value) {
  return new Blob([value]).size;
}

function renderGroup(title, items, showEntries = true) {
  const totalSize = items.reduce((sum, i) => sum + i.size, 0);
  const summary = `
    <h2>${title}</h2>
    <div class="group-summary">
      ${items.length} entries — total size ${formatSize(totalSize)}
      <button class="delete-group" data-group="${title}">Delete All</button>
    </div>
  `;

  if (!showEntries) return summary;

  const tableRows = items
    .map(
      (i) => `
      <tr>
        <td>${i.key}</td>
        <td>${formatTimestamp(i.timestamp)}</td>
        <td>${formatSize(i.size)}</td>
        <td><button data-key="${i.key}" class="delete-entry">Delete</button></td>
      </tr>
    `
    )
    .join("");

  return `
    ${summary}
    <table>
      <thead>
        <tr>
          <th>Key</th>
          <th>Timestamp</th>
          <th>Size</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

function parseLocalStorage() {
  const groups = { company_: [], corp_: [], other: [] };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (!value) continue;

    const size = estimateSize(value);
    let timestamp = null;

    try {
      const parsed = JSON.parse(value);
      if (parsed.timestamp) timestamp = parsed.timestamp;
    } catch {
      // Not JSON
    }

    const entry = { key, size, timestamp };

    if (key.startsWith("company_")) groups.company_.push(entry);
    else if (key.startsWith("corp_")) groups.corp_.push(entry);
    else groups.other.push(entry);
  }

  return groups;
}

function renderStorage() {
  const groups = parseLocalStorage();
  const content = document.getElementById("storageContent");
  content.innerHTML = "";

  for (const [title, items] of Object.entries(groups)) {
    if (items.length === 0) continue;

    const showEntries = title === "other";
    content.insertAdjacentHTML(
      "beforeend",
      renderGroup(title, items, showEntries)
    );
  }

  // Attach delete button handlers
  content.querySelectorAll(".delete-entry").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const key = e.target.dataset.key;
      localStorage.removeItem(key);
      renderStorage();
    })
  );

  content.querySelectorAll(".delete-group").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const group = e.target.dataset.group;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith(group)) {
          localStorage.removeItem(key);
        }
      }
      renderStorage();
    })
  );
}

renderStorage();
