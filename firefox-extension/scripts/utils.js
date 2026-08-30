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
    "i",
  );
  return !!urlPattern.test(urlString);
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
  // console.log(plain);
  // console.log(base);

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
