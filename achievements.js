// ========================================
// STUDENT-SPECIFIC ACHIEVEMENT STORAGE
// ========================================

const ACHIEVEMENTS_STORAGE_KEY = "mentorMateAchievements";

function getCurrentStudentId() {
    let profile = {};

    try {
        profile = JSON.parse(
            localStorage.getItem("mentorMateProfile") || "{}"
        );
    } catch (error) {
        console.error("Could not load student profile:", error);
    }

    return String(
        profile.usn ||
        profile.USN ||
        profile.id ||
        "default-student"
    ).trim().toUpperCase();
}

const CURRENT_STUDENT_ID = getCurrentStudentId();

const STUDENT_ACHIEVEMENTS_KEY =
    ACHIEVEMENTS_STORAGE_KEY + "_" + CURRENT_STUDENT_ID;


// ========================================
// LOAD AND MIGRATE ACHIEVEMENTS
// ========================================

function loadAchievements() {
    try {
        const studentSaved = localStorage.getItem(
            STUDENT_ACHIEVEMENTS_KEY
        );

        const legacySaved = localStorage.getItem(
            ACHIEVEMENTS_STORAGE_KEY
        );

        const studentRecords = studentSaved
            ? JSON.parse(studentSaved)
            : [];

        const legacyRecords = legacySaved
            ? JSON.parse(legacySaved)
            : [];

        const currentRecords = Array.isArray(studentRecords)
            ? studentRecords
            : [];

        const oldRecords = Array.isArray(legacyRecords)
            ? legacyRecords
            : [];

        const combined = [...currentRecords];

        // Prevent duplicate records using their IDs.
        const existingIds = new Set(
            combined.map(item => String(item.id))
        );

        oldRecords.forEach(item => {
            if (!existingIds.has(String(item.id))) {
                combined.push(item);
                existingIds.add(String(item.id));
            }
        });

        // Save the merged records without deleting the old data.
        localStorage.setItem(
            STUDENT_ACHIEVEMENTS_KEY,
            JSON.stringify(combined)
        );

        return combined;

    } catch (error) {
        console.error("Could not load achievements:", error);
        return [];
    }
}


// ========================================
// DOM ELEMENTS AND STATE
// ========================================

const grid = document.getElementById("achievementGrid");
const emptyState = document.getElementById("emptyAchievements");
const modal = document.getElementById("achievementModal");
const form = document.getElementById("achievementForm");
const searchInput = document.getElementById("achievementSearch");
const categoryFilter = document.getElementById("categoryFilter");
const imageInput = document.getElementById("achievementImage");

let achievements = loadAchievements();
let pendingImageData = null;


// ========================================
// SAVE ACHIEVEMENTS
// ========================================

// ========================================
// SAVE ACHIEVEMENTS TO FIRESTORE
// ========================================

async function saveAchievements() {
    const user = firebase.auth().currentUser;

    if (!user) {
        alert("Please log in again.");
        return false;
    }

    try {
        await db.collection("achievements")
            .doc(user.uid)
            .set({
                studentUid: user.uid,
                records: achievements,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        localStorage.setItem(
            STUDENT_ACHIEVEMENTS_KEY,
            JSON.stringify(achievements)
        );

        console.log("Achievements saved to Firebase.");
        return true;

    } catch (error) {
        console.error("Could not save achievements:", error);

        alert(
            "Could not save achievements to Firebase: " +
            error.message
        );

        return false;
    }
}

async function loadAchievementsFromFirestore() {
    const user = firebase.auth().currentUser;

    if (!user) {
        throw new Error("Please log in again.");
    }

    const document = await db.collection("achievements")
        .doc(user.uid)
        .get();

    if (document.exists) {
        const data = document.data();

        achievements = Array.isArray(data.records)
            ? data.records
            : [];
    } else if (achievements.length > 0) {
        // Migrate existing local achievements to Firestore.
        const saved = await saveAchievements();

        if (!saved) {
            throw new Error(
                "Existing achievements could not be migrated to Firebase."
            );
        }
    }

    localStorage.setItem(
        STUDENT_ACHIEVEMENTS_KEY,
        JSON.stringify(achievements)
    );

    renderAchievements();
}
// ========================================
// RECENT ACTIVITY
// ========================================

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
        id: window.crypto &&
            typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : String(Date.now()),

        title,
        description,
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


// ========================================
// HELPER FUNCTIONS
// ========================================

function makeId() {
    return window.crypto &&
        typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : Date.now().toString(36) +
          Math.random().toString(36).slice(2);
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(dateString) {
    if (!dateString) return "Date not set";

    const date = new Date(dateString + "T00:00:00");

    return Number.isNaN(date.getTime())
        ? safe(dateString)
        : date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}


// ========================================
// UPDATE STATISTICS
// ========================================

function updateStats() {
    document.getElementById("totalAchievements").textContent =
        achievements.length;

    document.getElementById("academicAchievements").textContent =
        achievements.filter(
            item => item.category === "Academic"
        ).length;

    document.getElementById("technicalAchievements").textContent =
        achievements.filter(
            item => item.category === "Technical"
        ).length;

    document.getElementById("otherAchievements").textContent =
        achievements.filter(
            item => !["Academic", "Technical"].includes(item.category)
        ).length;
}


// ========================================
// RENDER ACHIEVEMENTS
// ========================================

function renderAchievements() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;

    const visible = achievements
        .filter(item =>
            category === "all" || item.category === category
        )
        .filter(item =>
            [
                item.title,
                item.organisation,
                item.description,
                item.category
            ].some(value =>
                String(value || "").toLowerCase().includes(query)
            )
        )
        .sort((a, b) =>
            (b.date || "").localeCompare(a.date || "")
        );

    grid.innerHTML = "";
    emptyState.hidden = visible.length > 0;

    visible.forEach(item => {
        const card = document.createElement("article");
        card.className = "achievement-card";

        const image = item.image
            ? `<img src="${item.image}" alt="Image for ${safe(item.title)}">`
            : `<i data-lucide="award"></i>`;

        card.innerHTML = `
            <div class="achievement-image">
                ${image}
            </div>

            <div class="achievement-card-body">
                <div class="achievement-card-top">
                    <span class="category-pill">
                        ${safe(item.category)}
                    </span>

                    <span class="achievement-date">
                        ${formatDate(item.date)}
                    </span>
                </div>

                <h3>${safe(item.title)}</h3>

                ${
                    item.organisation
                        ? `<p class="achievement-issuer">
                            ${safe(item.organisation)}
                           </p>`
                        : ""
                }

                ${
                    item.description
                        ? `<p class="achievement-description">
                            ${safe(item.description)}
                           </p>`
                        : ""
                }
            </div>

            <div class="achievement-card-actions">
                <button
                    type="button"
                    data-action="edit"
                    data-id="${safe(item.id)}">
                    <i data-lucide="pencil"></i> Edit
                </button>

                <button
                    type="button"
                    class="delete-achievement"
                    data-action="delete"
                    data-id="${safe(item.id)}">
                    <i data-lucide="trash-2"></i> Delete
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    updateStats();

    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ========================================
// OPEN AND CLOSE MODAL
// ========================================

function openModal(item = null) {
    form.reset();
    pendingImageData = null;

    document.getElementById("achievementId").value =
        item ? item.id : "";

    document.getElementById("modalTitle").textContent =
        item ? "Edit Achievement" : "Add Achievement";

    document.getElementById("achievementTitle").value =
        item?.title || "";

    document.getElementById("achievementCategory").value =
        item?.category || "";

    document.getElementById("achievementDate").value =
        item?.date || "";

    document.getElementById("achievementOrganisation").value =
        item?.organisation || "";

    document.getElementById("achievementDescription").value =
        item?.description || "";

    document.getElementById("currentImageNote").hidden =
        !(item && item.image);

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function closeModal() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    form.reset();
    pendingImageData = null;
}


// ========================================
// EVENT LISTENERS
// ========================================

document.getElementById("addAchievementBtn")
    .addEventListener("click", () => openModal());

document.querySelectorAll("[data-close-modal]")
    .forEach(button => {
        button.addEventListener("click", closeModal);
    });

modal.addEventListener("click", event => {
    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        modal.classList.contains("show")
    ) {
        closeModal();
    }
});

searchInput.addEventListener("input", renderAchievements);
categoryFilter.addEventListener("change", renderAchievements);


// ========================================
// IMAGE UPLOAD
// ========================================

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
        alert(
            "Please choose an image smaller than 700 KB " +
            "so it can be saved in your browser."
        );

        imageInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        pendingImageData = reader.result;
    };

    reader.onerror = () => {
        alert("Could not read this image. Please try another file.");
    };

    reader.readAsDataURL(file);
});


// ========================================
// ADD OR EDIT ACHIEVEMENT
// ========================================

form.addEventListener("submit", async event => {
      event.preventDefault();

    const id = document.getElementById("achievementId").value;

    const old = achievements.find(item => item.id === id);

    const record = {
        id: id || makeId(),

        title: document.getElementById("achievementTitle")
            .value.trim(),

        category: document.getElementById("achievementCategory")
            .value,

        date: document.getElementById("achievementDate").value,

        organisation: document.getElementById("achievementOrganisation")
            .value.trim(),

        description: document.getElementById("achievementDescription")
            .value.trim(),

        image: pendingImageData || old?.image || ""
    };

    if (!record.title || !record.category || !record.date) {
        alert("Please fill in the title, category and date.");
        return;
    }

    // Keep a copy so we can roll back if saving fails.
    const previousAchievements = [...achievements];

    if (id) {
        const index = achievements.findIndex(
            item => item.id === id
        );

        if (index !== -1) {
            achievements[index] = record;
        } else {
            alert("Achievement not found. Please refresh the page.");
            return;
        }
    } else {
        achievements.push(record);
    }

    if (!(await saveAchievements())) {
    achievements = previousAchievements;
    return;
}
    logAchievementActivity(
        id ? "Achievement updated" : "Achievement added",
        record.title + (id ? " updated" : " added")
    );

    closeModal();
    renderAchievements();
});


// ========================================
// EDIT OR DELETE ACHIEVEMENT
// ========================================

// ========================================
// EDIT OR DELETE ACHIEVEMENT
// ========================================

grid.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const item = achievements.find(
        record => record.id === button.dataset.id
    );

    if (!item) return;

    if (button.dataset.action === "edit") {
        openModal(item);
        return;
    }

    if (button.dataset.action === "delete") {
        if (!confirm(
            `Delete "${item.title}"? This cannot be undone.`
        )) {
            return;
        }

        const previousAchievements = [...achievements];
        const deletedTitle = item.title;

        achievements = achievements.filter(
            record => record.id !== item.id
        );

        const success = await saveAchievements();

        if (!success) {
            achievements = previousAchievements;
            renderAchievements();
            return;
        }

        logAchievementActivity(
            "Achievement deleted",
            deletedTitle + " deleted"
        );

        renderAchievements();
    }
});

// ========================================
// INITIALISE FROM FIRESTORE
// ========================================

firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
        console.error("No authenticated user found.");
        return;
    }

    try {
        await loadAchievementsFromFirestore();

        console.log("Achievements loaded from Firebase.");
    } catch (error) {
        console.error("Could not load achievements:", error);

        alert(
            "Could not load achievements from Firebase: " +
            error.message
        );

        // Keep the existing local records visible if loading fails.
        renderAchievements();
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
});