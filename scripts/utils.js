const maxLevel = 2;

export async function addDestinations(selectElement) {
  const bookmarkNode = (await chrome.bookmarks.getTree())[0];
  const destinationElements = [];
  const nodeStack = [{ node: bookmarkNode, level: 0 }];

  while (nodeStack.length > 0) {
    const { node: currNode, level: currLevel } = nodeStack.pop();

    if (currNode.id !== "0" && !("url" in currNode)) {
      destinationElements.push(
        `<option value="${currNode.id}">${"&emsp;".repeat(currLevel)}${currNode.title}</option>`
      );
    }

    if (currLevel < maxLevel) {
      currNode.children.forEach((child, idx) => {
        nodeStack.push({ node: child, level: currLevel + 1 });
      });
    }
  }

  selectElement.innerHTML = destinationElements.join("");
}
