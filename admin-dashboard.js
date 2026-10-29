(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    let allStudents = [];

    const esc = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    function getSemesterNumber(record) {
        const name = record.name || record.semester || "";
        return Number(String(name).match(/\d+/)?.[0] || 0);
    }

    function getLatestSemester(records) {
        return [...records].sort(
            (a, b) => getSemesterNumber(b) - getSemesterNumber(a)
        )[0] || null;
    }

    function calculateAttendance(records) {
        let attended = 0;
        let total = 0;

        records.forEach(record => {
            attended += Number(record.attended) || 0;
            total += Number(record.total) || 0;
        });

        return total > 0
            ? Math.round((attended / total) * 100)
            : null;
    }

    function getInitials(name) {
        return String(name || "Student")
            .trim()
            .split(/\s+/)
            .map(part => part[0] || "")
            .slice(0, 2)
            .join("")
            .toUpperCase();
    }

    async function getCollectionData(collectionName) {
        const snapshot = await db.collection(collectionName).get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async function loadAdminDashboard() {
        try {
            if (!firebase.auth().currentUser) {
                throw new Error("No authenticated admin account found.");
            }

            setText("adminStudentCount", "…");
            setText("adminMentorCount", "…");
            setText("adminAcademicCount", "…");
            setText("adminAchievementCount", "…");

            const [
                users,
                students,
                academicRecords,
                attendanceRecords,
                achievements,
                feedback,
                recommendations
            ] = await Promise.all([
                getCollectionData("users"),
                getCollectionData("students"),
                getCollectionData("academicRecords"),
                getCollectionData("attendanceRecords"),
                getCollectionData("achievements"),
                getCollectionData("mentorFeedback"),
                getCollectionData("recommendations")
            ]);

            // Count only accounts explicitly marked as mentors.
            const mentors = users.filter(user =>
                String(user.role || "").toLowerCase() === "mentor"
            );

            allStudents = students.map(student => {
    const studentId = student.id;

const academicDocument = academicRecords.find(
    record =>
        record.id === studentId ||
        record.studentUid === studentId ||
        record.studentUid === student.authUid ||
        record.studentUid === student.uid
);

const attendanceDocument = attendanceRecords.find(
    record =>
        record.id === studentId ||
        record.studentUid === studentId ||
        record.studentUid === student.authUid ||
        record.studentUid === student.uid
);

const achievementDocument = achievements.find(
    record =>
        record.id === studentId ||
        record.studentUid === studentId ||
        record.studentUid === student.authUid ||
        record.studentUid === student.uid
);
    const studentAcademics = academicDocument?.semesters || [];
    const studentAttendance = attendanceDocument?.records || [];
    const studentAchievements = achievementDocument?.records || [];

    console.log("ADMIN STUDENT:", studentId);
    console.log("SEMESTERS FOUND:", studentAcademics.length);
    console.log("ATTENDANCE RECORDS FOUND:", studentAttendance.length);
    console.log("ACHIEVEMENTS FOUND:", studentAchievements.length);

    return {
        profile: student,
        academics: studentAcademics,
        attendance: studentAttendance,
        achievements: studentAchievements,
        feedback: feedback.filter(item =>
    item.studentUid === studentId ||
    item.studentUid === student.authUid ||
    item.studentUid === student.uid
),

recommendations: recommendations.filter(item =>
    item.studentUid === studentId ||
    item.studentUid === student.authUid ||
    item.studentUid === student.uid
)
    };
});
            // Dashboard statistics.
            setText("adminStudentCount", students.length);
            setText("adminMentorCount", mentors.length);
            setText(
                "adminAcademicCount",
                allStudents.reduce(
                    (sum, student) => sum + student.academics.length,
                    0
                )
            );
            setText(
                "adminAchievementCount",
                allStudents.reduce(
                    (sum, student) => sum + student.achievements.length,
                    0
                )
            );

            setText(
                "adminSemesterCount",
                allStudents.reduce(
                    (sum, student) => sum + student.academics.length,
                    0
                )
            );

            setText(
                "adminAttendanceCount",
                allStudents.reduce(
                    (sum, student) => sum + student.attendance.length,
                    0
                )
            );

            setText("adminNotesCount", feedback.length);
            setText("adminRecommendationCount", recommendations.length);

            renderStudents();

            const mentorNote = document.querySelector(
                "#mentors .admin-note"
            );

            if (mentorNote) {
                mentorNote.textContent =
                    `Found ${mentors.length} mentor account(s) in Firestore.`;
            }

            const recordsNote = document.querySelector(
                "#records .section-heading p"
            );

            if (recordsNote) {
                recordsNote.textContent =
                    "Academic records loaded from Firestore.";
            }

            const activityNote = document.querySelector(
                "#activities .section-heading p"
            );

            if (activityNote) {
                activityNote.textContent =
                    "Mentoring activity loaded from Firestore.";
            }

            renderActivity(feedback, recommendations);

            console.log("Admin dashboard loaded from Firestore.");
        } catch (error) {
            console.error("Admin dashboard loading failed:", error);

            const table = $("adminStudentTable");

            if (table) {
                table.innerHTML = `
                    <tr>
                        <td colspan="7" class="admin-empty">
                            Unable to load Firestore data.
                            Check the browser console for details.
                        </td>
                    </tr>
                `;
            }
        }
    }

    function renderStudents() {
        const table = $("adminStudentTable");
        if (!table) return;

        const query = ($("adminStudentSearch")?.value || "")
            .trim()
            .toLowerCase();

        const filtered = allStudents.filter(student => {
            const profile = student.profile;

            return [
                profile.fullName,
                profile.usn,
                profile.department,
                profile.email
            ].some(value =>
                String(value || "").toLowerCase().includes(query)
            );
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="admin-empty">
                        No matching student records found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map((student, index) => {
            const profile = student.profile;
            const latest = getLatestSemester(student.academics);
            const attendance = calculateAttendance(student.attendance);

            // Use stored summary values only if attendance records
            // do not contain attended/total counts.
            const attendanceDisplay = attendance !== null
                ? `${attendance}%`
                : profile.attendance != null
                    ? `${profile.attendance}%`
                    : "—";

            const cgpa = latest?.cgpa ?? profile.cgpa ?? "—";

            return `
                <tr>
                    <td>
                        <div class="admin-student-name">
                            <div class="admin-student-avatar">
                                ${esc(getInitials(profile.fullName))}
                            </div>
                            <div>
                                <strong>
                                    ${esc(profile.fullName || "Student")}
                                </strong>
                                <small>
                                    ${esc(profile.email || "Email not added")}
                                </small>
                            </div>
                        </div>
                    </td>

                    <td>${esc(profile.usn || "—")}</td>
                    <td>${esc(profile.department || "—")}</td>
                    <td>${esc(cgpa)}</td>
                    <td>${esc(attendanceDisplay)}</td>
                    <td>${student.achievements.length}</td>

                    <td>
                        <button
    type="button"
    class="admin-view-button"
    data-student-id="${esc(student.profile.id)}"
>
    View details
</button>
                    </td>
                </tr>
            `;
        }).join("");

    }

    function openStudentDetails(student) {
        const profile = student.profile;
        const latest = getLatestSemester(student.academics);
        const attendance = calculateAttendance(student.attendance);

        setText(
            "adminDetailName",
            profile.fullName || "Student Details"
        );

        setText(
            "adminDetailSubtitle",
            [profile.usn, profile.department]
                .filter(Boolean)
                .join(" · ") || "Student information"
        );

        const academicHTML = student.academics.length
            ? student.academics.map((record, index) => `
                <div class="detail-record">
                    <strong>
                        ${esc(
                            record.name ||
                            record.semester ||
                            `Semester ${index + 1}`
                        )}
                    </strong>
                    <p>CGPA: ${esc(record.cgpa ?? "—")}</p>
                    <p>SGPA: ${esc(record.sgpa ?? "—")}</p>
                </div>
            `).join("")
            : "<p>No academic records available.</p>";

        const achievementHTML = student.achievements.length
            ? student.achievements.map(item => `
                <div class="detail-record">
                    <strong>
                        ${esc(item.title || item.name || "Achievement")}
                    </strong>
                    <p>
                        ${esc(
                            item.organisation ||
                            item.description ||
                            item.category ||
                            "Achievement recorded"
                        )}
                    </p>
                </div>
            `).join("")
            : "<p>No achievements recorded.</p>";

        const feedbackHTML = student.feedback.length
            ? student.feedback.map(item => `
                <div class="detail-record">
                    <strong>Mentor Feedback</strong>
                    <p>${esc(item.text || "No feedback text")}</p>
                </div>
            `).join("")
            : "<p>No mentor feedback recorded.</p>";

        const recommendationHTML = student.recommendations.length
            ? student.recommendations.map(item => `
                <div class="detail-record">
                    <strong>
                        ${esc(item.title || "Recommendation")}
                    </strong>
                    <p>${esc(item.details || "")}</p>
                    <p>Status: ${esc(item.status || "Pending")}</p>
                </div>
            `).join("")
            : "<p>No recommendations recorded.</p>";

        $("adminDetailContent").innerHTML = `
            <div class="detail-section">
                <h3>Profile Information</h3>
                <p><strong>Name:</strong> ${esc(profile.fullName || "—")}</p>
                <p><strong>USN:</strong> ${esc(profile.usn || "—")}</p>
                <p><strong>Email:</strong> ${esc(profile.email || "—")}</p>
                <p><strong>Phone:</strong> ${esc(profile.phone || "—")}</p>
                <p><strong>Department:</strong> ${esc(profile.department || "—")}</p>
                <p><strong>Semester:</strong> ${esc(profile.semester || "—")}</p>
            </div>

            <div class="detail-section">
                <h3>Academic Summary</h3>
                <div class="admin-detail-stat">
                    <article>
                        <span>Latest CGPA</span>
                        <strong>${esc(latest?.cgpa ?? profile.cgpa ?? "—")}</strong>
                    </article>
                    <article>
                        <span>Attendance</span>
                        <strong>${attendance === null
                            ? esc(profile.attendance != null
                                ? `${profile.attendance}%`
                                : "—")
                            : `${attendance}%`}</strong>
                    </article>
                    <article>
                        <span>Semesters</span>
                        <strong>${student.academics.length}</strong>
                    </article>
                    <article>
                        <span>Achievements</span>
                        <strong>${student.achievements.length}</strong>
                    </article>
                </div>
            </div>

            <div class="detail-section">
                <h3>Academic Records</h3>
                ${academicHTML}
            </div>

            <div class="detail-section">
                <h3>Achievements</h3>
                ${achievementHTML}
            </div>

            <div class="detail-section">
                <h3>Mentor Feedback</h3>
                ${feedbackHTML}
            </div>

            <div class="detail-section">
                <h3>Recommendations</h3>
                ${recommendationHTML}
            </div>
        `;

        $("adminStudentModal").classList.add("active");
        $("adminStudentModal").setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeStudentDetails() {
        $("adminStudentModal").classList.remove("active");
        $("adminStudentModal").setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    function renderActivity(feedback, recommendations) {
        const container = $("adminActivityList");
        if (!container) return;

        const activity = [
            ...feedback.map(item => ({
                title: "Mentor feedback added",
                description: item.text || "Feedback recorded for a student.",
                createdAt: item.createdAt,
                icon: "message-square"
            })),
            ...recommendations.map(item => ({
                title: "Recommendation added",
                description: item.title || item.details || "Recommendation recorded.",
                createdAt: item.createdAt,
                icon: "target"
            }))
        ].sort((a, b) => {
            const getTime = value => {
                if (value?.toMillis) return value.toMillis();
                const parsed = new Date(value || 0).getTime();
                return Number.isNaN(parsed) ? 0 : parsed;
            };

            return getTime(b.createdAt) - getTime(a.createdAt);
        }).slice(0, 8);

        if (!activity.length) {
            container.innerHTML = `
                <p class="admin-empty">No recent activity available.</p>
            `;
            return;
        }

        container.innerHTML = activity.map(item => {
            let date = "";

            if (item.createdAt?.toDate) {
                date = item.createdAt.toDate().toLocaleString("en-IN");
            } else if (item.createdAt) {
                const parsed = new Date(item.createdAt);
                if (!Number.isNaN(parsed.getTime())) {
                    date = parsed.toLocaleString("en-IN");
                }
            }

            return `
                <article class="admin-activity-item">
                    <div class="admin-activity-icon">
                        <i data-lucide="${esc(item.icon)}"></i>
                    </div>
                    <div>
                        <h3>${esc(item.title)}</h3>
                        <p>${esc(item.description)}</p>
                        <time>${esc(date)}</time>
                    </div>
                </article>
            `;
        }).join("");

        if (window.lucide) lucide.createIcons();
    }

    // SEARCH STUDENTS
$("adminStudentSearch")?.addEventListener("input", renderStudents);


// OPEN STUDENT DETAILS — EVENT DELEGATION
// OPEN STUDENT DETAILS — EVENT DELEGATION
$("adminStudentTable")?.addEventListener("click", function (event) {
    const button = event.target.closest(".admin-view-button");

    if (!button) return;

    const studentId = button.dataset.studentId;

    const student = allStudents.find(
        item => String(item.profile.id) === String(studentId)
    );

    if (!student) {
        console.error("Student not found:", studentId);
        return;
    }

    openStudentDetails(student);
});

// CLOSE BUTTON
$("adminCloseDetail")?.addEventListener("click", function () {
    closeStudentDetails();
});


// CLOSE WHEN CLICKING THE BACKDROP
$("adminStudentModal")?.addEventListener("click", function (event) {
    if (event.target === $("adminStudentModal")) {
        closeStudentDetails();
    }
});


// CLOSE WITH ESCAPE
document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        $("adminStudentModal")?.classList.contains("active")
    ) {
        closeStudentDetails();
    }
});


// INITIALISE FIREBASE AUTHENTICATION
firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    loadAdminDashboard();
});


// INITIALISE ICONS
if (window.lucide) {
    lucide.createIcons();
}
})();