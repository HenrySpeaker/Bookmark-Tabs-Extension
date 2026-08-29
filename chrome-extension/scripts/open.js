import { addDestinations, runStartup, groupDataText, extractGroupData, extractHashString } from "./utils.js";

const form = document.getElementById("open-form");

await runStartup(openStartup);

async function openStartup() {
  await addDestinations(document.getElementById("folder-select"));

  form.addEventListener("click", async function (e) {
    if (e.target === document.getElementById("open-btn")) {
      const formData = new FormData(form);
      const startFolderID = formData.get("folder-select");
      const windowed = formData.get("depth-choice") === "windowed";
      const regularWindow = formData.get("window-type") === "regular";
      const windowState = formData.get("max-min-window");
      const shouldOpenGroups = formData.get("open-groups-box") === "yes";

      const bookmarkWindows = [];
      if (!windowed) bookmarkWindows.push([]);

      const startFolder = (await chrome.bookmarks.getSubTree(startFolderID))[0];

      const bookmarkQueue = [startFolder];

      let groupData = null;
      while (bookmarkQueue.length > 0) {
        const currBookmark = bookmarkQueue.shift();

        if ("url" in currBookmark) continue;

        const currWindow = [];

        currBookmark?.children.forEach((bookmark) => {
          if ("url" in bookmark) {
            if (windowed) {
              currWindow.push(bookmark);
            } else {
              bookmarkWindows[0].push(bookmark);
            }
          } else if (bookmark.title.substring(0, groupDataText.length) === groupDataText) {
            console.log("Group metadata found:");
            groupData = extractGroupData(bookmark.title);
            console.log(groupData);
          } else {
            bookmarkQueue.push(bookmark);
          }
        });

        if (windowed && currWindow.length > 0) bookmarkWindows.push(currWindow);
      }

      const windowIDs = [];
      const groups = {};

      await Promise.all(
        bookmarkWindows.map(async (windowContents, idx) => {
          const window = await chrome.windows.create({
            incognito: !regularWindow,
            state: windowState,
          });

          if (groupData !== null) {
            for (const groupId of Object.keys(groupData.groupMap)) {
              if (groupData.groupMap[groupId] === idx) {
                groups[groupId] = {
                  windowId: window.id,
                  tabIds: [],
                };
              }
            }
          }

          windowIDs.push(window.id);

          return Promise.all(
            windowContents.map(async (bookmark) => {
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

              const newTab = await chrome.tabs.create({
                windowId: window.id,
                url: bookmark.url,
              });

              if (groupId >= 0) {
                groups[groupId].tabIds.push(newTab.id);
              }
            }),
          );
        }),
      );

      console.log("groups:");
      console.log(groups);

      await Promise.all(
        windowIDs
          .map(async (windowID) => await chrome.tabs.query({ windowId: windowID }))
          .filter(async (tabs) => {
            tabs = await tabs;
            return (tabs[0]?.url ?? tabs[0]?.pendingUrl) === "";
          })
          .map(async (tabs) => {
            tabs = await tabs;
            chrome.tabs.remove(tabs[0].id);
          }),
      );

      if (!shouldOpenGroups) {
        return;
      }

      for (const groupId of Object.keys(groups)) {
        console.log(`Grouping for id: ${groupId}`);
        const newGroupId = await chrome.tabs.group({
          createProperties: {
            windowId: groups[groupId].windowId,
          },
          tabIds: groups[groupId].tabIds,
        });
        groups[groupId].newGroupId = newGroupId;
      }

      for (const oldGroup of groupData.groups) {
        const groupId = oldGroup.id;
        await chrome.tabGroups.update(groups[groupId].newGroupId, {
          collapsed: oldGroup.collapsed,
          color: oldGroup.color,
          title: oldGroup.title,
        });
      }
    }
  });
}
