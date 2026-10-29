(() => {
"use strict";
// ========================================
// MENTORMATE STORAGE CONFIGURATION
// ========================================

const KEYS = {
    profile: "mentorMateProfile",
    students: "mentorMateStudents",
    mentors: "mentorMateMentors",
    academics: "mentorMateAcademicRecords",
    attendance: "mentorMateAttendanceRecords",
    achievements: "mentorMateAchievements",
    notes: "mentorMateMentorNotes",
    recommendations: "mentorMateRecommendations",
    activity: "mentorMateRecentActivity"
};

// Read localStorage safely.
const read = key => {
    try {
        return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
        console.error("Could not read " + key, error);
        return null;
    }
};

// Return an array safely.
const arr = key => {
    const value = read(key);
    return Array.isArray(value) ? value : [];
};

// Escape HTML before displaying stored values.
const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

// Get the current student's profile.
function getCurrentProfile() {
    return read(KEYS.profile) || {};
}

// Get every registered student.
// ========================================
// FIRESTORE-BASED MENTOR AND STUDENT DATA
// ========================================

let firestoreStudents = [];
let currentMentorUid = null;
let isAdminPreview = false;

// Get the currently authenticated mentor
function getCurrentMentor() {
    const user = firebase.auth().currentUser;

    if (!user) {
        return null;
    }

    return {
        uid: user.uid,
        email: user.email || ""
    };
}

// Get students loaded from Firestore
function getAllStudents() {
    return firestoreStudents;
}

// Load only the students assigned to this mentor
async function loadAssignedStudents() {
    const user = firebase.auth().currentUser;

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        // Verify the authenticated user's role in Firestore.
        const userDoc = await db.collection("users")
            .doc(user.uid)
            .get();

        if (!userDoc.exists) {
            throw new Error("User account was not found in Firestore.");
        }

        const role = String(userDoc.data().role || "")
            .trim()
            .toLowerCase();

        const isAdmin = role === "admin";
const isMentor = role === "mentor";

isAdminPreview = isAdmin;

        if (!isAdmin && !isMentor) {
            throw new Error(
                "Only mentors and authorised administrators can access this dashboard."
            );
        }

        // The administrator can view the dashboard, but must not
        // be treated as the actual mentor.
        currentMentorUid = isMentor ? user.uid : null;

        // Load mentees assigned to the actual mentor account.
        let snapshot;

        if (isMentor) {
            snapshot = await db.collection("students")
                .where("mentorId", "==", user.uid)
                .get();
        } else {
            // Admin preview: retrieve student records for viewing.
            snapshot = await db.collection("students")
                .limit(100)
                .get();

            // Display a visible preview notice.
            let notice = document.getElementById("adminPreviewNotice");

            if (!notice) {
                notice = document.createElement("div");
                notice.id = "adminPreviewNotice";
                notice.style.cssText =
                    "padding:12px 16px;margin:16px 0;" +
                    "background:#fff4d6;border:1px solid #f0d98c;" +
                    "border-radius:8px;color:#704f00;";

                notice.textContent =
                    "Administrator Preview Mode — viewing the Mentor Dashboard. " +
                    "Mentor actions are disabled.";
                
                document.querySelector(".mentor-main")
                    ?.prepend(notice);
            }

            // Disable mentor-only forms in preview mode.
            [
                "noteForm",
                "recommendationForm"
            ].forEach(id => {
                const form = document.getElementById(id);

                if (form) {
                    form.querySelectorAll(
                        "input, textarea, select, button"
                    ).forEach(control => {
                        control.disabled = true;
                    });
                }
            });
        }

        firestoreStudents = snapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id,
            id: doc.id
        }));

        // A mentor sees only their assigned mentees.
        // An administrator can preview student records.
        if (isMentor) {
            firestoreStudents = firestoreStudents.filter(
                student => student.mentorId === user.uid
            );
        }

        if (!firestoreStudents.length) {
            $("menteeCount").textContent = "0";
            $("menteeGrid").innerHTML = "";
            $("emptyMentees").hidden = false;

            const title = $("emptyMentees")
                .querySelector("h3");

            if (title) {
                title.textContent = "No mentee records found";
            }

            return;
        }

        await renderMentee();
        await renderProgressOverview();

        // Feedback and recommendations are mentor-specific.
        // Load these only for a real mentor session.
        // Load existing feedback and recommendations for viewing.
// Admin preview is read-only; mentor sessions retain normal functionality.
const firstStudentUid = firestoreStudents[0].uid;

await loadMentorFeedback(firstStudentUid);
await loadMentorRecommendations(firstStudentUid);

    } catch (error) {
        console.error("MENTOR DASHBOARD ERROR:", error);
        alert("Could not load mentor dashboard: " + error.message);
    }
}

// ========================================
// LOAD MENTEE RECORDS FROM FIRESTORE
// ========================================

const menteeRecordsCache = {};

async function loadMenteeRecords(studentUid) {
    if (!studentUid) return null;

    if (menteeRecordsCache[studentUid]) {
        return menteeRecordsCache[studentUid];
    }

    try {
        const [academicDoc, attendanceDoc, achievementDoc] =
            await Promise.all([
                db.collection("academicRecords").doc(studentUid).get(),
                db.collection("attendanceRecords").doc(studentUid).get(),
                db.collection("achievements").doc(studentUid).get()
            ]);

        const academicData = academicDoc.exists
            ? academicDoc.data()
            : {};

        const attendanceData = attendanceDoc.exists
            ? attendanceDoc.data()
            : {};

        const achievementData = achievementDoc.exists
            ? achievementDoc.data()
            : {};

        const records = {
            semesters: Array.isArray(academicData.semesters)
                ? academicData.semesters
                : [],

            attendance: Array.isArray(attendanceData.records)
                ? attendanceData.records
                : [],

            achievements: Array.isArray(achievementData.records)
                ? achievementData.records
                : []
        };

        menteeRecordsCache[studentUid] = records;

        return records;
    } catch (error) {
        console.error(
            "Failed to load records for student:",
            studentUid,
            error
        );

        return null;
    }
}
// Build a student-specific storage key.
function studentStorageKey(baseKey, student) {
    const studentId = String(
        student?.usn ||
        student?.USN ||
        student?.id ||
        "default-student"
    ).trim().toUpperCase();

    return baseKey + "_" + studentId;
}

// Read student-specific records.
// Fall back to the old shared records for compatibility.
function getStudentRecords(baseKey, student) {
    const specificKey = studentStorageKey(baseKey, student);
    const specificRecords = read(specificKey);

    if (Array.isArray(specificRecords)) {
        return specificRecords;
    }

    return arr(baseKey);
}

// Record activity without deleting existing activity.
function logActivity(title, description, icon = "message-square") {
    const activities = arr(KEYS.activity);

    activities.push({
        id: window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : String(Date.now()),
        title,
        description,
        icon,
        createdAt: new Date().toISOString()
    });

    try {
        localStorage.setItem(
            KEYS.activity,
            JSON.stringify(activities.slice(-50))
        );
    } catch (error) {
        console.error("Could not save activity:", error);
    }
}

// Calculate overall attendance percentage.
function attendancePct(items) {
    let attended = 0;
    let total = 0;

    items.forEach(record => {
        attended += Number(record.attended) || 0;
        total += Number(record.total) || 0;
    });

    return total > 0
        ? Math.round(attended / total * 100)
        : null;
}const $=id=>document.getElementById(id);
const requiredElements = [
    "menteeSearch",
    "menteeCount",
    "semesterCount",
    "achievementCount",
    "overallAttendance",
    "menteeGrid",
    "emptyMentees",
    "progressCGPA",
    "progressSemester",
    "progressAttendance",
    "progressAttendanceBar",
    "progressAttendanceText",
    "progressAchievements",
    "progressRecommendations",
    "progressRecommendationsBar",
    "progressRecommendationsText"
];

console.table(
    requiredElements.map(id => ({
        element: id,
        found: document.getElementById(id) !== null
    }))
);

// ========================================
// MENTEE PROGRESS OVERVIEW
// ========================================

// ========================================
// FIRESTORE-BASED PROGRESS OVERVIEW
// ========================================

async function renderProgressOverview() {
    if (!firestoreStudents.length) {
        $("progressCGPA").textContent = "—";
        $("progressSemester").textContent = "No semester recorded";
        $("progressAttendance").textContent = "—";
        $("progressAttendanceBar").style.width = "0%";
        $("progressAttendanceText").textContent = "No attendance records";
        $("progressAchievements").textContent = "0";
        $("progressRecommendations").textContent = "0 / 0";
        $("progressRecommendationsBar").style.width = "0%";
        $("progressRecommendationsText").textContent = "No recommendations yet";
        return;
    }

    // This overview displays the first assigned mentee.
    // The mentee cards and feedback forms support all assigned mentees.
    const student = firestoreStudents[0];

    const records = await loadMenteeRecords(student.uid);

    if (!records) return;

    const semesters = records.semesters;
    const attendance = records.attendance;
    const achievements = records.achievements;

    const getSemesterNumber = item => {
        const match = String(item.name || item.semester || "")
            .match(/\d+/);

        return match ? Number(match[0]) : 0;
    };

    const latestSemester = [...semesters].sort(
        (a, b) => getSemesterNumber(b) - getSemesterNumber(a)
    )[0];

    $("progressCGPA").textContent = latestSemester
        ? Number(latestSemester.cgpa ?? latestSemester.sgpa).toFixed(2)
        : "—";

    $("progressSemester").textContent = latestSemester
        ? latestSemester.name || latestSemester.semester || "Latest semester"
        : "No semester recorded";

    const percentage = attendancePct(attendance);

    $("progressAttendance").textContent =
        percentage === null ? "—" : percentage + "%";

    $("progressAttendanceBar").style.width =
        (percentage ?? 0) + "%";

    $("progressAttendanceText").textContent =
        percentage === null
            ? "No attendance records"
            : "Based on " +
              attendance.reduce(
                  (sum, item) => sum + (Number(item.total) || 0),
                  0
              ) +
              " classes";

    $("progressAchievements").textContent = achievements.length;

    // Recommendations are loaded from Firestore for this mentee.
    try {
        let query = db.collection("recommendations")
    .where("studentUid", "==", student.uid);

if (!isAdminPreview) {
    query = query.where(
        "mentorUid",
        "==",
        currentMentorUid
    );
}

const snapshot = await query.get();

        const total = snapshot.size;

        const completed = snapshot.docs.filter(
            doc => doc.data().status === "Completed"
        ).length;

        $("progressRecommendations").textContent =
            completed + " / " + total;

        $("progressRecommendationsBar").style.width =
            (total ? completed / total * 100 : 0) + "%";

        $("progressRecommendationsText").textContent =
            total
                ? Math.round(completed / total * 100) + "% completed"
                : "No recommendations yet";
    } catch (error) {
        console.error("Could not load recommendation statistics:", error);
    }
}
// ========================================
// RENDER ASSIGNED MENTEES
// ========================================

// ========================================
// RENDER ASSIGNED MENTEES
// ========================================

async function renderMentee() {
    const students = getAllStudents();
    const searchElement = $("menteeSearch");

    const query = searchElement
        ? searchElement.value.trim().toLowerCase()
        : "";

    const visibleStudents = isAdminPreview
    ? students
    : students.filter(student =>
        student.mentorId === currentMentorUid
    );

    const filteredStudents = visibleStudents.filter(student => {
        const name = student.fullName || student.name || "Mentee";
        const usn = student.usn || student.USN || student.id || "";
        const department = student.department || "";
        const email = student.email || "";

        return [name, usn, department, email].some(value =>
            String(value).toLowerCase().includes(query)
        );
    });

    $("menteeCount").textContent = visibleStudents.length;

    let totalSemesters = 0;
    let totalAchievements = 0;
    let totalAttended = 0;
    let totalClasses = 0;

    const cardData = await Promise.all(
        filteredStudents.map(async student => ({
            student,
            records: await loadMenteeRecords(student.uid)
        }))
    );

    const visibleRecordData = await Promise.all(
        visibleStudents.map(async student => ({
            student,
            records: await loadMenteeRecords(student.uid)
        }))
    );

    visibleRecordData.forEach(({ records }) => {
        if (!records) return;

        totalSemesters += records.semesters.length;
        totalAchievements += records.achievements.length;

        records.attendance.forEach(record => {
            totalAttended += Number(record.attended) || 0;
            totalClasses += Number(record.total) || 0;
        });
    });

    $("semesterCount").textContent = totalSemesters;
    $("achievementCount").textContent = totalAchievements;

    $("overallAttendance").textContent = totalClasses
        ? Math.round(totalAttended / totalClasses * 100) + "%"
        : "—";

    $("menteeGrid").innerHTML = cardData.map(({ student, records }) => {
        const name = student.fullName || student.name || "Mentee";
        const usn = student.usn || student.USN || "USN not added";

        const semesters = records?.semesters || [];
        const attendance = records?.attendance || [];
        const achievements = records?.achievements || [];

        const latestSemester = [...semesters].sort((a, b) => {
            const getNumber = item => {
                const match = String(item.name || item.semester || "")
                    .match(/\d+/);

                return match ? Number(match[0]) : 0;
            };

            return getNumber(b) - getNumber(a);
        })[0];

        const percentage = attendancePct(attendance);

        return `
            <article class="mentee-card">
                <div class="student-card-head">
                    <div class="student-avatar">
                        ${esc(
                            name.split(/\s+/)
                                .map(part => part[0] || "")
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                        )}
                    </div>

                    <div>
                        <h3>${esc(name)}</h3>
                        <p>${esc(usn)}</p>
                    </div>

                    <span class="student-pill">Assigned</span>
                </div>

                <div class="student-metrics">
                    <div class="student-metric">
                        <span>Latest CGPA</span>
                        <strong>
                            ${esc(latestSemester?.cgpa ?? student.cgpa ?? "—")}
                        </strong>
                    </div>

                    <div class="student-metric">
                        <span>Attendance</span>
                        <strong>
                            ${percentage === null ? "—" : percentage + "%"}
                        </strong>
                    </div>

                    <div class="student-metric">
                        <span>Achievements</span>
                        <strong>${achievements.length}</strong>
                    </div>
                </div>

                <div class="student-card-actions">
                    <button
                        type="button"
                        class="primary-button"
                        data-action="view-mentee"
                        data-student-id="${esc(student.uid)}">
                        View details
                    </button>
                </div>
            </article>
        `;
    }).join("");

    $("emptyMentees").hidden = filteredStudents.length > 0;
}
// Handle clicks on the dynamically rendered View Details buttons.
$("menteeGrid").addEventListener("click", async function (event) {
    const button = event.target.closest('[data-action="view-mentee"]');

    if (!button) return;

    const studentId = button.dataset.studentId;

    const student = firestoreStudents.find(
        item => item.uid === studentId
    );

    if (!student) {
        alert("Mentee details could not be found.");
        return;
    }

    await openMenteeDetails(student);
});
async function openMenteeDetails(student) {
    if (!student) return;

    const p = student;

    const records = await loadMenteeRecords(student.uid);

if (!records) {
    alert("Could not load the mentee's records from Firestore.");
    return;
}

const sem = records.semesters;
const att = records.attendance;
const ach = records.achievements;

    $("detailName").textContent =
        p.fullName || p.name || "Mentee Profile";

    $("detailSubtitle").textContent =
        (p.usn || p.USN || "USN not added") +
        (p.department ? " · " + p.department : "");

    const pct = attendancePct(att);

    // Sort semesters from latest to earliest.
    const getSemesterNumber = semester => {
        const match = String(
            semester.name || semester.semester || ""
        ).match(/\d+/);

        return match ? Number(match[0]) : 0;
    };

    const sortedSemesters = [...sem].sort(
        (a, b) => getSemesterNumber(b) - getSemesterNumber(a)
    );

    $("detailContent").innerHTML = `
        <div class="detail-section">
            <h3>Profile Information</h3>

            <p><strong>Name:</strong>
                ${esc(p.fullName || p.name || "Not added")}
            </p>

            <p><strong>USN:</strong>
                ${esc(p.usn || p.USN || "Not added")}
            </p>

            <p><strong>Email:</strong>
                ${esc(p.email || "Not added")}
            </p>

            <p><strong>Department:</strong>
                ${esc(p.department || "Not added")}
            </p>

            <p><strong>Semester:</strong>
    ${esc(p.semester || p.currentSemester || "Not added")}
</p>
        </div>

        <div class="detail-section">
            <h3>Academic Records</h3>

            ${
                sortedSemesters.length
                    ? sortedSemesters.map((semester, index) => `
                        <div class="detail-record">
                            <strong>
                                ${esc(
                                    semester.name ||
                                    semester.semester ||
                                    "Semester " + (index + 1)
                                )}
                            </strong>

                            <p>
                                CGPA:
                                ${esc(semester.cgpa ?? "Not available")}
                            </p>
                        </div>
                    `).join("")
                    : "<p>No academic records available.</p>"
            }
        </div>

        <div class="detail-section">
            <h3>Attendance</h3>

            <p>
                <strong>Overall Attendance:</strong>
                ${pct === null ? "No records available" : pct + "%"}
            </p>

            ${
                att.length
                    ? att.map(record => `
                        <div class="detail-record">
                            <strong>
                                ${esc(
                                    record.subject ||
                                    record.subjectName ||
                                    "Subject"
                                )}
                            </strong>

                            <p>
                                Classes attended:
                                ${esc(record.attended ?? 0)} /
                                ${esc(record.total ?? 0)}
                            </p>
                        </div>
                    `).join("")
                    : "<p>No attendance records available.</p>"
            }
        </div>

        <div class="detail-section">
            <h3>Achievements (${ach.length})</h3>

            ${
                ach.length
                    ? ach.map(achievement => `
                        <div class="detail-record">
                            <strong>
                                ${esc(
                                    achievement.title ||
                                    achievement.name ||
                                    "Achievement"
                                )}
                            </strong>

                            <p>
                                ${esc(
                                    achievement.description ||
                                    "No description added."
                                )}
                            </p>
                        </div>
                    `).join("")
                    : "<p>No achievements added yet.</p>"
            }
        </div>
    `;

    $("menteeModal").classList.add("active");
    $("menteeModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}
// ========================================
// CLOSE MENTEE DETAILS MODAL
// ========================================

// Close when the close button is clicked.
$("closeDetail").addEventListener("click", function () {
    $("menteeModal").classList.remove("active");
    $("menteeModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
});

// Close when clicking the modal backdrop.
$("menteeModal").addEventListener("click", function (event) {
    if (event.target === $("menteeModal")) {
        $("menteeModal").classList.remove("active");
        $("menteeModal").setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }
});

// LOAD FEEDBACK FOR SELECTED MENTEE
async function loadMentorFeedback(studentUid) {
    const container = $("notesList");

    if (!studentUid) {
    container.innerHTML =
        '<p class="empty-dynamic-state">Select a mentee to view feedback.</p>';
    return;
}

    try {
        let query = db.collection("mentorFeedback")
    .where("studentUid", "==", studentUid);

if (!isAdminPreview) {
    query = query.where(
        "mentorUid",
        "==",
        currentMentorUid
    );
}

const snapshot = await query.get();


        const notes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
            });

        container.innerHTML = notes.length
            ? notes.map(note => {
                const timestamp = note.createdAt?.toDate
                    ? note.createdAt.toDate().toLocaleString("en-IN")
                    : "Just now";

                return `
                    <article class="note-item">
                        <div>
                            <p>${esc(note.text)}</p>
                            <time>${esc(timestamp)}</time>
                        </div>

                        ${isAdminPreview ? "" : `
    <button
        type="button"
        class="delete-note"
        data-note-id="${esc(note.id)}"
        aria-label="Delete feedback">
        🗑
    </button>
`}
                    </article>
                `;
            }).join("")
            : '<p class="empty-dynamic-state">No feedback for this mentee yet.</p>';

    } catch (error) {
        console.error("Could not load feedback:", error);
        container.innerHTML =
            '<p>Could not load feedback. Please refresh and try again.</p>';
    }
}


// LOAD RECOMMENDATIONS FOR SELECTED MENTEE
async function loadMentorRecommendations(studentUid) {
    const container = $("mentorRecommendationsList");

    if (!studentUid) {
    container.innerHTML =
        '<p class="empty-dynamic-state">Select a mentee to view recommendations.</p>';
    return;
}

    try {
        let query = db.collection("recommendations")
    .where("studentUid", "==", studentUid);

if (!isAdminPreview) {
    query = query.where(
        "mentorUid",
        "==",
        currentMentorUid
    );
}

const snapshot = await query.get();


        const items = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
            });

        container.innerHTML = items.length
            ? items.map(item => {
                const timestamp = item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleString("en-IN")
                    : "Just now";

                return `
                    <article class="mentor-recommendation-item">
                        <div>
                            <h3>${esc(item.title)}</h3>

                            ${item.details
                                ? `<p>${esc(item.details)}</p>`
                                : ""}

                            <span class="recommendation-item-meta">
                                ${esc(item.status)} · ${esc(timestamp)}
                            </span>
                        </div>

                        ${isAdminPreview ? "" : `
    <div class="recommendation-item-actions">
        <button
            type="button"
            data-action="status"
            data-id="${esc(item.id)}">
            Update status
        </button>

        <button
            type="button"
            data-action="delete"
            data-id="${esc(item.id)}">
            Delete
        </button>
    </div>
`}
                    </article>
                `;
            }).join("")
            : '<p class="empty-dynamic-state">No recommendations for this mentee yet.</p>';

    } catch (error) {
        console.error("Could not load recommendations:", error);
        container.innerHTML =
            '<p>Could not load recommendations. Please refresh and try again.</p>';
    }
}

// ========================================
// SHARED MENTEE SELECTION
// ========================================

function getSelectedMenteeUid() {
    return firestoreStudents.length
        ? firestoreStudents[0].uid
        : null;
}




// ========================================
// FEEDBACK EVENT HANDLERS
// ========================================

$("noteForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const studentUid = getSelectedMenteeUid();
    const text = $("mentorNote").value.trim();
    const user = firebase.auth().currentUser;

    if (!studentUid || !text) {
        $("noteStatus").textContent =
            "Select a mentee and enter feedback.";
        return;
    }

    const student = firestoreStudents.find(
        s => s.uid === studentUid &&
             s.mentorId === currentMentorUid
    );

    if (!user || user.uid !== currentMentorUid || !student) {
        $("noteStatus").textContent =
            "Invalid mentor session or mentee assignment.";
        return;
    }

    try {
        $("noteStatus").textContent = "Saving feedback...";

        await db.collection("mentorFeedback").add({
            studentUid,
            mentorUid: user.uid,
            text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        $("mentorNote").value = "";
        $("noteStatus").textContent = "Feedback saved successfully!";

        await loadMentorFeedback(studentUid);

    } catch (error) {
        console.error("Feedback save failed:", error);

        $("noteStatus").textContent =
            "Failed to save feedback: " + error.message;
    }
});


$("notesList").addEventListener("click", async function (event) {
    const button = event.target.closest("[data-note-id]");
    if (!button) return;

    const studentUid = getSelectedMenteeUid();

    if (!studentUid || !confirm("Delete this feedback?")) return;

    try {
        const ref = db.collection("mentorFeedback")
            .doc(button.dataset.noteId);

        const doc = await ref.get();

        if (
            !doc.exists ||
            doc.data().mentorUid !== currentMentorUid ||
            doc.data().studentUid !== studentUid
        ) {
            alert("You cannot delete this feedback.");
            return;
        }

        await ref.delete();
        await loadMentorFeedback(studentUid);

    } catch (error) {
        console.error("Feedback deletion failed:", error);
        alert("Could not delete feedback: " + error.message);
    }
});


// ========================================
// RECOMMENDATION EVENT HANDLERS
// ========================================

// ========================================
// SAVE RECOMMENDATION TO FIRESTORE
// ========================================

$("recommendationForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = $("recommendationStatusMessage");
    const user = firebase.auth().currentUser;

    const studentUid = getSelectedMenteeUid();
    const title = $("recommendationTitle").value.trim();
    const details = $("recommendationDetails").value.trim();
    const status = $("recommendationStatus").value;

    // 1. Verify the authenticated session.
    if (!user) {
        message.textContent = "Please sign in again.";
        return;
    }

    // 2. Prevent administrators from saving recommendations in preview mode.
    if (isAdminPreview) {
        message.textContent =
            "Recommendations cannot be added in administrator preview mode.";
        return;
    }

    // 3. Validate the form.
    if (!studentUid || !title) {
        message.textContent =
            "Select a mentee and enter a recommendation title.";
        return;
    }

    if (!["Pending", "In Progress", "Completed"].includes(status)) {
        message.textContent = "Please select a valid recommendation status.";
        return;
    }

    try {
        message.textContent = "Verifying mentor and mentee assignment...";

        // 4. Confirm that this is a mentor account.
        const mentorDoc = await db.collection("users")
            .doc(user.uid)
            .get();

        if (!mentorDoc.exists) {
            throw new Error("Your user profile was not found in Firestore.");
        }

        const role = String(mentorDoc.data().role || "")
            .trim()
            .toLowerCase();

        if (role !== "mentor") {
            throw new Error(
                `Your Firestore role is "${role}", not "mentor".`
            );
        }

        // 5. Retrieve the exact student document referenced by studentUid.
        const studentDoc = await db.collection("students")
            .doc(studentUid)
            .get();

        if (!studentDoc.exists) {
            throw new Error(
                `Student document "${studentUid}" does not exist in the students collection.`
            );
        }

        const studentData = studentDoc.data();

        // 6. Verify the assignment against Firestore.
        if (studentData.mentorId !== user.uid) {
            console.error("Mentor assignment mismatch:", {
                signedInMentorUid: user.uid,
                assignedMentorId: studentData.mentorId,
                studentDocumentId: studentDoc.id,
                studentData
            });

            throw new Error(
                "This mentee is not assigned to your current mentor account. " +
                "Check the student's mentorId in Firestore."
            );
        }

        // 7. Save only after the checks pass.
        message.textContent = "Saving recommendation...";

        const now = firebase.firestore.FieldValue.serverTimestamp();

        const recommendation = {
            studentUid: studentDoc.id,
            mentorUid: user.uid,
            title: title,
            details: details,
            status: status,
            createdAt: now,
            updatedAt: now
        };

        console.log("Saving recommendation:", {
            studentUid: recommendation.studentUid,
            mentorUid: recommendation.mentorUid,
            title: recommendation.title,
            status: recommendation.status
        });

console.log("========== RECOMMENDATION DEBUG ==========");
console.log("Authenticated UID:", user.uid);
console.log("Mentor role:", role);
console.log("Student document ID:", studentDoc.id);
console.log("Student mentorId:", studentData.mentorId);
console.log("Recommendation payload:", recommendation);

try {
try {
    await db.collection("recommendations").add(recommendation);

    console.log("Recommendation saved successfully!");
} catch (error) {
    console.error("FIRESTORE WRITE ERROR:", error.code, error.message);
    console.error(
        "Rejected recommendation payload:",
        JSON.stringify(recommendation, (key, value) =>
            value && typeof value.toMillis === "function"
                ? value.toMillis()
                : value
        )
    );

    throw error;
}    console.log("Recommendation saved successfully!");
} catch (error) {
    console.error("FIRESTORE WRITE ERROR:", error.code, error.message);
    console.error("Payload that was rejected:", recommendation);
    throw error;
}
        // 8. Refresh the interface.
        $("recommendationForm").reset();

        message.textContent = "Recommendation saved successfully!";

        await loadMentorRecommendations(studentDoc.id);
        await renderProgressOverview();

    } catch (error) {
        console.error("Recommendation save failed:", {
            code: error.code,
            message: error.message
        });

        message.textContent =
            error.code === "permission-denied"
                ? "Permission denied. Check the mentor role, student assignment, and Firestore rules."
                : "Failed to save: " + error.message;
    }
});


$("mentorRecommendationsList").addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const studentUid = getSelectedMenteeUid();
    if (!studentUid) return;

    try {
        const ref = db.collection("recommendations")
            .doc(button.dataset.id);

        const doc = await ref.get();

        if (
            !doc.exists ||
            doc.data().mentorUid !== currentMentorUid ||
            doc.data().studentUid !== studentUid
        ) {
            alert("You cannot modify this recommendation.");
            return;
        }

        if (button.dataset.action === "delete") {
            if (!confirm("Delete this recommendation?")) return;

            await ref.delete();

        } else if (button.dataset.action === "status") {
            const oldStatus = doc.data().status;

            const newStatus =
                oldStatus === "Pending" ? "In Progress" :
                oldStatus === "In Progress" ? "Completed" :
                "Pending";

            await ref.update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        await loadMentorRecommendations(studentUid);
        await renderProgressOverview();

    } catch (error) {
        console.error("Recommendation update failed:", error);
        alert("Could not update recommendation: " + error.message);
    }
});
// Wait for Firebase Authentication before loading private data
firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    await loadAssignedStudents();
});

if (window.lucide) {
    lucide.createIcons();
}
})();