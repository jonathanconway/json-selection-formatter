chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'format-json',
    title: 'Format selected JSON',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'format-json') return;
  // Pass the text via session storage rather than the URL to avoid length limits.
  const id = crypto.randomUUID();
  await chrome.storage.session.set({ [id]: info.selectionText });
  const createProps = { url: chrome.runtime.getURL(`viewer.html#${id}`) };
  if (tab && tab.index >= 0) createProps.index = tab.index + 1;
  chrome.tabs.create(createProps);
});
