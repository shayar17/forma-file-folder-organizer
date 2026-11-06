const $ = (id) => document.getElementById(id);
let organizer = null;
let actionLog = [];
let modalMode = "folder";
let currentView = "files";
let toastTimer;

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function parse(value) { return JSON.parse(value); }
function saveLog() { localStorage.setItem("forma-organizer-actions", JSON.stringify(actionLog)); }
function replayActions() {
  for (const action of actionLog) {
    if (action.type === "folder") organizer.createFolder(action.parent, action.name);
    else organizer.addFile(action.parent, action.name);
  }
}
function getTree() { return parse(organizer.treeJson()); }
function getStats() { return parse(organizer.statsJson()); }

function init() {
  if (typeof createOrganizerModule !== "function") {
    $("engine-label").textContent = "C++ engine not built";
    document.querySelector(".status-dot").classList.remove("ready");
    showToast("Build the C++ WebAssembly engine using the README instructions.");
    return;
  }
  createOrganizerModule().then(Module => {
    organizer = new Module.FileOrganizer();
    try { actionLog = JSON.parse(localStorage.getItem("forma-organizer-actions") || "[]"); } catch { actionLog = []; }
    replayActions();
    $("engine-label").textContent = "C++ engine active";
    document.querySelector(".status-dot").classList.add("ready");
    render();
  }).catch(error => {
    $("engine-label").textContent = "Engine failed to load";
    console.error(error);
    showToast("Could not load the C++ engine. Check the build files.");
  });
}

function flatten(tree, path = "", depth = 0) {
  const currentPath = path ? `${path}/${tree.name}` : tree.name;
  const rows = [{...tree, path: currentPath, depth}];
  (tree.children || []).forEach(child => rows.push(...flatten(child, currentPath, depth + 1)));
  return rows;
}
function render() {
  if (!organizer) return;
  const tree = getTree(), stats = getStats();
  $("folder-count").textContent = stats.folders;
  $("file-count").textContent = stats.files;
  $("total-count").textContent = stats.total;
  renderFiles(tree);
  renderTree(tree);
  renderLevels(parse(organizer.bfsJson()));
}
function renderFiles(tree) {
  const list = $("file-list");
  list.innerHTML = "";
  const children = tree.children || [];
  $("visible-count").textContent = `${children.length} item${children.length === 1 ? "" : "s"}`;
  $("empty-state").classList.toggle("hidden", children.length !== 0);
  children.forEach(item => {
    const row = document.createElement("div");
    row.className = "file-row";
    const icon = item.isFolder ? "▰" : "▤";
    const type = item.isFolder ? "Folder" : "File";
    row.innerHTML = `<div class="file-name"><div class="item-icon ${item.isFolder ? "" : "file"}">${icon}</div><div class="item-text"><b></b><small>${item.isFolder ? `${item.children.length} item${item.children.length === 1 ? "" : "s"} inside` : "Stored in Root"}</small></div></div><span class="type-label">${type}</span>`;
    row.querySelector(".item-text b").textContent = item.name;
    if (item.isFolder) row.addEventListener("click", () => openFolder(item.name));
    list.appendChild(row);
  });
}
function openFolder(name) {
  const tree = getTree();
  const node = flatten(tree).find(n => n.isFolder && n.name.toLowerCase() === name.toLowerCase());
  if (!node) return;
  $("section-title").textContent = node.name;
  $("section-caption").textContent = node.path;
  const list = $("file-list");
  list.innerHTML = "";
  $("empty-state").classList.toggle("hidden", node.children.length !== 0);
  $("visible-count").textContent = `${node.children.length} items`;
  node.children.forEach(item => {
    const row = document.createElement("div"); row.className = "file-row";
    row.innerHTML = `<div class="file-name"><div class="item-icon ${item.isFolder ? "" : "file"}">${item.isFolder ? "▰" : "▤"}</div><div class="item-text"><b></b><small>${item.isFolder ? `${item.children.length} items inside` : node.path}</small></div></div><span class="type-label">${item.isFolder ? "Folder" : "File"}</span>`;
    row.querySelector("b").textContent = item.name;
    if (item.isFolder) row.addEventListener("click", () => openFolder(item.name));
    list.appendChild(row);
  });
  $("breadcrumb-current").textContent = node.name;
  $("search-results").classList.add("hidden");
  $("file-list").classList.remove("hidden");
  $("empty-state").classList.toggle("hidden", node.children.length !== 0);
}
function renderTree(tree) {
  const output = $("tree-output"); output.innerHTML = "";
  function walk(node, prefix, last, root = false) {
    const line = document.createElement("div"); line.className = "tree-node";
    const indent = document.createElement("span"); indent.className = "tree-indent"; indent.textContent = root ? "" : prefix + (last ? "└── " : "├── ");
    const glyph = document.createElement("span"); glyph.textContent = node.isFolder ? "▰" : "▤"; glyph.className = node.isFolder ? "tree-folder" : "tree-file";
    const label = document.createElement("span"); label.textContent = node.name + (node.isFolder ? "/" : "");
    line.append(indent, glyph, label); output.appendChild(line);
    node.children.forEach((child, i) => walk(child, root ? "" : prefix + (last ? "    " : "│   "), i === node.children.length - 1));
  }
  walk(tree, "", true, true);
}
function renderLevels(levels) {
  const output = $("levels-output"); output.innerHTML = "";
  levels.forEach((level, index) => {
    const row = document.createElement("div"); row.className = "level-row";
    const badge = document.createElement("span"); badge.className = "level-badge"; badge.textContent = `LEVEL ${index}`;
    const items = document.createElement("div"); items.className = "level-items";
    level.forEach(item => { const chip = document.createElement("span"); chip.className = "level-item"; chip.textContent = `${item.isFolder ? "▰" : "▤"} ${item.name}${item.isFolder ? "/" : ""}`; items.appendChild(chip); });
    row.append(badge, items); output.appendChild(row);
  });
}
function switchView(view) {
  currentView = view;
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  $("files-view").classList.toggle("hidden", view !== "files");
  $("tree-view").classList.toggle("hidden", view !== "tree");
  $("levels-view").classList.toggle("hidden", view !== "levels");
  const names = {files:["My files","Browse and manage your folder structure"],tree:["Tree structure","Explore the hierarchy using preorder DFS"],levels:["Level order","Explore the hierarchy using breadth-first traversal"]};
  $("page-title").innerHTML = `${names[view][0]}<span>.</span>`;
  $("breadcrumb-current").textContent = names[view][0];
  $("page-subtitle").textContent = view === "files" ? "A clear space for everything that matters." : names[view][1];
  $("section-title").textContent = view === "files" ? "All items" : names[view][0];
  $("section-caption").textContent = names[view][1];
  $("toolbar").style.display = view === "files" ? "flex" : "none";
}
function openModal(mode) {
  modalMode = mode;
  $("modal-kicker").textContent = mode === "folder" ? "NEW FOLDER" : "NEW FILE";
  $("modal-title").textContent = mode === "folder" ? "Create a folder" : "Add a file";
  $("modal-description").textContent = mode === "folder" ? "Choose a parent folder for your new folder." : "Add a file entry to an existing folder.";
  $("name-label").firstChild.textContent = mode === "folder" ? "Folder name" : "File name";
  $("item-name").placeholder = mode === "folder" ? "e.g. Semester 3" : "e.g. ADS_Report.pdf";
  $("submit-item").textContent = mode === "folder" ? "Create folder" : "Add file";
  const select = $("parent-folder"); select.innerHTML = "";
  flatten(getTree()).filter(n => n.isFolder).forEach(folder => {
    const option = document.createElement("option"); option.value = folder.name; option.textContent = folder.path; select.appendChild(option);
  });
  $("item-name").value = ""; $("form-error").textContent = "";
  $("modal-backdrop").classList.remove("hidden"); $("item-name").focus();
}
function closeModal() { $("modal-backdrop").classList.add("hidden"); }
function searchItems(query) {
  const results = $("search-results"), list = $("file-list"), empty = $("empty-state");
  if (!query.trim()) { results.classList.add("hidden"); list.classList.remove("hidden"); empty.classList.toggle("hidden", getTree().children.length !== 0); return; }
  const matches = parse(organizer.searchJson(query.trim()));
  list.classList.add("hidden"); empty.classList.add("hidden"); results.classList.remove("hidden"); results.innerHTML = `<h3>${matches.length} MATCH${matches.length === 1 ? "" : "ES"} FOUND</h3>`;
  if (!matches.length) { const none = document.createElement("div"); none.className = "no-result"; none.textContent = "No matching file or folder found."; results.appendChild(none); }
  matches.forEach(path => { const row = document.createElement("div"); row.className = "result-item"; row.innerHTML = "<span>⌕</span>"; row.appendChild(document.createTextNode(path)); results.appendChild(row); });
}
document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
$("new-folder-btn").addEventListener("click", () => openModal("folder"));
$("add-file-btn").addEventListener("click", () => openModal("file"));
$("empty-create").addEventListener("click", () => openModal("folder"));
$("modal-close").addEventListener("click", closeModal);
$("cancel-modal").addEventListener("click", closeModal);
$("modal-backdrop").addEventListener("click", e => { if (e.target === $("modal-backdrop")) closeModal(); });
$("item-form").addEventListener("submit", e => {
  e.preventDefault(); if (!organizer) return;
  const parent = $("parent-folder").value, name = $("item-name").value.trim();
  if (!name) { $("form-error").textContent = "Please enter a name."; return; }
  const message = modalMode === "folder" ? organizer.createFolder(parent, name) : organizer.addFile(parent, name);
  const success = message.includes("successfully");
  if (!success) { $("form-error").textContent = message; return; }
  actionLog.push({type:modalMode,parent,name}); saveLog(); closeModal(); $("search-input").value = "";
  render(); switchView("files"); showToast(message);
});
$("search-input").addEventListener("input", e => searchItems(e.target.value));
$("reset-btn").addEventListener("click", () => {
  if (!confirm("Reset the workspace and remove all saved items?")) return;
  actionLog = []; saveLog(); location.reload();
});
document.addEventListener("keydown", e => {
  if (e.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) { e.preventDefault(); $("search-input").focus(); }
  if (e.key === "Escape") closeModal();
});
init();
