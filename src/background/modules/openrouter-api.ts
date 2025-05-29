function getSystemPrompt(): string {
    try {
        return chrome.i18n.getMessage("aiSystemPrompt");
    } catch (e) {
        // Fallback if message key is not found (e.g., during development before locales are loaded)
        console.warn("Failed to get localized system prompt, using default English.", e);
        return "You are a helpful assistant that explains code snippets clearly and concisely.";
    }
}

function getUserPrompt(codeSnippet: string): string {
    try {
        // The $code$ placeholder in messages.json will be replaced by codeSnippet
        return chrome.i18n.getMessage("aiUserPromptInstruction", [codeSnippet]);
    } catch (e) {
        console.warn("Failed to get localized user prompt, using default English.", e);
        return `Please explain the following code snippet in English:\n\n\`\`\`\n${codeSnippet}\n\`\`\`\n\nYour explanation must be in English.`;
    }
}

export async function fetchCodeExplanation(
    code: string,
    apiKey: string,
    modelName: string 
): Promise<{ success: boolean; data?: string; error?: string }> {

    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

    // Gets localized prompts
    const systemPrompt = getSystemPrompt();
    const userPrompt = getUserPrompt(code);

    const requestBody = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
    };
    console.log('[API] Request body with localized prompts:', JSON.stringify(requestBody, null, 2));


    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://bitbucket-llm-assistant.your-domain.com',
                'X-Title': 'Bitbucket LLM Assistant',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('[API] Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('[API] OpenRouter API Error:', errorData);
            return { success: false, error: errorData?.error?.message || `API request failed with status ${response.status}` };
        }

        const data = await response.json();
        console.log('[API] OpenRouter API Success Response Data:', JSON.stringify(data, null, 2)); // 전체 응답 데이터 로깅
        const explanation = data?.choices?.[0]?.message?.content;

        if (explanation) {
            console.log('[API] Explanation extracted.');
            return { success: true, data: explanation };
        } else {
            console.error('[API] OpenRouter API - No explanation found in choices:', data);
            return { success: false, error: chrome.i18n.getMessage("errorEmptyResponse") || "API response did not contain an explanation." };
        }

    } catch (error) {
         console.error('[API] Error calling OpenRouter API (fetch catch):', error);
        return { success: false, error: chrome.i18n.getMessage("errorExplanationFailed", [(error as Error).message || "Unknown API call error"]) || `API call failed: ${(error as Error).message}` };
    }
}