import {
  getSupabaseStatus,
  fetchContentItems,
  fetchTags,
  insertContentItem,
  removeContentFile,
  uploadContentFile,
} from "./supabase.js";

const tagFilter = document.getElementById("tagFilter");
const adminSearch = document.getElementById("adminSearch");
const contentTag = document.getElementById("contentTag");
const addTagBtn = document.getElementById("addTagBtn");
const newTagInput = document.getElementById("newTagInput");
const uploadForm = document.getElementById("uploadForm");
const adminMessage = document.getElementById("adminMessage");
const contentList = document.getElementById("contentList");
const adminPagination = document.getElementById("adminPagination");
const adminNoResults = document.getElementById("adminNoResults");

let activeTag = "all";
let currentPage = 1;
const pageSize = 6;
let tags = ["all", "pdf", "post", "instagram", "online"];
let contents = [
  {
    title: "Posicionamento de marca",
    fileName: "posicionamento-marca.pdf",
    date: "12/07/2026",
    tag: "pdf",
    description: "Guia tático com identidade, tom de voz e princípios de marca."
  },
  {
    title: "Artes para redes sociais",
    fileName: "arte-posts.zip",
    date: "18/07/2026",
    tag: "post",
    description: "Conjunto de layouts prontos para postagens."
  },
  {
    title: "Padrão de postagens",
    fileName: "instagram-template.fig",
    date: "22/07/2026",
    tag: "instagram",
    description: "Referências e grade de conteúdo para Instagram."
  }
];

function formatDate(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDateValue(item) {
  if (item.date) return item.date;
  if (item.created_at) return new Date(item.created_at).toLocaleDateString("pt-BR");
  return formatDate(new Date());
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFileType(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

async function getPdfPageCount(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = document.numPages;
  await document.destroy();
  return pageCount;
}

function mediaPreviewHtml(item) {
  const url = item.file_url || item.previewUrl;
  if (!url) return "";
  const safeUrl = escapeHtml(url);
  if (item.file_type === "image") {
    return `<img class="admin-media-preview" src="${safeUrl}" alt="Prévia de ${escapeHtml(item.title)}" />`;
  }
  if (item.file_type === "video") {
    return `<video class="admin-media-preview" src="${safeUrl}" muted preload="metadata"></video>`;
  }
  if (item.file_type === "pdf") {
    return `<div class="admin-pdf-preview"><span>PDF</span><small>${item.page_count || "?"} página(s)</small></div>`;
  }
  return "";
}

async function loadAdminData() {
  if (!getSupabaseStatus().enabled) {
    return;
  }

  try {
    const [items, tagList] = await Promise.all([fetchContentItems(), fetchTags()]);

    if (tagList.length) {
      tags = ["all", ...tagList.filter(Boolean)];
    }

    if (items.length) {
      contents = items.map((item) => ({
        title: item.title || item.fileName || "Sem título",
        fileName: item.fileName || "Sem nome",
        date: getDateValue(item),
        tag: item.tag || "online",
        description: item.description || "Descrição não disponível.",
        file_url: item.file_url,
        file_type: item.file_type,
        page_count: item.page_count,
      }));
    }
  } catch (error) {
    showMessage("Não foi possível carregar dados do Supabase. Usando dados locais.");
  }
}

function renderTags() {
  if (!tagFilter) return;
  tagFilter.innerHTML = "";
  tags.forEach((tag) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `tag-chip ${activeTag === tag ? "active" : ""}`;
    chip.textContent = tag === "all" ? "Todos" : tag;
    chip.addEventListener("click", () => {
      activeTag = tag;
      currentPage = 1;
      renderTags();
      renderContents();
    });
    tagFilter.appendChild(chip);
  });
}

function renderTagOptions() {
  if (!contentTag) return;
  contentTag.innerHTML = "";
  tags.filter((tag) => tag !== "all").forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    contentTag.appendChild(option);
  });
}

function renderPagination(totalPages) {
  if (!adminPagination) return;
  adminPagination.innerHTML = "";
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
        renderContents();
      });
    }
    return button;
  };

  adminPagination.appendChild(createButton("Anterior", currentPage - 1, currentPage === 1));
  for (let page = 1; page <= totalPages; page += 1) {
    adminPagination.appendChild(createButton(page.toString(), page, false, page === currentPage));
  }
  adminPagination.appendChild(createButton("Próximo", currentPage + 1, currentPage === totalPages));
}

function renderContents() {
  const query = adminSearch?.value.trim().toLowerCase() || "";
  if (!contentList) return;
  contentList.innerHTML = "";

  const filtered = contents.filter((item) => {
    const matchesTag = activeTag === "all" || item.tag === activeTag;
    const matchesSearch =
      query === "" ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.tag.toLowerCase().includes(query) ||
      item.fileName.toLowerCase().includes(query);
    return matchesTag && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (slice.length === 0) {
    adminNoResults?.classList.remove("hidden");
  } else {
    adminNoResults?.classList.add("hidden");
  }

  slice.forEach((item) => {
    const card = document.createElement("article");
    card.className = "content-card";
    card.innerHTML = `
      <div class="card-top">
        <span class="card-badge">${escapeHtml(item.tag)}</span>
        <span class="card-date">${escapeHtml(item.date)}</span>
      </div>
      ${mediaPreviewHtml(item)}
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description)}</p>
      <div class="file-name">Arquivo: ${escapeHtml(item.fileName)}</div>
    `;
    contentList.appendChild(card);
  });

  renderPagination(totalPages);
}

function showMessage(text) {
  if (!adminMessage) return;
  adminMessage.textContent = text;
  adminMessage.classList.remove("hidden");
}

function clearMessage() {
  if (!adminMessage) return;
  adminMessage.textContent = "";
  adminMessage.classList.add("hidden");
}

addTagBtn?.addEventListener("click", () => {
  const newTag = newTagInput?.value.trim().toLowerCase();
  if (!newTag) {
    showMessage("Informe uma nova tag para criar.");
    return;
  }
  if (tags.includes(newTag)) {
    showMessage("Essa tag já existe.");
    return;
  }

  tags.push(newTag);
  if (newTagInput) newTagInput.value = "";
  renderTags();
  renderTagOptions();
  showMessage(`Tag "${newTag}" criada com sucesso.`);
});

adminSearch?.addEventListener("input", () => {
  currentPage = 1;
  renderContents();
});

uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const fileInput = document.getElementById("contentFile");
  const selectedFile = fileInput?.files?.[0];
  const selectedTag = contentTag?.value;
  const titleInput = document.getElementById("contentTitle");
  const descriptionInput = document.getElementById("contentDescription");

  if (!selectedFile) {
    showMessage("Selecione um arquivo antes de adicionar o conteúdo.");
    return;
  }

  if (!selectedTag) {
    showMessage("Escolha uma tag para o conteúdo.");
    return;
  }

  const fileType = getFileType(selectedFile);
  if (fileType === "file") {
    showMessage("Envie um arquivo PDF, uma imagem ou um vídeo.");
    return;
  }

  let pageCount = null;
  if (fileType === "pdf") {
    try {
      pageCount = await getPdfPageCount(selectedFile);
    } catch (error) {
      showMessage("Não foi possível ler este PDF. Verifique se o arquivo não está corrompido.");
      return;
    }
  }

  const newItem = {
    title: titleInput?.value.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""),
    fileName: selectedFile.name,
    date: formatDate(new Date()),
    tag: selectedTag,
    categoria: selectedTag,
    description: descriptionInput?.value.trim() || `Upload: ${selectedFile.type || "tipo não identificado"}`,
    file_type: fileType,
    page_count: pageCount,
    size_bytes: selectedFile.size,
  };

  if (getSupabaseStatus().enabled) {
    let storagePath;
    try {
      const upload = await uploadContentFile(selectedFile);
      storagePath = upload.path;
      newItem.file_url = upload.url;
      newItem.storage_path = upload.path;
      await insertContentItem(newItem);
      contents.unshift(newItem);
      renderContents();
      showMessage(fileType === "pdf" ? `PDF enviado com ${pageCount} página(s).` : "Conteúdo enviado e exibido no painel.");
    } catch (error) {
      if (storagePath) await removeContentFile(storagePath);
      showMessage(error.message || "Erro ao adicionar conteúdo no backend.");
      return;
    }
  } else {
    newItem.previewUrl = URL.createObjectURL(selectedFile);
    contents.unshift(newItem);
    renderContents();
    showMessage(fileType === "pdf" ? `PDF adicionado com ${pageCount} página(s) (simulado).` : "Conteúdo adicionado ao painel (simulado).");
  }

  if (fileInput) fileInput.value = "";
  if (titleInput) titleInput.value = "";
  if (descriptionInput) descriptionInput.value = "";
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminData();
  renderTags();
  renderTagOptions();
  renderContents();
});
