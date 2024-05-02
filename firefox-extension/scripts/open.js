import { addDestinations, isValidUrl, runStartup } from "./utils.js";

const form = document.getElementById("open-form");

await runStartup(openStartup);

async function openStartup() {
  await addDestinations(document.getElementById("folder-select"));

  form.addEventListener("click", async function (e) {
    if (e.target === document.getElementById("open-btn")) {
      const formData = new FormData(form);

      const startFolderID = formData.get("folder-select");
      const regularWindow = formData.get("window-type") === "regular";
      const windowState = formData.get("max-min-window");

      const urls = [];
      const startFolder = (await browser.bookmarks.getSubTree(startFolderID))[0];
      const bookmarkQueue = [startFolder];

      while (bookmarkQueue.length > 0) {
        const currBookmark = bookmarkQueue.shift();

        currBookmark?.children.forEach((bookmark) => {
          if ((bookmark?.children ?? []).length === 0) {
            if (isValidUrl(bookmark.url)) {
              urls.push(bookmark.url);
            }
          } else {
            bookmarkQueue.push(bookmark);
          }
        });
      }

      try {
        await browser.windows.create({
          incognito: !regularWindow,
          state: windowState,
          url: urls,
        });
      } catch (err) {
        const incognitoErrElem = document.getElementById("incognito-message");
        incognitoErrElem.innerText =
          "Window cannot be opened in incognito mode. Check the extension settings at 'about:addons' to ensure the extension is allowed in incognito mode.";
      }
    }
  });
}
