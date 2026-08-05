import { fetchContentItems, getSupabaseStatus } from "./supabase.js";

const searchInput = document.getElementById("searchInput");
const filterBtn = document.getElementById("filterBtn");
const filterPanel = document.getElementById("filterPanel");
const paginationControls = document.getElementById("paginationControls");
const noResults = document.getElementById("noResults");
const currentDate = document.getElementById("currentDate");
const contentArea = document.querySelector(".content-area");

let activeFilter = "all";
let currentPage = 1;
const pageSize = 4;
let cards = Array.from(document.querySelectorAll(".content-card"));
let filterOptions = [];

function formatDate(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function updateCurrentDate() {
  if (!currentDate) return;
  currentDate.textContent = `Publicação: ${formatDate(new Date())}`;
}

function renderFilterOptions(categories = ["all", "pdf", "post", "instagram", "online"]) {
  if (!filterPanel) return;

  filterPanel.innerHTML = categories
    .map(
      (category) => `
      <button type="button" class="filter-option ${activeFilter === category ? "active" : ""}" data-filter="${category}">
        ${category === "all" ? "Todos" : category}
      </button>`
    )
    .join("");

  filterOptions = Array.from(filterPanel.querySelectorAll(".filter-option"));
  filterOptions.forEach((button) => {
    button.addEventListener("click", () => {
      filterOptions.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      currentPage = 1;
      updateCards();
    });
  });
}

function getFilteredCards() {
  const query = searchInput?.value.trim().toLowerCase() || "";
  return cards.filter((card) => {
    const text = card.textContent.toLowerCase();
    const category = card.dataset.category;
    const matchesSearch = query === "" || text.includes(query);
    const matchesFilter = activeFilter === "all" || category === activeFilter;
    return matchesSearch && matchesFilter;
  });
}

function renderPagination(totalPages) {
  if (!paginationControls) return;

  paginationControls.innerHTML = "";
  if (totalPages <= 1) return;

  const createButton = (text, page, disabled = false, active = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pagination-button${active ? " active" : ""}`;
    button.textContent = text;
    button.disabled = disabled;
    if (!disabled) {
      button.addEventListener("click", () => {
        currentPage = page;
        updateCards();
      });
    }
    return button;
  };

  paginationControls.appendChild(createButton("Anterior", currentPage - 1, currentPage === 1));

  for (let page = 1; page <= totalPages; page += 1) {
    paginationControls.appendChild(createButton(page.toString(), page, false, page === currentPage));
  }

  paginationControls.appendChild(createButton("Próximo", currentPage + 1, currentPage === totalPages));
}

function updateCards() {
  cards = Array.from(document.querySelectorAll(".content-card"));
  const filteredCards = getFilteredCards();
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  cards.forEach((card) => card.classList.add("hidden-card"));

  const startIndex = (currentPage - 1) * pageSize;
  const slice = filteredCards.slice(startIndex, startIndex + pageSize);
  slice.forEach((card) => card.classList.remove("hidden-card"));

  renderPagination(totalPages);

  if (filteredCards.length === 0) {
    noResults?.classList.remove("hidden");
  } else {
    noResults?.classList.add("hidden");
  }
}

function createCardHtml(item) {
  const formattedDate = item.date || formatDate(new Date());
  return `
    <article class="content-card" data-category="${item.tag || "online"}">
      <div class="card-header">
        <span class="card-badge">${item.tag ? item.tag : "Online"}</span>
        <span class="card-date">${formattedDate}</span>
      </div>
      <h2>${item.title || "Sem título"}</h2>
      <p>${item.description || "Descrição não disponível."}</p>
      <div class="card-meta">${item.fileName ? `Formato: ${item.fileName}` : "Formato: online"}</div>
    </article>`;
}

async function loadContentData() {
  if (!getSupabaseStatus().enabled) {
    return;
  }

  const items = await fetchContentItems();
  if (!items.length || !contentArea) return;

  contentArea.innerHTML = items.map(createCardHtml).join("");
  cards = Array.from(document.querySelectorAll(".content-card"));

  const uniqueTags = [
    "all",
    ...Array.from(new Set(items.map((item) => item.tag || "").filter(Boolean))),
  ];

  renderFilterOptions(uniqueTags.length > 1 ? uniqueTags : ["all", "pdf", "post", "instagram", "online"]);
}

searchInput?.addEventListener("input", () => {
  currentPage = 1;
  updateCards();
});

filterBtn?.addEventListener("click", () => {
  filterPanel?.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  if (
    filterPanel &&
    !filterPanel.classList.contains("hidden") &&
    !filterPanel.contains(event.target) &&
    !filterBtn.contains(event.target)
  ) {
    filterPanel.classList.add("hidden");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  renderFilterOptions();
  updateCurrentDate();
  await loadContentData();
  updateCards();
});
