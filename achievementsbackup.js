const ACHIEVEMENTS_STORAGE_KEY = "mentorMateAchievements";

const grid = document.getElementById("achievementGrid");
const emptyState = document.getElementById("emptyAchievements");
const modal = document.getElementById("achievementModal");
const form = document.getElementById("achievementForm");
const searchInput = document.getElementById("achievementSearch");
const categoryFilter = document.getElementById("categoryFilter");
const imageInput = document.getElementById("achievementImage");
let achievements = loadAchievements();
let pendingImageData = null;

function loadAchievements() {
  try {
    const saved = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load achievements:", error);
    return [];
  }
}

function saveAchievements() {
  try {
    localStorage.setItem(
      ACHIEVEMENTS_STORAGE_KEY,
      JSON.stringify(achievements)
    );
  } catch (error) {
    alert("Could not save this record. The image may be too large. Try a smaller image.");
    console.error("Could not save achievements:", error);
  }
}

// Record achievement changes in Recent Activity.
function logAchievementActivity(title, description) {
  const ACTIVITY_KEY = "mentorMateRecentActivity";
  let activities = [];

  try {
    activities = JSON.parse(
      localStorage.getItem(ACTIVITY_KEY) || "[]"
    );

    if (!Array.isArray(activities)) {
      activities = [];
    }
  } catch (error) {
    console.error("Could not load recent activities:", error);
  }

  activities.push({
    id: window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : String(Date.now()),
    title: title,
    description: description,
    icon: "award",
    createdAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(
      ACTIVITY_KEY,
      JSON.stringify(activities.slice(-50))
    );
  } catch (error) {
    console.error("Could not save recent activity:", error);
  }
}

function makeId() {
  return window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatDate(dateString) {
  if (!dateString) return "Date not set";
  const date = new Date(dateString + "T00:00:00");
  return Number.isNaN(date.getTime()) ? safe(dateString) :
    date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function updateStats() {
  document.getElementById("totalAchievements").textContent = achievements.length;
  document.getElementById("academicAchievements").textContent =
    achievements.filter(item => item.category === "Academic").length;
  document.getElementById("technicalAchievements").textContent =
    achievements.filter(item => item.category === "Technical").length;
  document.getElementById("otherAchievements").textContent =
    achievements.filter(item => !["Academic", "Technical"].includes(item.category)).length;
}

function renderAchievements() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  const visible = achievements
    .filter(item => category === "all" || item.category === category)
    .filter(item => [item.title, item.organisation, item.description, item.category]
      .some(value => String(value || "").toLowerCase().includes(query)))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  grid.innerHTML = "";
  emptyState.hidden = visible.length > 0;

  visible.forEach(item => {
    const card = document.createElement("article");
    card.className = "achievement-card";
    const image = item.image
      ? `<img src="${item.image}" alt="Image for ${safe(item.title)}">`
      : `<i data-lucide="award"></i>`;
    card.innerHTML = `
      <div class="achievement-image">${image}</div>
      <div class="achievement-card-body">
        <div class="achievement-card-top">
          <span class="category-pill">${safe(item.category)}</span>
          <span class="achievement-date">${formatDate(item.date)}</span>
        </div>
        <h3>${safe(item.title)}</h3>
        ${item.organisation ? `<p class="achievement-issuer">${safe(item.organisation)}</p>` : ""}
        ${item.description ? `<p class="achievement-description">${safe(item.description)}</p>` : ""}
      </div>
      <div class="achievement-card-actions">
        <button type="button" data-action="edit" data-id="${safe(item.id)}"><i data-lucide="pencil"></i> Edit</button>
        <button type="button" class="delete-achievement" data-action="delete" data-id="${safe(item.id)}"><i data-lucide="trash-2"></i> Delete</button>
      </div>`;
    grid.appendChild(card);
  });

  updateStats();
  if (window.lucide) lucide.createIcons();
}

function openModal(item = null) {
  form.reset();
  pendingImageData = null;
  document.getElementById("achievementId").value = item ? item.id : "";
  document.getElementById("modalTitle").textContent = item ? "Edit Achievement" : "Add Achievement";
  document.getElementById("achievementTitle").value = item?.title || "";
  document.getElementById("achievementCategory").value = item?.category || "";
  document.getElementById("achievementDate").value = item?.date || "";
  document.getElementById("achievementOrganisation").value = item?.organisation || "";
  document.getElementById("achievementDescription").value = item?.description || "";
  document.getElementById("currentImageNote").hidden = !(item && item.image);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  form.reset();
  pendingImageData = null;
}

document.getElementById("addAchievementBtn").addEventListener("click", () => openModal());
document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});
searchInput.addEventListener("input", renderAchievements);
categoryFilter.addEventListener("change", renderAchievements);

imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];
  pendingImageData = null;
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    imageInput.value = "";
    return;
  }
  if (file.size > 700 * 1024) {
    alert("Please choose an image smaller than 700 KB so it can be saved in your browser.");
    imageInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { pendingImageData = reader.result; };
  reader.onerror = () => alert("Could not read this image. Please try another file.");
  reader.readAsDataURL(file);
});

form.addEventListener("submit", event => {
  event.preventDefault();

  const id = document.getElementById("achievementId").value;
  const old = achievements.find(item => item.id === id);
  const record = {
    id: id || makeId(),
    title: document.getElementById("achievementTitle").value.trim(),
    category: document.getElementById("achievementCategory").value,
    date: document.getElementById("achievementDate").value,
    organisation: document.getElementById("achievementOrganisation").value.trim(),
    description: document.getElementById("achievementDescription").value.trim(),
    image: pendingImageData || old?.image || ""
  };

  if (!record.title || !record.category || !record.date) {
    alert("Please fill in the title, category and date.");
    return;
  }

  if (id) {
  const index = achievements.findIndex(item => item.id === id);

  if (index !== -1) {
    achievements[index] = record;

    logAchievementActivity(
      "Achievement updated",
      record.title + " updated"
    );
  }
} else {
  achievements.push(record);

  logAchievementActivity(
    "Achievement added",
    record.title + " added"
  );
}

  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achievements));
  } catch (error) {
    alert("Could not save the record. Please use a smaller image and try again.");
    if (id && old) {
      const index = achievements.findIndex(item => item.id === id);
      if (index !== -1) achievements[index] = old;
    } else {
      achievements = achievements.filter(item => item.id !== record.id);
    }
    return;
  }

  closeModal();
  renderAchievements();
});

grid.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = achievements.find(record => record.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openModal(item);
  } else if (button.dataset.action === "delete") {
  if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) {
    return;
  }

  const deletedTitle = item.title;

  achievements = achievements.filter(
    record => record.id !== item.id
  );

  saveAchievements();

  logAchievementActivity(
    "Achievement deleted",
    deletedTitle + " deleted"
  );

  renderAchievements();
}
});

renderAchievements();
if (window.lucide) lucide.createIcons();
