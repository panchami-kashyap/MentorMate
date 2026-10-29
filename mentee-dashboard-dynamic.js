// Paste this INSIDE the existing script block in mentee-dashboard.html,
// after the mentor-feedback code and before the closing </script>.
(() => {
  const RECOMMENDATIONS_KEY = "mentorMateRecommendations";
  const ACTIVITY_KEY = "mentorMateRecentActivity";
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read = key => { try { const x=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(x)?x:[]; } catch(e){console.error(e);return [];} };
  const dateLabel = value => {
    if(!value) return "Recently";
    const d=new Date(value); if(Number.isNaN(d.getTime())) return value;
    const days=Math.floor((Date.now()-d.getTime())/86400000);
    if(days<=0)return "Today"; if(days===1)return "1 day ago"; if(days<7)return days+" days ago";
    if(days<14)return "1 week ago";
    return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  };
  function renderRecommendations() {
    const box = document.getElementById("recommendationList");
    if (!box) return;

    const items = read(RECOMMENDATIONS_KEY).slice().reverse();

    box.innerHTML = items.length
      ? items.map(x => {
          const status = ["Pending", "In Progress", "Completed"].includes(x.status)
            ? x.status
            : "Pending";

          const cls = status === "In Progress"
            ? "progress"
            : status.toLowerCase();

          const colour = status === "Completed"
            ? "green"
            : status === "In Progress"
              ? "yellow"
              : "red";

          return `
            <div class="recommendation">
              <div class="recommendation-icon ${colour}">
                <i data-lucide="${
                  status === "Completed"
                    ? "check-circle"
                    : status === "In Progress"
                      ? "clock"
                      : "target"
                }"></i>
              </div>

              <div class="recommendation-content">
                <strong>${esc(x.title)}</strong>
                <span>${esc(x.details || "Recommended by your mentor")}</span>
                <span>${esc(x.createdAt || "")}</span>
              </div>

              <div class="recommendation-status-controls">
                <span class="status-badge ${cls}">
                  ${esc(status)}
                </span>

                <label class="status-update-label">
                  Update status
                  <select
                    class="recommendation-status-select"
                    data-recommendation-id="${esc(x.id)}"
                    aria-label="Update status for ${esc(x.title)}"
                  >
                    <option value="Pending" ${status === "Pending" ? "selected" : ""}>
                      Pending
                    </option>
                    <option value="In Progress" ${status === "In Progress" ? "selected" : ""}>
                      In Progress
                    </option>
                    <option value="Completed" ${status === "Completed" ? "selected" : ""}>
                      Completed
                    </option>
                  </select>
                </label>
              </div>
            </div>
          `;
        }).join("")
      : `<p class="empty-dynamic-state">No mentor recommendations yet.</p>`;

    if (window.lucide) lucide.createIcons();
  }
  function renderActivity(){
    const box=document.getElementById("recentActivityList"); if(!box)return;
    const items=read(ACTIVITY_KEY).slice().reverse().slice(0,5);
    const icons={"message-square":"blue","target":"purple","award":"success","calendar-check":"blue","file-text":"purple"};
    box.innerHTML=items.length?items.map(x=>{
      const icon=["message-square","target","award","calendar-check","file-text"].includes(x.icon)?x.icon:"activity";
      return `<div class="activity"><div class="activity-icon ${icons[icon]||"blue"}"><i data-lucide="${icon}"></i></div><div><strong>${esc(x.title)}</strong><span>${esc(x.description||"")}</span></div><small>${esc(dateLabel(x.createdAt))}</small></div>`;
    }).join(""):`<p class="empty-dynamic-state">No recent activity yet.</p>`;
    if(window.lucide)lucide.createIcons();
  }
  function render(){renderRecommendations();renderActivity();}
    // Update recommendation status from the mentee dashboard.
  // Update recommendation status from the mentee dashboard.
  document.addEventListener("change", event => {
    const select = event.target.closest(".recommendation-status-select");
    if (!select) return;

    const id = select.dataset.recommendationId;
    const newStatus = select.value;

    const recommendations = read(RECOMMENDATIONS_KEY);
    const index = recommendations.findIndex(
      item => String(item.id) === String(id)
    );

    if (index === -1) {
      alert("Recommendation not found. Please refresh the page.");
      render();
      return;
    }

    const oldStatus = recommendations[index].status || "Pending";

    if (oldStatus === newStatus) return;

    recommendations[index].status = newStatus;

    try {
      localStorage.setItem(
        RECOMMENDATIONS_KEY,
        JSON.stringify(recommendations)
      );

      const activities = read(ACTIVITY_KEY);

      activities.push({
        id: String(Date.now()),
        title: "Recommendation status updated",
        description: recommendations[index].title + ": " + newStatus,
        icon: "target",
        createdAt: new Date().toISOString()
      });

      localStorage.setItem(
        ACTIVITY_KEY,
        JSON.stringify(activities.slice(-50))
      );

      render();

    } catch (error) {
      console.error("Could not update recommendation status:", error);
      alert("Could not save the status. Please try again.");
    }
  });

      
  render();

  window.addEventListener("focus", render);
  window.addEventListener("storage", render);
})();
