const windows = await chrome.windows.getAll();
const tabs = await Promise.all(windows.map((window) => chrome.tabs.query({ windowId: window.id })));

const addBtn = document.getElementById("add-bookmarks-btn");

function addBookmarks() {
  console.log("add bookmarks");
}

document.getElementById("add-bookmarks-form").addEventListener("click", function (e) {
  e.preventDefault();

  if (e.target === addBtn) {
    addBookmarks();
  }
});
