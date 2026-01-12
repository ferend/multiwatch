const videoGrid = document.getElementById("video-grid");
const input = document.getElementById("input");
const submitButton = document.getElementById("submit-button");
const clearAllButton = document.getElementById("clear-all-button");
const errorMessage = document.getElementById("error-message");

const STORAGE_KEY = "videos_v2";
const LAYOUT_KEY = "layout_cols_v1";
const MAX_VIDEOS = 12;

// NEW: layout buttons
const layoutButtons = document.querySelectorAll(".layout-button");

// -------------------- Storage --------------------
let videos = loadVideosFromStorage();

function loadVideosFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVideosToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

// -------------------- UI helpers --------------------
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  clearTimeout(showError._t);
  showError._t = setTimeout(() => {
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
  }, 3000);
}

function safeHostname() {
  return window.location.hostname || "localhost";
}

// -------------------- Layout presets (NEW) --------------------
function getSavedCols() {
  const raw = localStorage.getItem(LAYOUT_KEY);
  const n = Number(raw);
  if ([1, 2, 3].includes(n)) return n;
  return 0; // means auto-fit
}

function setActiveLayoutButton(cols) {
  layoutButtons.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.cols) === cols);
  });
}

function applyGridCols(cols) {
  if (!cols) {
    // default responsive behavior (auto-fit)
    videoGrid.style.gridTemplateColumns = "";
    layoutButtons.forEach((btn) => btn.classList.remove("active"));
    return;
  }

  videoGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  setActiveLayoutButton(cols);
}

function saveCols(cols) {
  localStorage.setItem(LAYOUT_KEY, String(cols));
}

function initLayout() {
  const saved = getSavedCols();
  if (saved) applyGridCols(saved);
  else applyGridCols(0);
}

layoutButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const cols = Number(btn.dataset.cols);
    applyGridCols(cols);
    saveCols(cols);
  });
});

// -------------------- URL parsing --------------------
function parseInputLink(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Please enter a valid URL (https://…)" };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = url.searchParams.get("v");
    if (id && id.length === 11) return { ok: true, type: "youtube", videoId: id };

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx !== -1 && parts[embedIdx + 1]?.length === 11) {
      return { ok: true, type: "youtube", videoId: parts[embedIdx + 1] };
    }

    return { ok: false, error: "Invalid YouTube link" };
  }

  if (host === "youtu.be") {
    const id = url.pathname.replace("/", "");
    if (id.length === 11) return { ok: true, type: "youtube", videoId: id };
    return { ok: false, error: "Invalid YouTube link" };
  }

  // Twitch
  if (host === "twitch.tv" || host.endsWith(".twitch.tv")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const channel = parts[0];
    if (!channel) return { ok: false, error: "Invalid Twitch channel link" };
    return { ok: true, type: "twitch", channel };
  }

  return { ok: false, error: "Only YouTube and Twitch links are supported" };
}

// -------------------- ID generator --------------------
function newId() {
  return crypto.randomUUID?.() || `id_${Date.now()}_${Math.random()}`;
}

// -------------------- Embed builders --------------------
function buildYouTubeEmbed(videoId) {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

function buildTwitchEmbed(channel) {
  return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(
      safeHostname()
  )}`;
}

// -------------------- Rendering --------------------
function renderAll() {
  videoGrid.innerHTML = "";
  videos.forEach(renderOne);
}

function renderOne(video) {
  const container = document.createElement("div");
  container.className = "video-container";
  container.draggable = true;
  container.dataset.id = video.id;

  const iframe = document.createElement("iframe");
  iframe.className = "video-iframe";
  iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;

  iframe.src =
      video.type === "youtube"
          ? buildYouTubeEmbed(video.videoId)
          : buildTwitchEmbed(video.channel);

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-button";
  closeBtn.innerHTML = "×";
  closeBtn.title = "Remove video";

  closeBtn.addEventListener("click", () => {
    videos = videos.filter((v) => v.id !== video.id);
    saveVideosToStorage();
    container.remove();
  });

  // Drag & drop reorder
  container.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", video.id);
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    container.classList.add("drag-over");
  });

  container.addEventListener("dragleave", () => {
    container.classList.remove("drag-over");
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    container.classList.remove("drag-over");

    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId === video.id) return;

    const from = videos.findIndex((v) => v.id === draggedId);
    const to = videos.findIndex((v) => v.id === video.id);
    if (from === -1 || to === -1) return;

    const [moved] = videos.splice(from, 1);
    videos.splice(to, 0, moved);

    saveVideosToStorage();
    renderAll();
  });

  container.append(iframe, closeBtn);
  videoGrid.appendChild(container);
}

// -------------------- Actions --------------------
function addFromInput() {
  const value = input.value.trim();
  if (!value) return showError("Please enter a link");

  if (videos.length >= MAX_VIDEOS) {
    return showError(`Maximum ${MAX_VIDEOS} videos allowed`);
  }

  const parsed = parseInputLink(value);
  if (!parsed.ok) return showError(parsed.error);

  const item = {
    id: newId(),
    type: parsed.type,
    ...(parsed.type === "youtube" ? { videoId: parsed.videoId } : { channel: parsed.channel }),
  };

  videos.push(item);
  saveVideosToStorage();
  renderOne(item);

  input.value = "";
  input.focus();
}

submitButton.addEventListener("click", addFromInput);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addFromInput();
});

clearAllButton.addEventListener("click", () => {
  if (!confirm("Clear all videos?")) return;
  videos = [];
  saveVideosToStorage();
  renderAll();
});

// -------------------- Init --------------------
initLayout();
renderAll();
