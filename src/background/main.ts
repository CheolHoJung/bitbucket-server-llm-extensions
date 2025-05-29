import { initializeTabListener } from './modules/tab-manager';
import { initializeMessageListener } from './modules/message-handler';

console.log('[Background] Initializing main service worker...');

initializeTabListener();
initializeMessageListener();

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Background] Extension installed/updated.');

    // Load default values from config.json only on first install
    if (details.reason === "install") {
        try {
            const response = await fetch(chrome.runtime.getURL('config.json'));
            if (response.ok) {
                const config = await response.json();
                console.log('[Background] Loaded config.json:', config);

                // Get current stored settings
                chrome.storage.sync.get(['bitbucketUrl', 'openRouterKey', 'openRouterModel'], (storedSettings) => {
                    const newSettings: { [key: string]: any } = {};
                    let settingsChanged = false;

                    // Set default Bitbucket URL if not already set by user
                    if (config.bitbucketUrl && !storedSettings.bitbucketUrl) {
                        newSettings.bitbucketUrl = config.bitbucketUrl;
                        settingsChanged = true;
                        console.log('[Background] Setting default Bitbucket URL from config.json');
                    }

                    // Set default OpenRouter API Key if not already set by user
                    if (config.openRouterApiKey && !storedSettings.openRouterKey) {
                        newSettings.openRouterKey = config.openRouterApiKey;
                        settingsChanged = true;
                        console.log('[Background] Setting default OpenRouter API Key from config.json');
                    }

                    // Set default OpenRouter Model if not already set by user
                    if (config.openRouterModel && !storedSettings.openRouterModel) {
                        newSettings.openRouterModel = config.openRouterModel;
                        settingsChanged = true;
                        console.log('[Background] Setting default OpenRouter Model from config.json');
                    }

                    // Save to storage only if there are new default settings to apply
                    if (settingsChanged) {
                        chrome.storage.sync.set(newSettings, () => {
                            if (chrome.runtime.lastError) {
                                console.error('[Background] Error setting default values from config.json:', chrome.runtime.lastError);
                            } else {
                                console.log('[Background] Default values from config.json applied to storage.');
                            }
                        });
                    }
                });
            } else {
                console.warn('[Background] config.json not found or failed to load. Proceeding without defaults from config.json.');
            }
        } catch (error) {
            console.warn('[Background] Error fetching or parsing config.json:', error);
        }
    }

    // Optionally, open options page on install if URL is not set
    // chrome.storage.sync.get(['bitbucketUrl'], (result) => {
    //   if (!result.bitbucketUrl && details.reason === "install") {
    //     chrome.runtime.openOptionsPage();
    //   }
    // });
});

console.log('[Background] Service worker started.');