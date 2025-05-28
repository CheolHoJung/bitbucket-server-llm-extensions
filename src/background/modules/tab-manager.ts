function isBitbucketUrl(tabUrl: string | undefined, storedUrl: string | undefined): boolean {
    return !!(tabUrl && storedUrl && tabUrl.startsWith(storedUrl));
}

async function injectContentScript(tabId: number) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js'],
        });
        console.log(`[TabManager] Content script injected into tab ${tabId}.`);
    } catch (err) {
        console.error(`[TabManager] Failed to inject script into tab ${tabId}:`, err);
    }
}

export function initializeTabListener() {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (tab.url && changeInfo.status === 'complete') {
            const { bitbucketUrl } = await chrome.storage.sync.get(['bitbucketUrl']);
            if (isBitbucketUrl(tab.url, bitbucketUrl)) {
                const hasPermission = await chrome.permissions.contains({ origins: [`${bitbucketUrl}/*`] });
                if (hasPermission) {
                    await injectContentScript(tabId);
                } else {
                    console.warn(`[TabManager] Permission missing for ${bitbucketUrl}. Script not injected.`);
                }
            }
        }
    });
    console.log('[TabManager] Tab listener initialized.');
}