const currentIndex = {};
let currentGroup = -1;

async function updateCurrentTab() {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
  if (tabs.length) {
    currentIndex[tabs[0].windowId] = tabs[0].index;
    currentGroup = tabs[0].groupId ?? -1;
  }
}

// Ensure state is ready before handling events
const ready = updateCurrentTab();

chrome.tabs.onCreated.addListener(async (tab) => {
  await ready;

  if (!Number.isInteger(currentIndex[tab.windowId])) {
    await updateCurrentTab();
  }

  const idx = currentIndex[tab.windowId];
  if (!Number.isInteger(idx)) return;

  const moveToIndex = idx + 1;
  currentIndex[tab.windowId] = moveToIndex;

  if (tab.index === moveToIndex) return;

  try {
    await chrome.tabs.move(tab.id, { index: moveToIndex });
  } catch (e) {
    return;
  }

  if (currentGroup >= 0) {
    try {
      await chrome.tabs.group({ tabIds: tab.id, groupId: currentGroup });
    } catch (e) { /* group may not exist */ }
  }
});

chrome.tabs.onActivated.addListener(() => {
  setTimeout(updateCurrentTab, 300);
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  currentIndex[moveInfo.windowId] = moveInfo.toIndex;
  updateCurrentTab();
});

chrome.tabs.onRemoved.addListener(() => {
  setTimeout(updateCurrentTab, 300);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId > 0) {
    setTimeout(updateCurrentTab, 300);
  }
});

chrome.runtime.onInstalled.addListener(updateCurrentTab);
