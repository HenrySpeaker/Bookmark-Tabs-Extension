const maxLevel = 10;

export async function addDestinations(selectElement) {
  const bookmarkNode = (await chrome.bookmarks.getTree())[0];
  const destinationElements = [];
  const nodeStack = [{ node: bookmarkNode, level: 0 }];

  while (nodeStack.length > 0) {
    const { node: currNode, level: currLevel } = nodeStack.pop();

    if (currNode.id !== "0" && !("url" in currNode)) {
      destinationElements.push(
        `<option value="${currNode.id}">${"&emsp;".repeat(currLevel)}${currNode.title}</option>`,
      );
    }

    if (currLevel < maxLevel && "children" in currNode) {
      currNode.children.forEach((child, idx) => {
        nodeStack.push({ node: child, level: currLevel + 1 });
      });
    }
  }

  selectElement.innerHTML = destinationElements.join("");
}

export async function runStartup(startupFunction) {
  const contentsDiv = document.getElementById("contents");
  contentsDiv.style.visibility = "hidden";

  await startupFunction();

  document.getElementById("spinner").remove();
  contentsDiv.style.visibility = "visible";
}

export function buildHashString(str) {
  if (str.length === 0) {
    return str;
  }

  return `<${str}|${btoa(str)}>`;
}

const hashRegexPattern = /.*<(.*)\|([a-zA-Z0-9\/+=]*)>$/gm;

export function extractHashString(str) {
  const matches = str.match(hashRegexPattern);

  // console.log("matches:");
  // console.log(matches);

  if (matches.length !== 1) {
    return "";
  }

  let [plain, base] = matches[0].split("|");
  plain = plain.substring(1);
  base = base.substring(0, base.length - 1);
  console.log(plain);
  console.log(base);

  if (btoa(plain) !== base) {
    return "";
  }

  return plain;
}

export const groupDataText = "Do not modify. Bookmark Manager group data. ";

export function buildGroupBookmarkTitle(groupData) {
  const baseGroupStr = btoa(JSON.stringify(groupData));

  return groupDataText + buildHashString(baseGroupStr);
}

export function extractGroupData(bookmarkTitle) {
  if (bookmarkTitle.substring(0, groupDataText.length) !== groupDataText) {
    throw new Error("Invalid group data. Cannot parse.");
  }

  const body = bookmarkTitle.substring(groupDataText.length);
  const parsedGroupDataHashString = extractHashString(body);
  // console.log("parsed base");
  // console.log(parsedGroupDataHashString);

  if (parsedGroupDataHashString.length === 0) {
    return {};
  }

  return JSON.parse(atob(parsedGroupDataHashString));
}
