import { addDestinations } from "./utils.js";

const selectElemId = "select-destination-folder";
const destSelect = document.getElementById(selectElemId);
const storage = chrome.storage.local;

document.getElementById("select-dest").addEventListener("click", function (e) {
  e.preventDefault();

  const formData = new FormData(document.getElementById("default-form"));
  const defaultDestination = formData.get(selectElemId);
  storage.set({ defaultFolderID: defaultDestination });
});

await addDestinations(destSelect);
