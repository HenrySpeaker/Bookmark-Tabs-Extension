let destinationElements = [];

export function addDestinations(bookmarkNode, currentLevel, selectElement) {
  if ("url" in bookmarkNode || currentLevel > 2) {
    return;
  }

  if (bookmarkNode.id === "0") {
    destinationElements = [];
  } else {
    destinationElements.push(
      `<option value="${bookmarkNode.id}">${"&emsp;".repeat(currentLevel)}${bookmarkNode.title}</option>`
    );
  }

  bookmarkNode.children.forEach((child, idx) => {
    addDestinations(child, currentLevel + 1, selectElement);
  });

  if (currentLevel === 0) {
    selectElement.innerHTML = destinationElements.join("");
  }
}
