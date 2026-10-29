
const STORAGE_KEY = "mentorMateAcademicRecords";

const semesterContainer = document.getElementById("semesterContainer");
const emptySemesters = document.getElementById("emptySemesters");

const semesterModal = document.getElementById("semesterModal");
const subjectModal = document.getElementById("subjectModal");

const semesterForm = document.getElementById("semesterForm");
const subjectForm = document.getElementById("subjectForm");

let semesters = loadSemesters();


/* INITIAL SAMPLE DATA */

function getInitialSemesters() {
    return [
        {
            id: "semester-1",
            name: "1st Semester",
            year: "2023-2024",
            sgpa: 9.05,
            cgpa: 9.05,
            backlogs: 0,
            subjects: [
                {
                    id: "subject-101",
                    name: "Database Management Systems",
                    code: "IS1092",
                    internal: 45,
                    internalMax: 50,
                    exam: 46,
                    examMax: 50,
                    grade: "O"
                },
                {
                    id: "subject-102",
                    name: "Programming Fundamentals",
                    code: "CS101",
                    internal: 44,
                    internalMax: 50,
                    exam: 45,
                    examMax: 50,
                    grade: "O"
                }
            ]
        },
        {
            id: "semester-2",
            name: "2nd Semester",
            year: "2023-2024",
            sgpa: 9.20,
            cgpa: 9.12,
            backlogs: 0,
            subjects: []
        },
        {
            id: "semester-3",
            name: "3rd Semester",
            year: "2024-2025",
            sgpa: 9.35,
            cgpa: 9.20,
            backlogs: 0,
            subjects: []
        },
        {
            id: "semester-4",
            name: "4th Semester",
            year: "2025-2026",
            sgpa: 9.40,
            cgpa: 9.26,
            backlogs: 0,
            subjects: []
        }
    ];
}


/* LOAD AND SAVE */

function loadSemesters() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = getInitialSemesters();

    if (!saved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }

    try {
        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return initial;
        }

        // Keep existing records and remove duplicate semester names.
        const uniqueSemesters = [];

        parsed.forEach(function (semester) {
            if (!semester || !semester.name) return;

            const existingIndex = uniqueSemesters.findIndex(function (item) {
                return item.name === semester.name;
            });

            if (existingIndex === -1) {
                uniqueSemesters.push(semester);
            }
        });

        // Add only semesters that are missing.
        initial.forEach(function (sample) {
            const exists = uniqueSemesters.some(function (item) {
                return item.name === sample.name;
            });

            if (!exists) {
                uniqueSemesters.push(sample);
            }
        });

        uniqueSemesters.forEach(function (semester) {
            if (!Array.isArray(semester.subjects)) {
                semester.subjects = [];
            }
        });

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(uniqueSemesters)
        );

        return uniqueSemesters;

    } catch (error) {
        console.error("Error loading academic records:", error);
        return initial;
    }
}

function saveSemesters() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(semesters)
    );
}

// Record academic changes in the Recent Activity section.
function logAcademicActivity(title, description) {
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
        icon: "book-open",
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


/* HELPER FUNCTIONS */

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}


function findSemester(semesterId) {
    return semesters.find(function (semester) {
        return semester.id === semesterId;
    });
}


function getTotalMarks(subject) {
    return Number(subject.internal) + Number(subject.exam);
}


function getSemesterNumber(name) {
    const match = String(name).match(/\d+/);

    return match ? Number(match[0]) : 0;
}


/* RENDER SEMESTERS */

function renderSemesters(openSemesterId = null) {
    if (!semesterContainer) {
        console.error("Cannot find #semesterContainer in academic-records.html");
        return;
    }

    semesterContainer.innerHTML = "";

    const sortedSemesters = [...semesters].sort(function (a, b) {
        return getSemesterNumber(a.name) - getSemesterNumber(b.name);
    });

    if (emptySemesters) {
        emptySemesters.hidden = sortedSemesters.length > 0;
    }

    sortedSemesters.forEach(function (semester) {
        const card = createSemesterCard(semester);

        // Open the requested semester; open the first semester on initial load.
        if (
            semester.id === openSemesterId ||
            (!openSemesterId && semester.name === "1st Semester")
        ) {
            card.classList.add("open");
        }

        semesterContainer.appendChild(card);
    });

    updateSummary();

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    console.log("Academic records rendered:", sortedSemesters);
}

/* CREATE SEMESTER CARD */

function createSemesterCard(semester) {
    const card = document.createElement("article");

    card.className = "semester-card";
    card.dataset.semesterId = semester.id;

    const backlogClass = Number(semester.backlogs) === 0
        ? "backlog-zero"
        : "backlog-positive";

    const subjectRows = semester.subjects.map(function (subject) {
        return `
            <tr>
                <td>${escapeHTML(subject.name)}</td>

                <td>${escapeHTML(subject.code)}</td>

                <td>
                    ${escapeHTML(subject.internal)}
                    /
                    ${escapeHTML(subject.internalMax)}
                </td>

                <td>
                    ${escapeHTML(subject.exam)}
                    /
                    ${escapeHTML(subject.examMax)}
                </td>

                <td>
                    <strong>${escapeHTML(getTotalMarks(subject))}</strong>
                </td>

                <td>
                    <span class="grade-badge">
                        ${escapeHTML(subject.grade)}
                    </span>
                </td>

                <td>
                    <div class="subject-actions">

                        <button
                            class="subject-action-button"
                            type="button"
                            data-action="edit-subject"
                            data-semester-id="${escapeHTML(semester.id)}"
                            data-subject-id="${escapeHTML(subject.id)}"
                            title="Edit subject">

                            <i data-lucide="pencil"></i>

                        </button>

                        <button
                            class="subject-action-button delete"
                            type="button"
                            data-action="delete-subject"
                            data-semester-id="${escapeHTML(semester.id)}"
                            data-subject-id="${escapeHTML(subject.id)}"
                            title="Delete subject">

                            <i data-lucide="trash-2"></i>

                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");

    card.innerHTML = `
        <div class="semester-summary">

            <div class="semester-main-row">

                <div class="semester-title-area">

                    <button
                        class="expand-button"
                        type="button"
                        data-action="toggle-semester"
                        aria-label="Expand semester">

                        <i data-lucide="chevron-down"></i>

                    </button>

                    <div>
                        <h3>${escapeHTML(semester.name)}</h3>

                        <p>
                            Academic Year:
                            ${escapeHTML(semester.year)}
                        </p>
                    </div>

                </div>

                <div class="semester-actions">

                    <button
                        class="edit-button"
                        type="button"
                        data-action="edit-semester"
                        data-semester-id="${escapeHTML(semester.id)}">

                        <i data-lucide="pencil"></i>
                        Edit

                    </button>

                    <button
                        class="delete-button"
                        type="button"
                        data-action="delete-semester"
                        data-semester-id="${escapeHTML(semester.id)}">

                        <i data-lucide="trash-2"></i>
                        Delete

                    </button>

                </div>

            </div>

            <div class="semester-metrics">

                <div class="metric">
                    <span>SGPA</span>
                    <strong>${escapeHTML(semester.sgpa)}</strong>
                </div>

                <div class="metric">
                    <span>CGPA</span>
                    <strong>${escapeHTML(semester.cgpa)}</strong>
                </div>

                <div class="metric">
                    <span>Backlogs</span>

                    <strong class="${backlogClass}">
                        ${escapeHTML(semester.backlogs)}
                    </strong>
                </div>

            </div>

        </div>

        <div class="semester-details">

            <div class="subject-section-heading">

                <div>
                    <h4>Subject-wise Marks</h4>

                    <p>
                        ${semester.subjects.length}
                        subject${semester.subjects.length === 1 ? "" : "s"}
                        recorded
                    </p>
                </div>

                <button
                    class="primary-button"
                    type="button"
                    data-action="add-subject"
                    data-semester-id="${escapeHTML(semester.id)}">

                    <i data-lucide="plus"></i>
                    Add Subject Marks

                </button>

            </div>

            ${
                semester.subjects.length > 0
                ? `
                    <div class="subject-table-wrapper">

                        <table class="subject-table">

                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Code</th>
                                    <th>Internal</th>
                                    <th>Examination</th>
                                    <th>Total</th>
                                    <th>Grade</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>${subjectRows}</tbody>

                        </table>

                    </div>
                `
                : `
                    <div class="no-subjects">
                        No subject marks have been added for this semester yet.
                        Click "Add Subject Marks" to enter them.
                    </div>
                `
            }

        </div>
    `;

    return card;
}


/* UPDATE SUMMARY CARDS */

function updateSummary() {
    const latestSemester = [...semesters].sort(function (a, b) {
        return getSemesterNumber(b.name) -
            getSemesterNumber(a.name);
    })[0];

    document.getElementById("summarySemesters").textContent =
        semesters.length;

    document.getElementById("summaryCGPA").textContent =
        latestSemester
            ? Number(latestSemester.cgpa).toFixed(2)
            : "0.00";

    document.getElementById("summarySGPA").textContent =
        latestSemester
            ? Number(latestSemester.sgpa).toFixed(2)
            : "0.00";

    const totalBacklogs = semesters.reduce(function (total, semester) {
        return total + Number(semester.backlogs || 0);
    }, 0);

    document.getElementById("summaryBacklogs").textContent =
        totalBacklogs;
}


/* MODAL HELPERS */

function openModal(modal) {
    modal.classList.add("show");

    lucide.createIcons();
}


function closeModal(modal) {
    modal.classList.remove("show");
}


document.querySelectorAll("[data-close-modal]").forEach(function (button) {
    button.addEventListener("click", function () {
        const modal = document.getElementById(
            button.dataset.closeModal
        );

        closeModal(modal);
    });
});


document.querySelectorAll(".modal-overlay").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
});


document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeModal(semesterModal);
        closeModal(subjectModal);
    }
});


/* ADD SEMESTER */

document.getElementById("addSemesterBtn").addEventListener("click", function () {
    semesterForm.reset();

    document.getElementById("semesterId").value = "";

    document.getElementById("semesterModalTitle").textContent =
        "Add Semester";

    document.getElementById("semesterBacklogs").value = "0";

    openModal(semesterModal);
});


/* SAVE SEMESTER */

semesterForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const id = document.getElementById("semesterId").value;

    const name = document.getElementById("semesterName").value;

    const year = document.getElementById("academicYear").value.trim();

    const sgpa = Number(
        document.getElementById("semesterSGPA").value
    );

    const cgpa = Number(
        document.getElementById("semesterCGPA").value
    );

    const backlogs = Number(
        document.getElementById("semesterBacklogs").value
    );

    if (sgpa < 0 || sgpa > 10 || cgpa < 0 || cgpa > 10) {
        alert("SGPA and CGPA must be between 0 and 10.");
        return;
    }

    if (!Number.isInteger(backlogs) || backlogs < 0) {
        alert("Backlogs must be a non-negative whole number.");
        return;
    }

    const duplicate = semesters.find(function (semester) {
        return semester.name === name && semester.id !== id;
    });

    if (duplicate) {
        alert(
            "A record for this semester already exists. Please edit it instead."
        );

        return;
    }

    let activityTitle;
let activityDescription;

if (id) {
    const existing = findSemester(id);

    if (existing) {
        existing.name = name;
        existing.year = year;
        existing.sgpa = sgpa;
        existing.cgpa = cgpa;
        existing.backlogs = backlogs;

        activityTitle = "Academic records updated";
        activityDescription = name + " academic details updated";
    }
} else {
    semesters.push({
        id: createId(),
        name: name,
        year: year,
        sgpa: sgpa,
        cgpa: cgpa,
        backlogs: backlogs,
        subjects: []
    });

    activityTitle = "Academic semester added";
    activityDescription = name + " added";
}

saveSemesters();

if (activityTitle) {
    logAcademicActivity(activityTitle, activityDescription);
}

    closeModal(semesterModal);

    renderSemesters(id || null);
});


/* OPEN SUBJECT MODAL */

function openSubjectModal(semesterId, subject = null) {
    subjectForm.reset();

    document.getElementById("subjectId").value =
        subject ? subject.id : "";

    document.getElementById("subjectSemesterId").value =
        semesterId;

    document.getElementById("subjectModalTitle").textContent =
        subject ? "Edit Subject Marks" : "Add Subject Marks";

    document.getElementById("subjectModalDescription").textContent =
        "Enter the subject's assessment results.";

    document.getElementById("internalMarks").value =
        subject ? subject.internal : 0;

    document.getElementById("internalMaximum").value =
        subject ? subject.internalMax : 100;

    document.getElementById("examMarks").value =
        subject ? subject.exam : 0;

    document.getElementById("examMaximum").value =
        subject ? subject.examMax : 100;

    if (subject) {
        document.getElementById("subjectName").value =
            subject.name;

        document.getElementById("subjectCode").value =
            subject.code;

        document.getElementById("subjectGrade").value =
            subject.grade;
    }

    openModal(subjectModal);
}


/* SAVE SUBJECT */

subjectForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const semesterId =
        document.getElementById("subjectSemesterId").value;

    const semester = findSemester(semesterId);

    if (!semester) {
        alert("Could not find the selected semester.");
        return;
    }

    const id = document.getElementById("subjectId").value;

    const name =
        document.getElementById("subjectName").value.trim();

    const code =
        document.getElementById("subjectCode").value.trim();

    const internal =
        Number(document.getElementById("internalMarks").value);

    const internalMax =
        Number(document.getElementById("internalMaximum").value);

    const exam =
        Number(document.getElementById("examMarks").value);

    const examMax =
        Number(document.getElementById("examMaximum").value);

    const grade =
        document.getElementById("subjectGrade").value;

    if (
        internalMax <= 0 ||
        examMax <= 0 ||
        internal < 0 ||
        exam < 0 ||
        internal > internalMax ||
        exam > examMax
    ) {
        alert(
            "Please enter valid marks that do not exceed the maximum marks."
        );

        return;
    }

    const duplicate = semester.subjects.find(function (subject) {
        return subject.code.toLowerCase() === code.toLowerCase()
            && subject.id !== id;
    });

    if (duplicate) {
        alert(
            "This subject code already exists in the selected semester."
        );

        return;
    }

    const subjectData = {
        id: id || createId(),
        name: name,
        code: code,
        internal: internal,
        internalMax: internalMax,
        exam: exam,
        examMax: examMax,
        grade: grade
    };

    if (id) {
    const index = semester.subjects.findIndex(function (subject) {
        return subject.id === id;
    });

    if (index !== -1) {
        semester.subjects[index] = subjectData;

        logAcademicActivity(
            "Subject marks updated",
            subjectData.name + " marks updated in " + semester.name
        );
    }
} else {
    semester.subjects.push(subjectData);

    logAcademicActivity(
        "Subject marks added",
        subjectData.name + " added to " + semester.name
    );
}

saveSemesters();

    closeModal(subjectModal);

    renderSemesters(semesterId);
});


/* SEMESTER AND SUBJECT ACTIONS */

semesterContainer.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;

    const semesterId = button.dataset.semesterId ||
        button.closest(".semester-card")?.dataset.semesterId;

    const semester = findSemester(semesterId);

    if (!semester) {
        return;
    }

    /* Expand or collapse */

    if (action === "toggle-semester") {
        button.closest(".semester-card").classList.toggle("open");
        return;
    }

    /* Add subject */

    if (action === "add-subject") {
        openSubjectModal(semesterId);
        return;
    }

    /* Edit semester */

    if (action === "edit-semester") {
        document.getElementById("semesterId").value =
            semester.id;

        document.getElementById("semesterName").value =
            semester.name;

        document.getElementById("academicYear").value =
            semester.year;

        document.getElementById("semesterSGPA").value =
            semester.sgpa;

        document.getElementById("semesterCGPA").value =
            semester.cgpa;

        document.getElementById("semesterBacklogs").value =
            semester.backlogs;

        document.getElementById("semesterModalTitle").textContent =
            "Edit Semester";

        openModal(semesterModal);

        return;
    }

    /* Delete semester */

    if (action === "delete-semester") {
        const confirmed = confirm(
            "Delete " + semester.name +
            " and all its subject marks?"
        );

        if (!confirmed) {
            return;
        }

        const deletedSemesterName = semester.name;

semesters = semesters.filter(function (item) {
    return item.id !== semesterId;
});

saveSemesters();

logAcademicActivity(
    "Academic semester deleted",
    deletedSemesterName + " deleted"
);

renderSemesters();

        return;
    }

    /* Edit subject */

    if (action === "edit-subject") {
        const subject = semester.subjects.find(function (item) {
            return item.id === button.dataset.subjectId;
        });

        if (subject) {
            openSubjectModal(semesterId, subject);
        }

        return;
    }

    /* Delete subject */

    if (action === "delete-subject") {
        const confirmed = confirm(
            "Delete this subject's marks?"
        );

        if (!confirmed) {
            return;
        }

        const deletedSubject = semester.subjects.find(function (item) {
    return item.id === button.dataset.subjectId;
});

semester.subjects = semester.subjects.filter(function (item) {
    return item.id !== button.dataset.subjectId;
});

saveSemesters();

if (deletedSubject) {
    logAcademicActivity(
        "Subject marks deleted",
        deletedSubject.name + " deleted from " + semester.name
    );
}

renderSemesters(semesterId);
    }
});

/* INITIAL PAGE LOAD */

renderSemesters("semester-1");

if (typeof lucide !== "undefined") {
    lucide.createIcons();
}