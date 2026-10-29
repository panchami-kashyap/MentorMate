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
function getAllStudents() {
    const students = arr(KEYS.students);

    // Preserve compatibility with the existing single-profile setup.
    const currentProfile = getCurrentProfile();

    if (
        students.length === 0 &&
        Object.values(currentProfile).some(
            value => String(value ?? "").trim() !== ""
        )
    ) {
        return [{
            ...currentProfile,
            id: currentProfile.id || currentProfile.usn || currentProfile.USN || "legacy-student"
        }];
    }

    return students;
}

// Identify the logged-in mentor.
function getCurrentMentor() {
    const email = String(
        localStorage.getItem("mentorMateUser") || ""
    ).trim().toLowerCase();

    const role = String(
        localStorage.getItem("mentorMateRole") || ""
    ).trim().toLowerCase();

    // Do not treat a student or another role as a mentor.
    if (role !== "mentor") {
        return null;
    }

    // Find the registered mentor account.
    return arr(KEYS.mentors).find(mentor =>
        String(mentor.email || mentor.username || "")
            .trim()
            .toLowerCase() === email
    ) || null;
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

function renderProgressOverview() {
    const semesters = arr(KEYS.academics);
    const attendance = arr(KEYS.attendance);
    const achievements = arr(KEYS.achievements);
    const recommendations = arr(KEYS.recommendations);

    // Find the latest semester using its semester number.
    const getSemesterNumber = name => {
        const match = String(name || "").match(/\d+/);
        return match ? Number(match[0]) : 0;
    };

    const latestSemester = [...semesters].sort(
        (a, b) => getSemesterNumber(b.name || b.semester) -
                  getSemesterNumber(a.name || a.semester)
    )[0];

    $("progressCGPA").textContent = latestSemester
        ? Number(latestSemester.cgpa).toFixed(2)
        : "—";

    $("progressSemester").textContent = latestSemester
        ? (latestSemester.name || latestSemester.semester || "Latest semester")
        : "No semester recorded";

    // Overall attendance.
    const percentage = attendancePct(attendance);

    $("progressAttendance").textContent =
        percentage === null ? "—" : percentage + "%";

    $("progressAttendanceBar").style.width =
        (percentage === null ? 0 : percentage) + "%";

    $("progressAttendanceText").textContent =
        percentage === null
            ? "No attendance records"
            : "Based on " +
              attendance.reduce((sum, item) => sum + (Number(item.total) || 0), 0) +
              " classes";

    // Achievement count.
    $("progressAchievements").textContent = achievements.length;

    // Recommendation completion.
    const completed = recommendations.filter(
        item => item.status === "Completed"
    ).length;

    const total = recommendations.length;

    $("progressRecommendations").textContent =
        completed + " / " + total;

    $("progressRecommendationsBar").style.width =
        (total ? completed / total * 100 : 0) + "%";

    $("progressRecommendationsText").textContent =
        total
            ? Math.round(completed / total * 100) + "% completed"
            : "No recommendations yet";
}
function renderMentee() {
    const students = getAllStudents();
    const mentor = getCurrentMentor();
    const query = $("menteeSearch").value.trim().toLowerCase();

    // If a mentor account is identified, show only assigned students.
    // If no mentor account is registered yet, show all students for testing.
    const visibleStudents = mentor
        ? students.filter(student =>
            String(student.mentorId || "") === String(mentor.id)
          )
        : students;

    const filteredStudents = visibleStudents.filter(student => {
        const name = student.fullName || student.name || "Mentee";
        const usn = student.usn || student.USN || "";
        const department = student.department || "";
        const email = student.email || "";

        return [name, usn, department, email].some(value =>
            String(value).toLowerCase().includes(query)
        );
    });

    let totalSemesters = 0;
    let totalAchievements = 0;
    let totalAttended = 0;
    let totalClasses = 0;

    visibleStudents.forEach(student => {
        const semesters = getStudentRecords(KEYS.academics, student);
        const attendance = getStudentRecords(KEYS.attendance, student);
        const achievements = getStudentRecords(KEYS.achievements, student);

        totalSemesters += semesters.length;
        totalAchievements += achievements.length;

        attendance.forEach(record => {
            totalAttended += Number(record.attended) || 0;
            totalClasses += Number(record.total) || 0;
        });
    });

    $("menteeCount").textContent = visibleStudents.length;
    $("semesterCount").textContent = totalSemesters;
    $("achievementCount").textContent = totalAchievements;

    const overallAttendance = totalClasses > 0
        ? Math.round(totalAttended / totalClasses * 100)
        : null;

    $("overallAttendance").textContent =
        overallAttendance === null ? "—" : overallAttendance + "%";

    $("menteeGrid").innerHTML = filteredStudents.map(student => {
        const name = student.fullName || student.name || "Mentee";
        const usn = student.usn || student.USN || "USN not added";

        const semesters = getStudentRecords(KEYS.academics, student);
        const attendance = getStudentRecords(KEYS.attendance, student);
        const achievements = getStudentRecords(KEYS.achievements, student);

        const getSemesterNumber = semester => {
            const match = String(
                semester.name || semester.semester || ""
            ).match(/\d+/);

            return match ? Number(match[0]) : 0;
        };

        const latestSemester = [...semesters].sort(
            (a, b) => getSemesterNumber(b) - getSemesterNumber(a)
        )[0];

        const percentage = attendancePct(attendance);

        const studentId = student.id || student.usn || student.USN ||
            "legacy-student";

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

                    <span class="student-pill">Profile saved</span>
                </div>

                <div class="student-metrics">
                    <div class="student-metric">
                        <span>Latest CGPA</span>
                        <strong>
                            ${esc(
                                latestSemester
                                    ? latestSemester.cgpa ?? "—"
                                    : "—"
                            )}
                        </strong>
                    </div>

                    <div class="student-metric">
                        <span>Attendance</span>
                        <strong>
                            ${percentage === null
                                ? "—"
                                : percentage + "%"}
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
                        data-student-id="${esc(studentId)}">
                        View details
                    </button>
                </div>
            </article>
        `;
    }).join("");

    $("emptyMentees").hidden = filteredStudents.length > 0;
}
function openMenteeDetails(student) {
    if (!student) return;

    const p = student;

    const sem = getStudentRecords(KEYS.academics, student);
    const att = getStudentRecords(KEYS.attendance, student);
    const ach = getStudentRecords(KEYS.achievements, student);

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

            <p><strong>Year:</strong>
                ${esc(p.year || p.currentYear || "Not added")}
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
function renderNotes(){
 const notes=arr(KEYS.notes);
 $("notesList").innerHTML=notes.slice().reverse().map(n=>`<article class="note-item"><div><p>${esc(n.text)}</p><time>${esc(n.createdAt||"")}</time></div><button type="button" class="delete-note" data-note-id="${esc(n.id)}" aria-label="Delete note">🗑</button></article>`).join("");
}
function renderRecommendations(){
 const container=$("mentorRecommendationsList"),items=arr(KEYS.recommendations).slice().reverse();
 container.innerHTML=items.length?items.map(x=>`<article class="mentor-recommendation-item"><div><h3>${esc(x.title)}</h3>${x.details?`<p>${esc(x.details)}</p>`:""}<span class="recommendation-item-meta">${esc(x.status)} · ${esc(x.createdAt||"")}</span></div><div class="recommendation-item-actions"><button data-action="status" data-id="${esc(x.id)}">Update status</button><button data-action="delete" data-id="${esc(x.id)}">Delete</button></div></article>`).join(""):`<p class="empty-dynamic-state">No recommendations added yet.</p>`;
}
$("menteeSearch").addEventListener("input", renderMentee);

$("menteeGrid").addEventListener("click", event => {
    const button = event.target.closest(
        'button[data-action="view-mentee"]'
    );

    if (!button) return;

    const studentId = button.dataset.studentId;

    const student = getAllStudents().find(item =>
        String(
            item.id ||
            item.usn ||
            item.USN ||
            "legacy-student"
        ) === String(studentId)
    );

    if (!student) {
        alert("Could not find this student's profile.");
        return;
    }

    openMenteeDetails(student);
});

$("closeDetail").addEventListener("click", () => {
    $("menteeModal").classList.remove("active");
    $("menteeModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
});

$("menteeModal").addEventListener("click", e => {
    if (e.target === $("menteeModal")) {
        $("menteeModal").classList.remove("active");
        $("menteeModal").setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }
});

document.addEventListener("keydown", e => {
    if (
        e.key === "Escape" &&
        $("menteeModal").classList.contains("active")
    ) {
        $("menteeModal").classList.remove("active");
        $("menteeModal").setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }
});
$("noteForm").addEventListener("submit",e=>{e.preventDefault();const text=$("mentorNote").value.trim();if(!text)return;const notes=arr(KEYS.notes);notes.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),text,createdAt:new Date().toLocaleString("en-IN")});try{localStorage.setItem(KEYS.notes,JSON.stringify(notes));logActivity("Mentor feedback added",text);$("mentorNote").value="";$("noteStatus").textContent="Note saved successfully.";renderNotes()}catch(err){$("noteStatus").textContent="Could not save note."}});
$("notesList").addEventListener("click",e=>{const b=e.target.closest("[data-note-id]");if(!b)return;const notes=arr(KEYS.notes),removed=notes.find(n=>String(n.id)===b.dataset.noteId);localStorage.setItem(KEYS.notes,JSON.stringify(notes.filter(n=>String(n.id)!==b.dataset.noteId)));if(removed)logActivity("Mentor feedback deleted",removed.text);renderNotes()});
$("recommendationForm").addEventListener("submit",e=>{e.preventDefault();const title=$("recommendationTitle").value.trim();if(!title)return;const items=arr(KEYS.recommendations);items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,details:$("recommendationDetails").value.trim(),status:$("recommendationStatus").value,createdAt:new Date().toLocaleString("en-IN")});try{localStorage.setItem(KEYS.recommendations,JSON.stringify(items));logActivity("Recommendation added",title,"target");$("recommendationForm").reset();renderRecommendations()}catch(err){alert("Could not save recommendation. Browser storage may be full.")}});
$("mentorRecommendationsList").addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(!b)return;const items=arr(KEYS.recommendations),i=items.findIndex(x=>String(x.id)===b.dataset.id);if(i<0)return;if(b.dataset.action==="delete"){if(!confirm("Delete this recommendation?"))return;const old=items[i];items.splice(i,1);localStorage.setItem(KEYS.recommendations,JSON.stringify(items));logActivity("Recommendation deleted",old.title,"target")}else{const old=items[i].status;items[i].status=old==="Pending"?"In Progress":old==="In Progress"?"Completed":"Pending";localStorage.setItem(KEYS.recommendations,JSON.stringify(items));logActivity("Recommendation status updated",items[i].title+": "+items[i].status,"target")}renderRecommendations()});
window.addEventListener("storage", () => {
    renderMentee();
    renderNotes();
    renderRecommendations();
    renderProgressOverview();
});

window.addEventListener("focus", () => {
    renderMentee();
    renderNotes();
    renderRecommendations();
    renderProgressOverview();
});

renderMentee();
renderNotes();
renderRecommendations();
renderProgressOverview();

if (window.lucide) {
    lucide.createIcons();
}
})();