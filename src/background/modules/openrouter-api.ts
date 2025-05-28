export async function fetchCodeExplanation(
    code: string,
    apiKey: string,
    modelName: string 
): Promise<{ success: boolean; data?: string; error?: string }> {

    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

    const requestBody = {
        model: modelName,
        messages: [
            { role: "system", content: "You are a helpful assistant that explains code snippets clearly and concisely." },
            { role: "user", content: `Please explain the following code snippet:\n\n\`\`\`\n${code}\n\`\`\`` }
        ],
    };

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
            return { success: false, error: "API 응답에서 설명을 찾을 수 없습니다." };
        }

    } catch (error) {
         console.error('[API] Error calling OpenRouter API (fetch catch):', error);
        return { success: false, error: (error as Error).message || "API 호출 중 알 수 없는 오류 발생." };
    }
}