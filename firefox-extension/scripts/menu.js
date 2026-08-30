import { addDestinations, runStartup, buildHashString, buildGroupBookmarkTitle, extractHashString } from "./utils.js";

// browser.sidePanel.open();

const bookmarkingPage = document.getElementById("bookmarking");
const bookmarkingCompletePage = document.getElementById("bookmarking-complete");
const bookmarkingFailedPage = document.getElementById("bookmarking-failed");
const contentsPage = document.getElementById("contents");
const bookmarkingCompleteButton = document.getElementById("bookmarking-complete-button");
const bookmarkingFailedButton = document.getElementById("bookmarking-failed-button");

bookmarkingPage.remove();
bookmarkingCompletePage.remove();
bookmarkingFailedPage.remove();
bookmarkingCompleteButton.addEventListener("click", endBookmarkingComplete);
bookmarkingFailedButton.addEventListener("click", endBookmarkingComplete);

const addBtn = document.getElementById("add-bookmarks-btn");
const destSelect = document.getElementById("select-destination-folder");
const dateLabel = document.getElementById("date-label");
const defaultFolderBtn = document.getElementById("default");
const defaultFolderName = document.getElementById("default-folder-name");

const windows = await browser.windows.getAll();
const allTabs = await Promise.all(windows.map((window) => browser.tabs.query({ windowId: window.id })));
const allGroups = await browser.tabGroups.query({});
const storage = browser.storage.local;
const defaultFolderID = (await storage.get("defaultFolderID"))?.defaultFolderID;

const currentDate = new Date();
const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(
  currentDate.getDate(),
).padStart(2, "0")}`;
dateLabel.textContent = `Today's Date (${dateStr})`;

await runStartup(menuStartup);

async function menuStartup() {
  console.log("In menu startup");
  if (!defaultFolderID) {
    defaultFolderBtn.setAttribute("disabled", "");
    defaultFolderName.textContent = "Not set";
    document.getElementById("default").checked = false;
    document.getElementById("specify").checked = true;
  } else {
    defaultFolderName.textContent = (await browser.bookmarks.get(defaultFolderID))[0].title;
  }

  console.log("Starting to add destinations");
  await addDestinations(destSelect);
  console.log("destinations added");

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
  const shouldSaveGroups = formData.get("save-groups-box") === "yes";

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
      tabs = [await browser.tabs.query({ currentWindow: true })];
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

  let bookmarkingSuccess = true;

  try {
    const rootNode = await browser.bookmarks.create({ parentId: destNodeID, title: rootTitle });

    contentsPage.remove();
    document.body.appendChild(bookmarkingPage);

    const groupWindowIdxMap = {};

    await Promise.all(
      tabs.map(async (window, idx) => {
        const windowNode = await browser.bookmarks.create({ parentId: rootNode.id, title: String(idx + 1) });
        await Promise.all(
          window.map(async (tab) => {
            let groupIdTitle = "";

            if (shouldSaveGroups && tab.groupId > -1) {
              groupIdTitle = buildHashString("group id:" + tab.groupId);

              if (!Object.hasOwn(groupWindowIdxMap, tab.groupId)) {
                groupWindowIdxMap[tab.groupId] = idx;
              }
            }
            await browser.bookmarks.create({ parentId: windowNode.id, title: tab.title + groupIdTitle, url: tab.url });
          }),
        );
      }),
    );

    if (shouldSaveGroups) {
      const groupData = {
        groups: allGroups,
        groupMap: groupWindowIdxMap,
      };
      console.log(groupData);

      allGroups.forEach((group) => {
        console.log(tabs[groupWindowIdxMap[group.id]]);
      });

      const encodedGroupData = btoa(JSON.stringify(groupData));
      console.log(encodedGroupData);
      const groupDataHashString = buildHashString(encodedGroupData);
      console.log(groupDataHashString);
      await browser.bookmarks.create({
        parentId: rootNode.id,
        title: buildGroupBookmarkTitle(groupData),
        url: "https://www.google.com",
      });
    }

    // console.log(parsedGroupData);
  } catch (e) {
    bookmarkingSuccess = false;
    console.error(e);
  } finally {
    bookmarkingPage.remove();
  }

  // bookmarkingPage.remove();
  if (bookmarkingSuccess) {
    document.body.appendChild(bookmarkingCompletePage);
  } else {
    document.body.append(bookmarkingFailedPage);
  }
}

function endBookmarkingComplete() {
  bookmarkingCompletePage.remove();
  bookmarkingFailedPage.remove();
  document.body.appendChild(contentsPage);
}
