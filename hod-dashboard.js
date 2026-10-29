(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    let students = [];
    let recommendations = [];
    let currentUserIsHOD = false;

    // ========================================
    // HELPERS
    // ========================================

    const esc = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    function getSemesterNumber(record) {
        const match = String(
            record?.name || record?.semester || ""
        ).match(/\d+/);

        return match ? Number(match[0]) : 0;
    }

    function getLatestSemester(semesters) {
        return [...semesters].sort(
            (a, b) => getSemesterNumber(b) - getSemesterNumber(a)
        )[0] || null;
    }

    function attendancePercentage(records) {
        let attended = 0;
        let total = 0;

        records.forEach(record => {
            attended += Number(record.attended) || 0;
            total += Number(record.total) || 0;
        });

        return total > 0
            ? Math.round(attended / total * 100)
            : null;
    }

    function getStudentName(profile) {
        return profile.fullName ||
            profile.name ||
            profile.displayName ||
            "Student";
    }

    function getStudentUSN(profile) {
        return profile.usn || profile.USN || "—";
    }

    // ========================================
    // LOAD STUDENT RECORDS FROM FIRESTORE
    // ========================================

    async function loadStudentsFromFirestore() {
        const snapshot = await db.collection("students").get();

        const studentDocuments = snapshot.docs;

        students = await Promise.all(
            studentDocuments.map(async document => {
                const data = document.data();

                // The student document ID is the primary identifier.
                // Use the stored UID only as a fallback.
                const studentUid = document.id;

                const profile = {
                    ...data,
                    id: document.id,
                    uid: studentUid
                };

                // Each record collection stores the student's data
                // in a document keyed by their Firebase UID.
                const [
                    academicResult,
                    attendanceResult,
                    achievementResult
                ] = await Promise.allSettled([
                    db.collection("academicRecords")
                        .doc(studentUid)
                        .get(),

                    db.collection("attendanceRecords")
                        .doc(studentUid)
                        .get(),

                    db.collection("achievements")
                        .doc(studentUid)
                        .get()
                ]);

                const academicData =
                    academicResult.status === "fulfilled" &&
                    academicResult.value.exists
                        ? academicResult.value.data()
                        : {};

                const attendanceData =
                    attendanceResult.status === "fulfilled" &&
                    attendanceResult.value.exists
                        ? attendanceResult.value.data()
                        : {};

                const achievementData =
                    achievementResult.status === "fulfilled" &&
                    achievementResult.value.exists
                        ? achievementResult.value.data()
                        : {};

                if (academicResult.status === "rejected") {
                    console.error(
                        "Academic records failed for",
                        studentUid,
                        academicResult.reason
                    );
                }

                if (attendanceResult.status === "rejected") {
                    console.error(
                        "Attendance failed for",
                        studentUid,
                        attendanceResult.reason
                    );
                }

                if (achievementResult.status === "rejected") {
                    console.error(
                        "Achievements failed for",
                        studentUid,
                        achievementResult.reason
                    );
                }

                return {
                    uid: studentUid,
                    profile,

                    academics: Array.isArray(academicData.semesters)
                        ? academicData.semesters
                        : [],

                    attendance: Array.isArray(attendanceData.records)
                        ? attendanceData.records
                        : [],

                    achievements: Array.isArray(achievementData.records)
                        ? achievementData.records
                        : []
                };
            })
        );

        console.log("HOD: Students loaded:", students.length);
        console.log("HOD: Student data:", students);
    }

    // ========================================
    // LOAD MENTORING RECOMMENDATIONS
    // ========================================

    async function loadRecommendationsFromFirestore() {
        const snapshot = await db.collection("recommendations").get();

        recommendations = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        }));

        console.log(
            "HOD: Recommendations loaded:",
            recommendations.length
        );
    }

    // ========================================
    // OVERVIEW STATISTICS
    // ========================================

    function renderOverview() {
        $("hodStudentCount").textContent = students.length;

        const latestCGPAs = students
            .map(student =>
                getLatestSemester(student.academics)?.cgpa
            )
            .filter(value =>
                value !== undefined &&
                value !== null &&
                String(value).trim() !== "" &&
                Number.isFinite(Number(value))
            )
            .map(Number);

        $("hodAverageCGPA").textContent = latestCGPAs.length
            ? (
                latestCGPAs.reduce((sum, value) => sum + value, 0) /
                latestCGPAs.length
            ).toFixed(2)
            : "—";

        // Calculate weighted attendance using total classes.
        const allAttendance = students.flatMap(
            student => student.attendance
        );

        const percentage = attendancePercentage(allAttendance);

        $("hodAverageAttendance").textContent =
            percentage === null ? "—" : percentage + "%";

        $("hodAchievementCount").textContent = students.reduce(
            (sum, student) => sum + student.achievements.length,
            0
        );
    }

    // ========================================
    // DEPARTMENT OVERVIEW
    // ========================================

    function renderDepartment() {
        const departments = [
            ...new Set(
                students
                    .map(student => student.profile.department)
                    .filter(Boolean)
            )
        ];

        $("hodDepartmentName").textContent =
            departments.length
                ? departments.join(", ")
                : "Not specified";

        $("hodDepartmentDescription").textContent =
            students.length
                ? `Overview based on ${students.length} student records.`
                : "No student profiles are currently available.";
    }

    // ========================================
    // STUDENT RECORDS TABLE
    // ========================================

    function renderStudents() {
        const query = $("hodStudentSearch")
            .value.trim().toLowerCase();

        const filtered = students.filter(student => {
            const profile = student.profile;

            return [
                getStudentName(profile),
                getStudentUSN(profile),
                profile.department,
                profile.email
            ].some(value =>
                String(value || "").toLowerCase().includes(query)
            );
        });

        const table = $("hodStudentTable");

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="hod-empty">
                        ${
                            students.length
                                ? "No students match your search."
                                : "No student records found in Firestore."
                        }
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(student => {
            const profile = student.profile;
            const latest = getLatestSemester(student.academics);
            const percentage = attendancePercentage(student.attendance);

            const initials = getStudentName(profile)
                .trim()
                .split(/\s+/)
                .map(part => part[0] || "")
                .slice(0, 2)
                .join("")
                .toUpperCase();

            return `
                <tr>
                    <td>
                        <div class="hod-student-name">
                            <div class="hod-student-avatar">
                                ${esc(initials)}
                            </div>

                            <div>
                                <strong>
                                    ${esc(getStudentName(profile))}
                                </strong>

                                <small>
                                    ${esc(profile.email || "Email not added")}
                                </small>
                            </div>
                        </div>
                    </td>

                    <td>${esc(getStudentUSN(profile))}</td>

                    <td>
                        ${latest && latest.cgpa != null
                            ? esc(latest.cgpa)
                            : "—"}
                    </td>

                    <td>
                        ${percentage === null
                            ? "—"
                            : percentage + "%"}
                    </td>

                    <td>${student.achievements.length}</td>

                    <td>${student.academics.length}</td>
                </tr>
            `;
        }).join("");
    }

    // ========================================
    // ACADEMIC PERFORMANCE
    // ========================================

    function renderAcademicPerformance() {
        const academics = students.flatMap(
            student => student.academics
        );

        $("hodSemesterCount").textContent = academics.length;

        $("hodAcademicAchievements").textContent =
            students.reduce(
                (sum, student) => sum + student.achievements.length,
                0
            );

        const latestCGPAs = students
            .map(student =>
                getLatestSemester(student.academics)?.cgpa
            )
            .filter(value =>
                value !== undefined &&
                value !== null &&
                String(value).trim() !== "" &&
                Number.isFinite(Number(value))
            )
            .map(Number);

        $("hodLatestCGPA").textContent = latestCGPAs.length
            ? (
                latestCGPAs.reduce((sum, value) => sum + value, 0) /
                latestCGPAs.length
            ).toFixed(2)
            : "—";

        const list = $("hodSemesterList");

        if (!academics.length) {
            list.innerHTML = `
                <p class="hod-empty">
                    No semester records available.
                </p>
            `;
            return;
        }

        const sorted = [...academics].sort(
            (a, b) => getSemesterNumber(a) - getSemesterNumber(b)
        );

        list.innerHTML = sorted.map((record, index) => `
            <article class="hod-semester-item">
                <h3>
                    ${esc(
                        record.name ||
                        record.semester ||
                        "Semester " + (index + 1)
                    )}
                </h3>

                <p>SGPA: ${esc(record.sgpa ?? "—")}</p>
                <p>CGPA: ${esc(record.cgpa ?? "—")}</p>
            </article>
        `).join("");
    }

    // ========================================
    // ATTENDANCE OVERVIEW
    // ========================================

    function renderAttendance() {
        const records = students.flatMap(
            student => student.attendance.map(record => ({
                ...record,
                studentName: getStudentName(student.profile),
                studentUSN: getStudentUSN(student.profile)
            }))
        );

        const percentage = attendancePercentage(records);

        $("hodAttendancePercentage").textContent =
            percentage === null ? "—" : percentage + "%";

        $("hodAttendanceBar").style.width =
            (percentage === null ? 0 : percentage) + "%";

        const totalClasses = records.reduce(
            (sum, record) => sum + (Number(record.total) || 0),
            0
        );

        $("hodAttendanceDescription").textContent =
            percentage === null
                ? "No attendance records available."
                : `Based on ${totalClasses} recorded classes.`;

        const table = $("hodAttendanceTable");

        if (!records.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="4" class="hod-empty">
                        No attendance records available.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = records.map(record => {
            const attended = Number(record.attended) || 0;
            const total = Number(record.total) || 0;

            const subjectPercentage = total > 0
                ? Math.round(attended / total * 100)
                : null;

            const subjectName =
                record.name ||
                record.subject ||
                record.subjectName ||
                record.courseName ||
                "Subject";

            return `
                <tr>
                    <td>
                        <strong>${esc(subjectName)}</strong>
                        <br>
                        <small>
                            ${esc(record.studentName)}
                            (${esc(record.studentUSN)})
                        </small>
                    </td>

                    <td>${attended}</td>

                    <td>${total}</td>

                    <td>
                        ${subjectPercentage === null
                            ? "—"
                            : subjectPercentage + "%"}
                    </td>
                </tr>
            `;
        }).join("");
    }

    // ========================================
    // MENTORING OVERVIEW
    // ========================================

    function renderMentoring() {
        const completed = recommendations.filter(
            item => item.status === "Completed"
        ).length;

        const inProgress = recommendations.filter(
            item => item.status === "In Progress"
        ).length;

        const pending = recommendations.filter(
            item => !item.status || item.status === "Pending"
        ).length;

        $("hodRecommendationCount").textContent =
            recommendations.length;

        $("hodCompletedRecommendations").textContent = completed;
        $("hodInProgressRecommendations").textContent = inProgress;
        $("hodPendingRecommendations").textContent = pending;

        const container = $("hodRecommendationList");

        if (!recommendations.length) {
            container.innerHTML = `
                <p class="hod-empty">
                    No mentoring recommendations available.
                </p>
            `;
            return;
        }

        const studentNames = new Map(
            students.map(student => [
                student.uid,
                {
                    name: getStudentName(student.profile),
                    usn: getStudentUSN(student.profile)
                }
            ])
        );

        const sorted = [...recommendations].sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
        });

        container.innerHTML = sorted.map(item => {
            const student = studentNames.get(item.studentUid);

            return `
                <article class="hod-recommendation-item">
                    <div>
                        <h3>${esc(item.title || "Recommendation")}</h3>

                        <p>
                            ${esc(item.details || "No additional details.")}
                        </p>

                        <small>
                            Student: ${esc(student?.name || "Student")}
                            ${student?.usn ? `(${esc(student.usn)})` : ""}
                        </small>

                        <br>

                        <small>
                            Status: ${esc(item.status || "Pending")}
                        </small>
                    </div>
                </article>
            `;
        }).join("");
    }

    // ========================================
    // RENDER DASHBOARD
    // ========================================

    function renderDashboard() {
        renderOverview();
        renderDepartment();
        renderStudents();
        renderAcademicPerformance();
        renderAttendance();
        renderMentoring();

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // ========================================
    // INITIALISE HOD DASHBOARD
    // ========================================

    async function initialiseDashboard(user) {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {
            const userDocument = await db
                .collection("users")
                .doc(user.uid)
                .get();

            if (!userDocument.exists) {
                throw new Error(
                    "Your account was not found in the users collection."
                );
            }

            const role = String(
                userDocument.data().role || ""
            ).trim().toLowerCase();

            if (role !== "hod") {
                throw new Error(
                    "This account is not registered with the HOD role."
                );
            }

            currentUserIsHOD = true;

            await Promise.all([
                loadStudentsFromFirestore(),
                loadRecommendationsFromFirestore()
            ]);

            renderDashboard();

        } catch (error) {
            console.error("HOD dashboard loading failed:", error);

            $("hodStudentTable").innerHTML = `
                <tr>
                    <td colspan="6" class="hod-empty">
                        Could not load dashboard data:
                        ${esc(error.message)}
                    </td>
                </tr>
            `;

            $("hodSemesterList").innerHTML = `
                <p class="hod-empty">
                    Could not load academic records.
                </p>
            `;

            $("hodAttendanceTable").innerHTML = `
                <tr>
                    <td colspan="4" class="hod-empty">
                        Could not load attendance records.
                    </td>
                </tr>
            `;

            $("hodRecommendationList").innerHTML = `
                <p class="hod-empty">
                    Could not load recommendations.
                </p>
            `;
        }
    }

    // ========================================
    // EVENTS
    // ========================================

    $("hodStudentSearch").addEventListener(
        "input",
        renderStudents
    );

    firebase.auth().onAuthStateChanged(initialiseDashboard);
})();