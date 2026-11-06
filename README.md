# Forma — File & Folder Organizer

A browser-based file/folder organization interface powered by a **C++ n-ary tree compiled to WebAssembly**.

## Features

- Create folders inside any existing folder
- Add file entries to folders
- Prevent duplicate names within the same parent
- Search files and folders by name (case-insensitive)
- Display the hierarchy using preorder DFS
- Display the hierarchy level-by-level using BFS and a queue
- Dashboard statistics
- Persist user-created items in browser LocalStorage and replay them into the C++ tree on reload
- Responsive dashboard interface

## Technology

- C++11 core (`src/organizer.cpp`)
- Emscripten / WebAssembly bridge (Embind)
- HTML, CSS and JavaScript interface
- Browser LocalStorage for persistence

## Build the C++ WebAssembly engine

Install the Emscripten SDK and activate it in your terminal. From the project root, run:

```bash
make
```

Or run the compiler command directly:

```bash
em++ -std=c++11 -O2 -Wall -Wextra src/organizer.cpp -o organizer.js \
  --bind -s MODULARIZE=1 -s EXPORT_NAME=createOrganizerModule \
  -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web \
  -s NO_EXIT_RUNTIME=1
```

This generates `organizer.js` and `organizer.wasm` in the project root. These are build outputs; do not edit them manually.

## Run locally

After building, serve the project directory through a local web server. For example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

Do not open `index.html` directly as a `file://` URL; browsers need to fetch the WebAssembly file over HTTP.

## Free deployment with GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy.yml`. You do **not** need to install Emscripten on your own computer. GitHub Actions installs Emscripten, compiles the C++ code into WebAssembly, and publishes the website automatically whenever you push changes to the `main` branch.

1. Create a **public** repository on GitHub (GitHub Pages is available on GitHub Free for public repositories).
2. Upload the contents of this project folder to the repository root. Keep the `.github/workflows/deploy.yml` file and its folders; they are required for automatic deployment.
3. On GitHub, open the repository's **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. Open the repository's **Actions** tab and wait for **Build and deploy Forma** to finish successfully.
6. Open **Settings → Pages** to find the published website URL. It will usually look like `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

If the workflow fails, open the failed run in the Actions tab and inspect the first red step. The workflow log contains the error that needs fixing.

## Academic data-structure mapping

| Project requirement | Implementation |
|---|---|
| General / n-ary tree | `Node` with a variable-length `vector<unique_ptr<Node>> children` |
| Folder lookup | Recursive depth-first search |
| Create folder / add file | Find parent, check duplicate child name, append node |
| Hierarchy display | Preorder DFS tree JSON, rendered by the interface |
| Level-wise display | Queue-based BFS |
| Search | DFS, case-insensitive name comparison, full paths returned |
| Memory management | C++ smart pointers; recursive tree ownership |

## Notes and scope

- The project manages **virtual file entries** in its own tree. It does not read, move, or modify the computer's real files.
- Browser LocalStorage saves the sequence of create/add operations and replays them into the C++ tree when the page loads.
- The browser interface calls the C++ implementation through WebAssembly. The JavaScript layer handles presentation, browser storage, and user interaction.
- The root folder is named `Root`, matching the supplied project report.
