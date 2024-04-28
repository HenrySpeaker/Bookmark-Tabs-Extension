import { addDestinations, runStartup } from "./utils.js";

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

      const bookmarkWindows = [];
      if (!windowed) bookmarkWindows.push([]);

      const startFolder = (await chrome.bookmarks.getSubTree(startFolderID))[0];

      const bookmarkQueue = [startFolder];

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
          } else {
            bookmarkQueue.push(bookmark);
          }
        });

        if (windowed) bookmarkWindows.push(currWindow);
      }

      const windowIDs = [];

      await Promise.all(
        bookmarkWindows.map(async (windowContents) => {
          const window = await chrome.windows.create({
            incognito: !regularWindow,
            state: windowState,
          });

          windowIDs.push(window.id);

          return Promise.all(
            windowContents.map(async (bookmark) => {
              chrome.tabs.create({
                windowId: window.id,
                url: bookmark.url,
              });
            })
          );
        })
      );

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
          })
      );
    }
  });
}
