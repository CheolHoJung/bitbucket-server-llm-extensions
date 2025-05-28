import { initializeTabListener } from './modules/tab-manager';
import { initializeMessageListener } from './modules/message-handler';

console.log('[Background] Initializing main service worker...');

initializeTabListener();
initializeMessageListener();

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installed/updated.');
});

console.log('[Background] Service worker started.');