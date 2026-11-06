#include <algorithm>
#include <cctype>
#include <memory>
#include <queue>
#include <sstream>
#include <string>
#include <vector>
#include <emscripten/bind.h>

using namespace std;
using namespace emscripten;

struct Node {
    string name;
    bool isFolder;
    vector<unique_ptr<Node>> children;

    Node(const string& n, bool folder) : name(n), isFolder(folder) {}
};

class FileOrganizer {
private:
    unique_ptr<Node> root;

    static string lower(string s) {
        transform(s.begin(), s.end(), s.begin(),
                  [](unsigned char c) { return static_cast<char>(tolower(c)); });
        return s;
    }

    static string escapeJson(const string& s) {
        string out;
        for (char c : s) {
            switch (c) {
                case '"': out += "\\\""; break;
                case '\\': out += "\\\\"; break;
                case '\n': out += "\\n"; break;
                case '\r': out += "\\r"; break;
                case '\t': out += "\\t"; break;
                default: out += c;
            }
        }
        return out;
    }

    Node* findFolder(Node* current, const string& target) {
        if (current->isFolder && lower(current->name) == lower(target)) return current;
        for (auto& child : current->children) {
            if (child->isFolder) {
                Node* found = findFolder(child.get(), target);
                if (found) return found;
            }
        }
        return nullptr;
    }

    bool nameExists(Node* folder, const string& name) {
        for (const auto& child : folder->children) {
            if (lower(child->name) == lower(name)) return true;
        }
        return false;
    }

    void appendTreeJson(const Node* node, stringstream& out) const {
        out << "{\"name\":\"" << escapeJson(node->name)
            << "\",\"isFolder\":" << (node->isFolder ? "true" : "false")
            << ",\"children\":[";
        for (size_t i = 0; i < node->children.size(); ++i) {
            if (i) out << ",";
            appendTreeJson(node->children[i].get(), out);
        }
        out << "]}";
    }

    void collectPaths(const Node* node, const string& parentPath,
                      const string& target, vector<string>& results) const {
        string current = parentPath.empty()
            ? node->name
            : parentPath + "/" + node->name;
        if (lower(node->name) == lower(target)) results.push_back(current);
        for (const auto& child : node->children) {
            collectPaths(child.get(), current, target, results);
        }
    }

public:
    FileOrganizer() : root(unique_ptr<Node>(new Node("Root", true))) {}

    string createFolder(const string& parentName, const string& name) {
        if (name.empty()) return "Folder name cannot be empty.";
        Node* parent = findFolder(root.get(), parentName);
        if (!parent) return "Parent folder not found.";
        if (nameExists(parent, name)) return "An item with this name already exists there.";
        parent->children.push_back(unique_ptr<Node>(new Node(name, true)));
        return "Folder created successfully.";
    }

    string addFile(const string& folderName, const string& name) {
        if (name.empty()) return "File name cannot be empty.";
        Node* folder = findFolder(root.get(), folderName);
        if (!folder) return "Folder not found.";
        if (nameExists(folder, name)) return "An item with this name already exists there.";
        folder->children.push_back(unique_ptr<Node>(new Node(name, false)));
        return "File added successfully.";
    }

    string treeJson() const {
        stringstream out;
        appendTreeJson(root.get(), out);
        return out.str();
    }

    string bfsJson() const {
        stringstream out;
        queue<const Node*> q;
        q.push(root.get());
        out << "[";
        bool firstLevel = true;
        while (!q.empty()) {
            int count = static_cast<int>(q.size());
            if (!firstLevel) out << ",";
            firstLevel = false;
            out << "[";
            for (int i = 0; i < count; ++i) {
                const Node* current = q.front();
                q.pop();
                if (i) out << ",";
                out << "{\"name\":\"" << escapeJson(current->name)
                    << "\",\"isFolder\":" << (current->isFolder ? "true" : "false") << "}";
                for (const auto& child : current->children) q.push(child.get());
            }
            out << "]";
        }
        out << "]";
        return out.str();
    }

    string searchJson(const string& target) const {
        vector<string> results;
        collectPaths(root.get(), "", target, results);
        stringstream out;
        out << "[";
        for (size_t i = 0; i < results.size(); ++i) {
            if (i) out << ",";
            out << "\"" << escapeJson(results[i]) << "\"";
        }
        out << "]";
        return out.str();
    }

    string statsJson() const {
        int folders = 0, files = 0;
        queue<const Node*> q;
        q.push(root.get());
        while (!q.empty()) {
            const Node* current = q.front();
            q.pop();
            if (current->isFolder) ++folders;
            else ++files;
            for (const auto& child : current->children) q.push(child.get());
        }
        stringstream out;
        out << "{\"folders\":" << folders - 1 << ",\"files\":" << files
            << ",\"total\":" << folders + files - 1 << "}";
        return out.str();
    }
};

EMSCRIPTEN_BINDINGS(file_folder_organizer) {
    class_<FileOrganizer>("FileOrganizer")
        .constructor<>()
        .function("createFolder", &FileOrganizer::createFolder)
        .function("addFile", &FileOrganizer::addFile)
        .function("treeJson", &FileOrganizer::treeJson)
        .function("bfsJson", &FileOrganizer::bfsJson)
        .function("searchJson", &FileOrganizer::searchJson)
        .function("statsJson", &FileOrganizer::statsJson);
}
