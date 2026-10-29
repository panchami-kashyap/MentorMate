(() => {
  "use strict";

  const KEYS = {
    profile: "mentorMateProfile",
    academics: "mentorMateAcademicRecords",
    attendance: "mentorMateAttendanceRecords",
    achievements: "mentorMateAchievements",
    notes: "mentorMateMentorNotes"
  };

  const $ = id => document.getElementById(id);
  const safeRead = key => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Could not read ${key}`, error);
      return null;
    }
  };
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function readData() {
    return {
      profile: safeRead(KEYS.profile) || {},
      semesters: Array.isArray(safeRead(KEYS.academics)) ? safeRead(KEYS.academics) : [],
      attendance: Array.isArray(safeRead(KEYS.attendance)) ? safeRead(KEYS.attendance) : [],
      achievements: Array.isArray(safeRead(KEYS.achievements)) ? safeRead(KEYS.achievements) : []
    };
  }

  function initials(name) {
    return String(name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  }
  function attendancePercent(records) {
    const attended = records.reduce((sum, item) => sum + (Number(item.attended) || 0), 0);
    const total = records.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    return total ? Math.round(attended / total * 100) : null;
  }
  function averageCGPA(semesters) {
    const values = semesters.map(s => Number(s.cgpa)).filter(n => Number.isFinite(n) && n > 0);
    return values.length ? values[values.length - 1].toFixed(2) : "—";
  }
  function render() {
    const data = readData();
    const profile = data.profile;
    const hasProfile = Object.values(profile).some(value => String(value ?? "").trim() !== "");
    const search = $("menteeSearch").value.trim().toLowerCase();
    const name = profile.fullName || "Mentee Profile";
    const usn = profile.usn || "USN not added";
    const attendance = attendancePercent(data.attendance);
    $("menteeCount").textContent = hasProfile ? "1" : "0";
    $("semesterCount").textContent = data.semesters.length;
    $("achievementCount").textContent = data.achievements.length;
    $("overallAttendance").textContent = attendance === null ? "—" : `${attendance}%`;

    const matches = hasProfile && [name, usn, profile.department, profile.email]
      .some(value => String(value || "").toLowerCase().includes(search));
    $("menteeGrid").innerHTML = matches ? `
      <article class="mentee-card">
        <div class="student-card-head">
          <div class="student-avatar">${escapeHTML(initials(name))}</div>
          <div><h3>${escapeHTML(name)}</h3><p>${escapeHTML(usn)}</p></div>
          <span class="student-pill">Profile saved</span>
        </div>
        <div class="student-metrics">
          <div class="student-metric"><span>Latest CGPA</span><strong>${escapeHTML(averageCGPA(data.semesters))}</strong></div>
          <div class="student-metric"><span>Attendance</span><strong>${attendance === null ? "—" : `${attendance}%`}</strong></div>
          <div class="student-metric"><span>Achievements</span><strong>${data.achievements.length}</strong></div>
        </div>
        <div class="student-card-actions">
          <button type="button" class="primary-button" id="viewMentee"><i data-lucide="user-round-search"></i> View details</button>
          <a class="secondary-button" href="mentee-profile.html"><i data-lucide="external-link"></i> Open profile page</a>
        </div>
      </article>` : "";
    $("emptyMentees").hidden = matches;
    renderNotes();
    if (window.lucide) lucide.createIcons();
  }

  function renderDetails() {
    const data = readData();
    const p = data.profile;
    const name = p.fullName || "Mentee Profile";
    $("detailName").textContent = name;
    $("detailSubtitle").textContent = [p.usn, p.department, p.semester ? `Semester ${p.semester}` : ""].filter(Boolean).join(" · ");
    const profileRows = [
      ["Full name", p.fullName], ["USN", p.usn], ["Email", p.email], ["Phone", p.phone],
      ["Department", p.department], ["Semester", p.semester], ["CGPA", p.cgpa],
      ["SGPA", p.sgpa], ["Backlogs", p.backlogs], ["Skills", p.skills],
      ["Interests", p.interests], ["Internships", p.internships], ["Projects", p.projects],
      ["Profile achievements", p.achievements]
    ].filter(([, value]) => String(value ?? "").trim() !== "");

    const academicHTML = data.semesters.length ? data.semesters.map(sem => `
      <li><strong>${escapeHTML(sem.name || "Semester")}</strong> — SGPA: ${escapeHTML(sem.sgpa ?? "—")}, CGPA: ${escapeHTML(sem.cgpa ?? "—")}, Backlogs: ${escapeHTML(sem.backlogs ?? "—")}
      ${Array.isArray(sem.subjects) && sem.subjects.length ? `<ul>${sem.subjects.map(sub => `<li>${escapeHTML(sub.name)} (${escapeHTML(sub.code || "No code")}): Internal ${escapeHTML(sub.internal ?? "—")}/${escapeHTML(sub.internalMax ?? "—")}, Exam ${escapeHTML(sub.exam ?? "—")}/${escapeHTML(sub.examMax ?? "—")}, Grade ${escapeHTML(sub.grade || "—")}</li>`).join("")}</ul>` : ""}</li>`).join("") : "<p>No academic records saved yet.</p>";

    const attendanceHTML = data.attendance.length ? `<ul>${data.attendance.map(item => {
      const pct = Number(item.total) > 0 ? Math.round(Number(item.attended) / Number(item.total) * 100) : 0;
      return `<li>${escapeHTML(item.name)} (${escapeHTML(item.code)}): ${pct}% — ${escapeHTML(item.attended)} of ${escapeHTML(item.total)} classes attended</li>`;
    }).join("")}</ul>` : "<p>No attendance records saved yet.</p>";

    const achievementsHTML = data.achievements.length ? `<ul>${data.achievements.map(item => `<li><strong>${escapeHTML(item.title)}</strong> — ${escapeHTML(item.category || "Other")}${item.date ? `, ${escapeHTML(item.date)}` : ""}${item.organisation ? ` · ${escapeHTML(item.organisation)}` : ""}${item.description ? `<br>${escapeHTML(item.description)}` : ""}</li>`).join("")}</ul>` : "<p>No achievements saved yet.</p>";

    $("detailContent").innerHTML = `
      <section class="detail-section"><h3>Personal and academic profile</h3>${profileRows.length ? profileRows.map(([label, value]) => `<p><strong>${escapeHTML(label)}:</strong> ${escapeHTML(value)}</p>`).join("") : "<p>No profile details saved yet.</p>"}</section>
      <section class="detail-section"><h3>Academic records (${data.semesters.length} semesters)</h3><ul>${academicHTML}</ul></section>
      <section class="detail-section"><h3>Attendance (${data.attendance.length} subjects)</h3>${attendanceHTML}</section>
      <section class="detail-section"><h3>Achievements (${data.achievements.length})</h3>${achievementsHTML}</section>`;
    $("menteeModal").classList.add("show");
    $("menteeModal").setAttribute("aria-hidden", "false");
    if (window.lucide) lucide.createIcons();
  }

  function closeDetails() {
    $("menteeModal").classList.remove("show");
    $("menteeModal").setAttribute("aria-hidden", "true");
  }

  function getNotes() {
    const notes = safeRead(KEYS.notes);
    return Array.isArray(notes) ? notes : [];
  }
  function renderNotes() {
    const notes = getNotes();
    $("notesList").innerHTML = notes.length ? notes.slice().reverse().map(note => `
      <article class="note-item"><div><p>${escapeHTML(note.text)}</p><time>${escapeHTML(note.createdAt || "")}</time></div>
      <button type="button" class="delete-note" data-note-id="${escapeHTML(note.id)}" aria-label="Delete note"><i data-lucide="trash-2"></i></button></article>`).join("") : "";
    if (window.lucide) lucide.createIcons();
  }

  $("menteeSearch").addEventListener("input", render);
  $("menteeGrid").addEventListener("click", event => {
    if (event.target.closest("#viewMentee")) renderDetails();
  });
  $("closeDetail").addEventListener("click", closeDetails);
  $("menteeModal").addEventListener("click", event => {
    if (event.target === $("menteeModal")) closeDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDetails();
  });
  $("noteForm").addEventListener("submit", event => {
    event.preventDefault();
    const text = $("mentorNote").value.trim();
    if (!text) return;
    const notes = getNotes();
    notes.push({
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      text,
      createdAt: new Date().toLocaleString("en-IN")
    });
    try {
      localStorage.setItem(KEYS.notes, JSON.stringify(notes));
      $("mentorNote").value = "";
      $("noteStatus").textContent = "Note saved successfully.";
      renderNotes();
    } catch (error) {
      $("noteStatus").textContent = "Could not save the note. Browser storage may be full.";
    }
  });
  $("notesList").addEventListener("click", event => {
    const button = event.target.closest("[data-note-id]");
    if (!button) return;
    const updated = getNotes().filter(note => String(note.id) !== button.dataset.noteId);
    localStorage.setItem(KEYS.notes, JSON.stringify(updated));
    renderNotes();
  });

  // Refresh when another page in the same browser changes localStorage.
  window.addEventListener("storage", render);
  render();
})();
