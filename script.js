const windows = await chrome.windows.getAll();
const tabs = await Promise.all(windows.map((window) => chrome.tabs.query({ windowId: window.id })));
const bookmarks = (await chrome.bookmarks.getTree())[0];

const addBtn = document.getElementById("add-bookmarks-btn");
const destSelect = document.getElementById("select-destination-folder");
const destinationElements = [];

function addDestinations(bookmarkNode, currentLevel) {
  if ("url" in bookmarkNode) {
    return;
  }

  destinationElements.push(
    `<option value="${bookmarkNode.id}">${"&emsp;".repeat(currentLevel)}${bookmarkNode.title}</option>`
  );

  bookmarkNode.children.forEach((child, idx) => {
    addDestinations(child, currentLevel + 1);
  });

  if (currentLevel === 0) {
    destSelect.innerHTML = destinationElements.join("");
  }
}

addDestinations(bookmarks, 0);

function addBookmarks() {
  console.log("add bookmarks");
}

document.getElementById("add-bookmarks-form").addEventListener("click", function (e) {
  if (e.target === addBtn) {
    e.preventDefault();
    addBookmarks();
  }
});
