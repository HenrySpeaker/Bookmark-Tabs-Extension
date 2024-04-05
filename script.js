const windows = await chrome.windows.getAll();
const tabs = await Promise.all(windows.map((window) => chrome.tabs.query({ windowId: window.id })));
