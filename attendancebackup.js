  const ATTENDANCE_STORAGE_KEY = "mentorMateAttendanceRecords";
  const LOW_ATTENDANCE_LIMIT = 75;

  const attendanceList = document.getElementById("attendanceList");
  const attendanceEmpty = document.getElementById("attendanceEmpty");
  const attendanceModal = document.getElementById("attendanceModal");
  const attendanceForm = document.getElementById("attendanceForm");
  const attendanceSearch = document.getElementById("attendanceSearch");
  const attendanceFilter = document.getElementById("attendanceFilter");
  const attendanceFormError = document.getElementById("attendanceFormError");

  let attendanceRecords = loadAttendanceRecords();

  function createAttendanceId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function loadAttendanceRecords() {
    try {
      const saved = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(record =>
        record && typeof record === "object" &&
        typeof record.id === "string" &&
        typeof record.name === "string" &&
        typeof record.code === "string" &&
        Number.isFinite(Number(record.attended)) &&
        Number.isFinite(Number(record.total))
      ).map(record => ({
        ...record,
        attended: Number(record.attended),
        total: Number(record.total)
      }));
    } catch (error) {
      console.error("Could not load attendance records:", error);
      return [];
    }
  }

  function saveAttendanceRecords() {
    localStorage.setItem(
      ATTENDANCE_STORAGE_KEY,
      JSON.stringify(attendanceRecords)
    );
  }

  // Record attendance changes in Recent Activity.
  function logAttendanceActivity(title, description) {
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
      icon: "calendar-check",
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

  function attendancePercentage(record) {
    return record.total > 0 ? Math.round((record.attended / record.total) * 100) : 0;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function updateAttendanceSummary() {
    const attended = attendanceRecords.reduce((sum, record) => sum + record.attended, 0);
    const total = attendanceRecords.reduce((sum, record) => sum + record.total, 0);
    const percentage = total > 0 ? Math.round(attended / total * 100) : 0;
    const lowCount = attendanceRecords.filter(record => attendancePercentage(record) < LOW_ATTENDANCE_LIMIT).length;

    document.getElementById("overallPercentage").textContent = `${percentage}%`;
    document.getElementById("classesAttended").textContent = attended;
    document.getElementById("totalClasses").textContent = total;
    document.getElementById("lowAttendanceCount").textContent = lowCount;
  }

  function renderAttendance() {
    const query = attendanceSearch.value.trim().toLowerCase();
    const filter = attendanceFilter.value;

    const filtered = attendanceRecords.filter(record => {
      const matchesSearch = record.name.toLowerCase().includes(query) || record.code.toLowerCase().includes(query);
      const percentage = attendancePercentage(record);
      const matchesFilter = filter === "all" || (filter === "good" && percentage >= LOW_ATTENDANCE_LIMIT) || (filter === "low" && percentage < LOW_ATTENDANCE_LIMIT);
      return matchesSearch && matchesFilter;
    });

    attendanceList.innerHTML = filtered.map(record => {
      const percentage = attendancePercentage(record);
      const low = percentage < LOW_ATTENDANCE_LIMIT;
      return `
        <article class="attendance-record">
          <div class="attendance-subject">
            <h3>${escapeHTML(record.name)}</h3>
            <p>Subject code: ${escapeHTML(record.code)}</p>
          </div>
          <div>
            <div class="attendance-progress-track" role="progressbar" aria-label="${escapeHTML(record.name)} attendance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}">
              <div class="attendance-progress-fill ${low ? "low" : ""}" style="width:${percentage}%"></div>
            </div>
            <span class="attendance-progress-caption">${record.attended} of ${record.total} classes attended</span>
          </div>
          <div>
            <div class="attendance-percent">${percentage}%</div>
            <span class="attendance-status ${low ? "low" : "good"}">${low ? "Below 75%" : "Good attendance"}</span>
          </div>
          <div class="attendance-record-actions">
            <button type="button" data-action="edit" data-id="${escapeHTML(record.id)}" aria-label="Edit ${escapeHTML(record.name)}"><i data-lucide="pencil"></i><span>Edit</span></button>
            <button type="button" class="delete" data-action="delete" data-id="${escapeHTML(record.id)}" aria-label="Delete ${escapeHTML(record.name)}"><i data-lucide="trash-2"></i><span>Delete</span></button>
          </div>
        </article>`;
    }).join("");

    attendanceEmpty.hidden = filtered.length > 0;
    if (attendanceRecords.length > 0 && filtered.length === 0) {
      attendanceEmpty.hidden = false;
      attendanceEmpty.querySelector("h3").textContent = "No matching subjects";
      attendanceEmpty.querySelector("p").textContent = "Try a different search or filter.";
    } else {
      attendanceEmpty.querySelector("h3").textContent = "No attendance records yet";
      attendanceEmpty.querySelector("p").textContent = "Add your first subject to start tracking attendance.";
    }

    updateAttendanceSummary();
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function openAttendanceModal(record = null) {
    attendanceForm.reset();
    attendanceFormError.textContent = "";
    document.getElementById("attendanceId").value = record ? record.id : "";
    document.getElementById("subjectName").value = record ? record.name : "";
    document.getElementById("subjectCode").value = record ? record.code : "";
    document.getElementById("classesAttendedInput").value = record ? record.attended : 0;
    document.getElementById("totalClassesInput").value = record ? record.total : 1;
    document.getElementById("attendanceModalTitle").textContent = record ? "Edit Attendance" : "Add Attendance";
    attendanceModal.classList.add("show");
    attendanceModal.setAttribute("aria-hidden", "false");
    if (typeof lucide !== "undefined") lucide.createIcons();
    document.getElementById("subjectName").focus();
  }

  function closeAttendanceModal() {
    attendanceModal.classList.remove("show");
    attendanceModal.setAttribute("aria-hidden", "true");
  }

  document.getElementById("addAttendanceBtn").addEventListener("click", () => openAttendanceModal());

  document.querySelectorAll("[data-close-attendance-modal]").forEach(button => {
    button.addEventListener("click", closeAttendanceModal);
  });

  attendanceModal.addEventListener("click", event => {
    if (event.target === attendanceModal) closeAttendanceModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && attendanceModal.classList.contains("show")) closeAttendanceModal();
  });

  attendanceForm.addEventListener("submit", event => {
    event.preventDefault();
    attendanceFormError.textContent = "";

    const id = document.getElementById("attendanceId").value;
    const name = document.getElementById("subjectName").value.trim();
    const code = document.getElementById("subjectCode").value.trim();
    const attended = Number(document.getElementById("classesAttendedInput").value);
    const total = Number(document.getElementById("totalClassesInput").value);

    if (!name || !code) {
      attendanceFormError.textContent = "Please enter both a subject name and subject code.";
      return;
    }
    if (!Number.isInteger(attended) || !Number.isInteger(total) || attended < 0 || total < 1 || attended > total) {
      attendanceFormError.textContent = "Enter whole numbers, with classes attended between 0 and total classes.";
      return;
    }

    const duplicate = attendanceRecords.some(record =>
      record.code.toLowerCase() === code.toLowerCase() && record.id !== id
    );
    if (duplicate) {
      attendanceFormError.textContent = "That subject code already exists. Edit the existing record instead.";
      return;
    }

    const updatedRecord = {
    id: id || createAttendanceId(),
    name,
    code,
    attended,
    total
  };

  if (id) {
    const index = attendanceRecords.findIndex(
      record => record.id === id
    );

    if (index !== -1) {
      attendanceRecords[index] = updatedRecord;

      logAttendanceActivity(
        "Attendance updated",
        name + " attendance updated to " +
        attended + " of " + total + " classes (" +
        attendancePercentage(updatedRecord) + "%)"
      );
    }
  } else {
    attendanceRecords.push(updatedRecord);

    logAttendanceActivity(
      "Attendance added",
      name + " attendance recorded: " +
      attended + " of " + total + " classes (" +
      attendancePercentage(updatedRecord) + "%)"
    );
  }

  saveAttendanceRecords();
  closeAttendanceModal();
  renderAttendance();

});

  attendanceList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const record = attendanceRecords.find(item => item.id === button.dataset.id);
    if (!record) return;

    if (button.dataset.action === "edit") {
      openAttendanceModal(record);
    } else if (button.dataset.action === "delete") {
    if (!confirm(`Delete attendance for ${record.name}?`)) {
      return;
    }

    const deletedName = record.name;

    attendanceRecords = attendanceRecords.filter(
      item => item.id !== record.id
    );

    saveAttendanceRecords();

    logAttendanceActivity(
      "Attendance deleted",
      "Attendance record deleted for " + deletedName
    );

    renderAttendance();
  }
  });

  attendanceSearch.addEventListener("input", renderAttendance);
  attendanceFilter.addEventListener("change", renderAttendance);

  renderAttendance();
  if (typeof lucide !== "undefined") lucide.createIcons();
