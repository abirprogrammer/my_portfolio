(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Profile photo fallback: keep the hero layout intact if the image path is changed.
  $$(".hero-profile-photo, .mini-avatar img").forEach(img => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const parent = img.closest(".profile-photo-frame, .mini-avatar");
      if (parent) parent.classList.add("image-unavailable");
    }, { once: true });
  });

  // Footer year
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Mobile navigation
  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      menuToggle.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
    $$(".nav-link", navLinks).forEach(link => link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }));
  }

  // Scroll progress and back-to-top button
  const progress = $("#scrollProgress");
  const backToTop = $("#backToTop");
  const updateScrollUI = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    if (backToTop) backToTop.classList.toggle("visible", window.scrollY > 450);
  };
  window.addEventListener("scroll", updateScrollUI, { passive: true });
  updateScrollUI();
  backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // Reveal elements on scroll
  const revealElements = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add("in-view"));
  }

  // Highlight active navigation section
  const sections = $$("main section[id]");
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$(".nav-link").forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(section => sectionObserver.observe(section));
  }

  // Skills filter
  const filterButtons = $$(".filter-btn");
  const skillCards = $$(".skill-card");
  filterButtons.forEach(button => button.addEventListener("click", () => {
    filterButtons.forEach(item => item.classList.toggle("active", item === button));
    const category = button.dataset.filter;
    skillCards.forEach(card => {
      const show = category === "all" || card.dataset.category === category;
      card.classList.toggle("hidden", !show);
    });
  }));

  // GitHub public repositories: no token required for public repositories.
  const username = "abirprogrammer";
  const projectsGrid = $("#projectsGrid");
  const repoStatus = $("#repoStatus");
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const languageClass = language => {
    const map = { JavaScript: "skill-orange", Dart: "skill-blue", Java: "skill-red", HTML: "skill-orange", CSS: "skill-blue", PHP: "skill-purple" };
    return map[language] || "skill-green";
  };
  const iconFor = language => {
    const map = { Dart: "fa-mobile-screen-button", JavaScript: "fa-js", Java: "fa-java", HTML: "fa-html5", CSS: "fa-css3-alt", PHP: "fa-php", Kotlin: "fa-android", Swift: "fa-mobile-screen-button" };
    return map[language] || "fa-code";
  };
  const formatDate = dateString => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Recently updated";
    return `Updated ${date.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  };
  const repoCard = repo => {
    const language = repo.language || "Code";
    const description = repo.description || "Explore the source code and implementation details in this repository.";
    const homepage = typeof repo.homepage === "string" ? repo.homepage.trim() : "";
    return `<article class="project-card reveal in-view">
      <div class="project-cover"><i class="fa-brands ${iconFor(language)}"></i></div>
      <div class="project-body">
        <div class="project-meta"><span class="repo-language ${languageClass(language)}">${escapeHTML(language)}</span><span class="repo-updated">${escapeHTML(formatDate(repo.updated_at))}</span></div>
        <h3>${escapeHTML(repo.name)}</h3>
        <p>${escapeHTML(description)}</p>
        <div class="project-stats"><span><i class="fa-regular fa-star"></i> ${Number(repo.stargazers_count) || 0} stars</span><span><i class="fa-solid fa-code-fork"></i> ${Number(repo.forks_count) || 0} forks</span></div>
        <div class="project-actions"><a href="${escapeHTML(repo.html_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> Source Code</a>${homepage && /^https?:\/\//i.test(homepage) ? `<a class="repo-demo" href="${escapeHTML(homepage)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Live Demo</a>` : ""}</div>
      </div></article>`;
  };
  async function loadRepositories() {
    if (!projectsGrid) return;
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=public`, {
        headers: { "Accept": "application/vnd.github+json" }
      });
      if (!response.ok) throw new Error(response.status === 403 ? "GitHub API rate limit reached. Please try again later." : `GitHub returned status ${response.status}.`);
      const repositories = await response.json();
      const visibleRepos = repositories
        .filter(repo => !repo.fork)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 6);
      if (!visibleRepos.length) {
        projectsGrid.innerHTML = `<div class="repo-error"><i class="fa-regular fa-folder-open"></i><strong>No public repositories found</strong><p>Publish a public repository on GitHub to display it here.</p><a class="button button-outline" href="https://github.com/${username}?tab=repositories" target="_blank" rel="noopener noreferrer">Open GitHub</a></div>`;
        if (repoStatus) repoStatus.textContent = "No public repositories found";
        return;
      }
      projectsGrid.innerHTML = visibleRepos.map(repoCard).join("");
      if (repoStatus) repoStatus.textContent = `${repositories.length} public repositories available`;
    } catch (error) {
      projectsGrid.innerHTML = `<div class="repo-error"><i class="fa-brands fa-github"></i><strong>Couldn't load repositories automatically</strong><p>${escapeHTML(error.message || "Check your internet connection and try again.")}</p><a class="button button-outline" href="https://github.com/${username}?tab=repositories" target="_blank" rel="noopener noreferrer">View repositories on GitHub</a></div>`;
      if (repoStatus) repoStatus.textContent = "Open GitHub to view projects";
    }
  }
  loadRepositories();

  // Show PDF preview only when the local CV file can be loaded.
  const cvFrame = $("#cvFrame");
  const pdfPlaceholder = $("#pdfPlaceholder");
  cvFrame?.addEventListener("load", () => {
    // Cross-origin browser restrictions are intentionally respected.
    try {
      const frameURL = cvFrame.contentWindow.location.href;
      if (frameURL && !frameURL.startsWith("about:")) pdfPlaceholder?.classList.add("is-hidden");
    } catch (_) {
      // A PDF viewer can be cross-origin in some browsers; its load event is enough.
      pdfPlaceholder?.classList.add("is-hidden");
    }
  });
  // Avoid presenting a broken PDF preview as a successful load.
  fetch("cv.pdf", { method: "HEAD" }).then(response => {
    if (response.ok) pdfPlaceholder?.classList.add("is-hidden");
  }).catch(() => {});
})();