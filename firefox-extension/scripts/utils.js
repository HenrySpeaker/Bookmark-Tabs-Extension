const maxLevel = 10;

export async function addDestinations(selectElement) {
  const bookmarkNode = (await browser.bookmarks.getTree())[0];
  const destinationElements = [];
  const nodeStack = [{ node: bookmarkNode, level: -1 }];

  while (nodeStack.length > 0) {
    const { node: currNode, level: currLevel } = nodeStack.pop();

    if (currNode.id !== "0" && currNode.type === "folder" && currNode.title.length > 0) {
      const newOpt = document.createElement("option");
      newOpt.setAttribute("value", currNode.id);
      newOpt.innerText = "\u00A0\u00A0\u00A0".repeat(currLevel) + currNode.title;
      destinationElements.push(newOpt);
    }

    if (currLevel < maxLevel && "children" in currNode) {
      currNode.children.forEach((child, idx) => {
        nodeStack.push({ node: child, level: currLevel + 1 });
      });
    }
  }

  destinationElements.forEach((opt) => {
    selectElement.appendChild(opt);
  });
}

export async function runStartup(startupFunction) {
  const contentsDiv = document.getElementById("contents");
  contentsDiv.style.visibility = "hidden";

  await startupFunction();

  document.getElementById("spinner").remove();
  contentsDiv.style.visibility = "visible";
}

export function isValidUrl(urlString) {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // validate protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
      "((\\d{1,3}\\.){3}\\d{1,3}))" +
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
      "(\\?[;&a-z\\d%_.~+=-]*)?" +
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );
  return !!urlPattern.test(urlString);
}
