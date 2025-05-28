import { fetchCodeExplanation } from './openrouter-api';

const DEFAULT_MODEL_FOR_HANDLER = "anthropic/claude-3-haiku-20240307";

export function initializeMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXPLAIN_CODE') {
            (async () => {
                try {
                    const settings = await chrome.storage.sync.get(['openRouterKey', 'openRouterModel']);

                    const openRouterKey = settings.openRouterKey;
                    const openRouterModel = settings.openRouterModel;

                    if (!openRouterKey) {
                        console.error('[MsgHandler] OpenRouter API Key not found in storage.');
                        sendResponse({ success: false, error: chrome.i18n.getMessage("errorApiKeyMissing") });
                        return;
                    }
                    console.log('[MsgHandler] API Key found. Model from storage:', openRouterModel);

                    const modelToUse = openRouterModel || DEFAULT_MODEL_FOR_HANDLER;
                    console.log('[MsgHandler] Using model:', modelToUse);

                    const resultFromApi = await fetchCodeExplanation(message.code, openRouterKey, modelToUse);
                    console.log('[MsgHandler] Result from fetchCodeExplanation:', resultFromApi); // ★★★ API 호출 결과 로깅

                    sendResponse(resultFromApi);
                    console.log('[MsgHandler] Response sent to content script with resultFromApi.');

                } catch (e) {
                    console.error('[MsgHandler] Error within async IIFE:', e); // ★★★ IIFE 내 에러 로깅
                    sendResponse({ success: false, error: `Background script error: ${(e as Error).message}` });
                }
            })();

            return true;
        }
    });
    console.log('[MsgHandler] Message listener initialized.');
}