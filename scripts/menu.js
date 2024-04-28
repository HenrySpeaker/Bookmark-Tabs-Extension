import { addDestinations, runStartup } from "./utils.js";

const addBtn = document.getElementById("add-bookmarks-btn");
const destSelect = document.getElementById("select-destination-folder");
const dateLabel = document.getElementById("date-label");
const defaultFolderBtn = document.getElementById("default");
const defaultFolderName = document.getElementById("default-folder-name");

const windows = await chrome.windows.getAll();
const allTabs = await Promise.all(windows.map((window) => chrome.tabs.query({ windowId: window.id })));
const storage = chrome.storage.local;
const defaultFolderID = (await storage.get("defaultFolderID"))?.defaultFolderID;

const currentDate = new Date();
const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()).padStart(2, "0")}-${String(
  currentDate.getDate()
).padStart(2, "0")}`;
dateLabel.textContent = `Today's Date (${dateStr})`;

await runStartup(menuStartup);

async function menuStartup() {
  if (!defaultFolderID) {
    defaultFolderBtn.setAttribute("disabled", "");
    defaultFolderName.textContent = "Not set";
  } else {
    defaultFolderName.textContent = (await chrome.bookmarks.get(defaultFolderID))[0].title;
  }

  await addDestinations(destSelect);

  document.getElementById("add-bookmarks-form").addEventListener("click", async function (e) {
    if (e.target === addBtn) {
      e.preventDefault();
      await addBookmarks(e.target.parentNode);
    }

    if (e.target === document.getElementById("custom-name")) {
      document.getElementById("custom-name-radio").checked = true;
    }
  });
}

async function addBookmarks(formElem) {
  const formData = new FormData(formElem);

  const destType = formData.get("destination");
  const windowType = formData.get("window-type");
  const nameType = formData.get("root-name");

  let destNodeID = "2";

  switch (destType) {
    case "default":
      destNodeID = defaultFolderID ?? "2";
      break;
    case "specify":
      destNodeID = formData.get("destination-folder");
      break;
  }

  let tabs = [];

  switch (windowType) {
    case "all":
      tabs = allTabs;
      break;
    case "regular":
      tabs = allTabs.filter((window) => !window[0].incognito);
      break;
    case "incognito":
      tabs = allTabs.filter((window) => window[0].incognito);
      break;
    case "current":
      tabs = [await chrome.tabs.query({ currentWindow: true })];
      break;
  }

  let rootTitle = "<name>";

  switch (nameType) {
    case "date":
      rootTitle = dateStr;
      break;
    case "custom-name":
      rootTitle = document.getElementById("custom-name").value;
      break;
  }

  const rootNode = await chrome.bookmarks.create({ parentId: destNodeID, title: rootTitle });

  await Promise.all(
    tabs.map(async (window, idx) => {
      const windowNode = await chrome.bookmarks.create({ parentId: rootNode.id, title: String(idx + 1) });
      await Promise.all(
        window.map(async (tab) => {
          await chrome.bookmarks.create({ parentId: windowNode.id, title: tab.title, url: tab.url });
        })
      );
    })
  );
}
