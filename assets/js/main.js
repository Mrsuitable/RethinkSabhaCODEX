(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    debates: [],
    selectedCategory: "All",
    selectedDebate: null
  };

  const config = window.RETHINK_CONFIG || {};

  function setYear() {
    const yearTarget = byId("year");
    if (yearTarget) {
      yearTarget.textContent = String(new Date().getFullYear());
    }
  }

  function setupMobileMenu() {
    const toggle = byId("menuToggle");
    const links = byId("navLinks");
    if (!toggle || !links) {
      return;
    }
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  }

  function setupActiveNav() {
    const page = document.body.dataset.page;
    qsa(".nav-link").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
      }
    });
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function statusClass(status) {
    return status === "Open" ? "badge-open" : "badge-upcoming";
  }

  function debateCardTemplate(debate) {
    return `
      <article class="debate-card">
        <div class="badge ${statusClass(debate.status)}">${debate.status}</div>
        <h3>${debate.title}</h3>
        <p>${debate.summary}</p>
        <div class="meta">
          <span class="pill">${debate.category}</span>
          <span class="pill">${debate.level}</span>
          <span class="pill">${formatDate(debate.date)}</span>
          <span class="pill">${debate.durationMinutes} mins</span>
        </div>
        <div class="card-actions">
          <button class="button button-primary register-btn" type="button" data-register-id="${debate.id}">
            Register
          </button>
        </div>
      </article>
    `;
  }

  async function fetchDebates() {
    const response = await fetch("data/debates.json");
    if (!response.ok) {
      throw new Error("Unable to load debates");
    }
    state.debates = await response.json();
  }

  function renderHomeDebates() {
    const target = byId("homeDebates");
    if (!target) {
      return;
    }
    const topDebates = state.debates.slice(0, 4);
    target.innerHTML = topDebates.map(debateCardTemplate).join("");
    bindRegisterButtons();
  }

  function uniqueCategories() {
    const categories = new Set(state.debates.map((d) => d.category));
    return ["All", ...Array.from(categories)];
  }

  function renderFilters() {
    const target = byId("filters");
    if (!target) {
      return;
    }
    target.innerHTML = uniqueCategories()
      .map((category) => {
        const activeClass = category === state.selectedCategory ? "active" : "";
        return `<button class="chip ${activeClass}" data-category="${category}" type="button">${category}</button>`;
      })
      .join("");

    qsa(".chip", target).forEach((chip) => {
      chip.addEventListener("click", () => {
        state.selectedCategory = chip.dataset.category;
        renderFilters();
        renderDebateGrid();
      });
    });
  }

  function filteredDebates() {
    if (state.selectedCategory === "All") {
      return state.debates;
    }
    return state.debates.filter((debate) => debate.category === state.selectedCategory);
  }

  function renderDebateGrid() {
    const grid = byId("debateGrid");
    if (!grid) {
      return;
    }
    const list = filteredDebates();
    grid.innerHTML = list.map(debateCardTemplate).join("");
    bindRegisterButtons();
    const count = byId("debateCount");
    if (count) {
      count.textContent = String(list.length);
    }
  }

  function bindRegisterButtons() {
    qsa(".register-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = state.debates.find((debate) => debate.id === button.dataset.registerId);
        if (!selected) {
          return;
        }
        state.selectedDebate = selected;
        openModal(selected);
      });
    });
  }

  function openModal(debate) {
    const modalWrap = byId("registerModal");
    const selectedName = byId("selectedDebateName");
    if (!modalWrap || !selectedName) {
      return;
    }
    selectedName.textContent = debate.title;
    modalWrap.classList.add("open");
  }

  function closeModal() {
    const modalWrap = byId("registerModal");
    const message = byId("registerMessage");
    const error = byId("registerError");
    const form = byId("registerForm");
    if (!modalWrap) {
      return;
    }
    modalWrap.classList.remove("open");
    if (message) {
      message.classList.add("hide");
      message.textContent = "";
    }
    if (error) {
      error.classList.add("hide");
      error.textContent = "";
    }
    if (form) {
      form.reset();
    }
  }

  async function sendRegistration(record) {
    if (!config.registrationEndpoint) {
      return { ok: true };
    }

    const response = await fetch(config.registrationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
      throw new Error("Registration API returned a non-success response.");
    }
    return { ok: true };
  }

  function saveRegistrationLocal(record) {
    const key = "rethink_signups";
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    current.push(record);
    localStorage.setItem(key, JSON.stringify(current));
  }

  function setupModal() {
    const modalWrap = byId("registerModal");
    const closeButton = byId("closeModal");
    const cancelButton = byId("cancelModal");
    const form = byId("registerForm");
    const message = byId("registerMessage");
    const error = byId("registerError");

    if (!modalWrap || !form) {
      return;
    }

    if (closeButton) {
      closeButton.addEventListener("click", closeModal);
    }
    if (cancelButton) {
      cancelButton.addEventListener("click", closeModal);
    }

    modalWrap.addEventListener("click", (event) => {
      if (event.target === modalWrap) {
        closeModal();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.selectedDebate) {
        return;
      }

      if (message) {
        message.classList.add("hide");
      }
      if (error) {
        error.classList.add("hide");
      }

      const formData = new FormData(form);
      const record = {
        debateId: state.selectedDebate.id,
        debateTitle: state.selectedDebate.title,
        fullName: String(formData.get("fullName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        intent: String(formData.get("intent") || "").trim(),
        createdAt: new Date().toISOString()
      };

      try {
        saveRegistrationLocal(record);
        await sendRegistration(record);
        if (message) {
          message.textContent = "Registration received. Check your email for schedule updates.";
          message.classList.remove("hide");
        }
      } catch (submitError) {
        if (error) {
          error.textContent = submitError.message || "Could not submit your registration.";
          error.classList.remove("hide");
        }
      }
    });
  }

  async function bootDebates() {
    const needsDebates =
      byId("homeDebates") || byId("debateGrid") || qsa(".register-btn").length > 0;

    if (!needsDebates) {
      return;
    }

    try {
      await fetchDebates();
      renderHomeDebates();
      renderFilters();
      renderDebateGrid();
    } catch (error) {
      const targets = [byId("homeDebates"), byId("debateGrid")].filter(Boolean);
      targets.forEach((target) => {
        target.innerHTML =
          '<div class="notice error">Unable to load debates right now. Please refresh in a minute.</div>';
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    setYear();
    setupMobileMenu();
    setupActiveNav();
    setupModal();
    await bootDebates();
  });
})();
