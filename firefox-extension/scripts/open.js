import { addDestinations, runStartup, groupDataText, extractGroupData, extractHashString } from "./utils.js";

const form = document.getElementById("open-form");
const ffWarning = document.getElementById("firefox-warning");

await runStartup(openStartup);

async function openStartup() {
  await addDestinations(document.getElementById("folder-select"));

  form.addEventListener("click", async function (e) {
    const formData = new FormData(form);
    if (e.target === document.getElementById("open-btn")) {
      const startFolderID = formData.get("folder-select");
      const windowed = formData.get("depth-choice") === "windowed";
      const regularWindow = formData.get("window-type") === "regular";
      const windowState = formData.get("max-min-window");
      const shouldOpenGroups = formData.get("open-groups-box") === "yes";
      const bookmarkWindows = [];
      if (!windowed) bookmarkWindows.push([]);

      const startFolder = (await browser.bookmarks.getSubTree(startFolderID))[0];
      const bookmarkQueue = [startFolder];

      let groupData = null;
      while (bookmarkQueue.length > 0) {
        const currBookmark = bookmarkQueue.shift();
        const currWindow = [];

        currBookmark?.children.forEach((bookmark) => {
          console.log("bookmark");
          console.log(bookmark);
          if (bookmark.title.substring(0, groupDataText.length) === groupDataText) {
            console.log("Group metadata found:");
            groupData = extractGroupData(bookmark.title);
            console.log(groupData);
          } else if (bookmark?.url !== undefined) {
            if (windowed) {
              currWindow.push(bookmark);
            } else {
              bookmarkWindows[0].push(bookmark);
            }
          } else {
            bookmarkQueue.push(bookmark);
          }
        });

        if (windowed && currWindow.length > 0) bookmarkWindows.push(currWindow);
      }

      console.log("Group data:");
      console.log(groupData);

      console.log("Bookmark windows");
      console.log(bookmarkWindows);

      const windowIDs = [];
      const groups = {};

      await Promise.all(
        bookmarkWindows.map(async (windowContents, idx) => {
          console.log("Opening window");
          console.log(windowContents);
          const window = await browser.windows.create({
            incognito: !regularWindow,
            state: windowState,
            focused: false,
            url: "https://www.firefox.com",
          });

          console.log("window opening complete");

          console.log("Group search in window");
          windowIDs.push(window.id);

          console.log("opening tabs");

          return Promise.all(
            windowContents.map(async (bookmark) => {
              console.log(`Opening tab ${bookmark.title} in window ${window.id}`);
              const title = bookmark.title;
              let groupId = -1;

              if (title.charAt(title.length - 1) === ">") {
                for (let idx = 0; idx < title.length; idx++) {
                  if (title.charAt(idx) === "<") {
                    const possGroupId = extractHashString(title.substring(idx));
                    console.log(`Possible group ID found: ${possGroupId}`);

                    if (possGroupId.length > 0) {
                      groupId = +possGroupId.substring(possGroupId.indexOf(":") + 1);
                      console.log(`Parsed group ID: ${groupId}`);
                      break;
                    }
                  }
                }
              }

              const newTab = await browser.tabs.create({
                windowId: window.id,
                url: bookmark.url,
              });

              if (groupId >= 0) {
                if (!Object.hasOwn(groups, groupId)) {
                  groups[groupId] = {
                    windowId: window.id,
                    tabIds: [],
                  };
                }
                groups[groupId].tabIds.push(newTab.id);
              }
            }),
          );
        }),
      );

      console.log("groups:");
      console.log(groups);

      if (!shouldOpenGroups) {
        return;
      }

      await Promise.all(
        windowIDs
          .map(async (windowID) => await browser.tabs.query({ windowId: windowID }))
          .filter(async (tabs) => {
            tabs = await tabs;
            return (tabs[0]?.url ?? tabs[0]?.pendingUrl) === "";
          })
          .map(async (tabs) => {
            tabs = await tabs;
            browser.tabs.remove(tabs[0].id);
          }),
      );

      if (!shouldOpenGroups || groupData === null) {
        return;
      }

      for (const groupId of Object.keys(groups)) {
        console.log(`Grouping for id: ${groupId}`);
        const newGroupId = await browser.tabs.group({
          createProperties: {
            windowId: groups[groupId].windowId,
          },
          tabIds: groups[groupId].tabIds,
        });
        groups[groupId].newGroupId = newGroupId;
      }

      for (const oldGroup of groupData.groups) {
        const groupId = oldGroup.id;

        if (!Object.hasOwn(groups, groupId)) {
          console.log("Skipping group, no matching ID found among open groups:");
          console.log(oldGroup);
          continue;
        }

        await browser.tabGroups.update(groups[groupId].newGroupId, {
          collapsed: oldGroup.collapsed,
          color: oldGroup.color,
          title: oldGroup.title,
        });
      }
    } else if (e.target === document.getElementById("open-groups")) {
      console.log("open groups clicked");
      const shouldOpenGroups = formData.get("open-groups-box") === "yes";
      console.log(`Current shouldOpenGroups: ${shouldOpenGroups}`);
      ffWarning.style.display = shouldOpenGroups ? "" : "none";
    }
  });
}
