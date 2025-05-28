import React, { useState, useEffect } from 'react';
import './Options.css'; 

const recommendedModels = [
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek: DeepSeek V3 0324 (무료)"},
  { id: "anthropic/claude-3-haiku-20240307", name: "Claude 3 Haiku (빠름, 저렴)" },
  { id: "openai/gpt-4o", name: "OpenAI GPT-4o (고성능)" },
  { id: "openai/gpt-3.5-turbo", name: "OpenAI GPT-3.5 Turbo (균형)" },
  { id: "google/gemini-flash-1.5", name: "Google Gemini 1.5 Flash (빠름)" },
  { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B Instruct (오픈소스)" },
];

const DEFAULT_MODEL = recommendedModels[0].id;

function Options() {
  const [bitbucketUrl, setBitbucketUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Error/Status messages
    const saveSuccessMsg = chrome.i18n.getMessage("optionsStatusSuccess");
    const invalidUrlMsg = chrome.i18n.getMessage("optionsErrorInvalidUrl");
    const apiKeyRequiredMsg = chrome.i18n.getMessage("optionsErrorApiKeyRequired");
    const permDeniedMsg = chrome.i18n.getMessage("optionsErrorPermissionDenied");
    const apiKeyMissingBGMsg = chrome.i18n.getMessage("errorApiKeyMissing"); // from background messages

  useEffect(() => {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(
        ['bitbucketUrl', 'openRouterKey', 'openRouterModel'], 
        (result) => {
          setBitbucketUrl(result.bitbucketUrl || '');
          setApiKey(result.openRouterKey || '');
          setSelectedModel(result.openRouterModel || DEFAULT_MODEL);
        }
      );
    } else {
      setError("오류: Chrome API를 사용할 수 없습니다.");
    }
  }, []);


  const validateUrl = (url: string): boolean => {
    return url.trim().length > 0 && (url.startsWith('http://') || url.startsWith('https://'));
  };

  const saveSettings = () => {
    setStatus(''); 
    setError('');

    if (!validateUrl(bitbucketUrl)) {
      setError(invalidUrlMsg);
      return;
    }

    if (!apiKey.trim()) {
      setError(apiKeyRequiredMsg);
      return;
    }

    const formattedUrl = bitbucketUrl.replace(/\/+$/, '');

    if (!chrome || !chrome.permissions || !chrome.storage) {
        setError("오류: Chrome API를 사용할 수 없습니다.");
        return;
    }

    chrome.permissions.request(
      { origins: [`${formattedUrl}/*`] },
      (granted) => {
        if (granted) {
          chrome.storage.sync.set(
            {
              bitbucketUrl: formattedUrl,
              openRouterKey: apiKey,
              openRouterModel: selectedModel,
            },
            () => {
              if (chrome.runtime.lastError) {
                setError(`설정 저장 실패: ${chrome.runtime.lastError.message}`);
              } else {
                setStatus(saveSuccessMsg);
                setTimeout(() => setStatus(''), 3000);
              }
            }
          );
        } else {
          setError(permDeniedMsg);
        }
      }
    );
  };

  return (
    <div className="options-container">
      <h1>{chrome.i18n.getMessage("optionsTitle")}</h1>

      {error && <p className="message error">{error}</p>}
      {status && <p className="message status">{status}</p>}

      <div className="form-group">
        <label htmlFor="bitbucketUrlInput">{chrome.i18n.getMessage("optionsBitbucketUrlLabel")}</label>
        <input
          id="bitbucketUrlInput"
          type="url"
          value={bitbucketUrl}
          onChange={(e) => {
              setBitbucketUrl(e.target.value);
          }}
          placeholder="https://bitbucket.yourcompany.com"
          required
          size={50}
        />
        <small>Bitbucket Server의 기본 URL을 입력하세요.</small>
      </div>

      <div className="form-group">
        <label htmlFor="apiKeyInput">{chrome.i18n.getMessage("optionsApiKeyLabel")}</label>
        <input
          id="apiKeyInput"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-or-..."
          required
          size={50}
        />
        <small>OpenRouter에서 발급받은 API 키를 입력하세요. 안전하게 저장됩니다.</small>
      </div>

      <div className="form-group">
        <label htmlFor="modelSelect">{chrome.i18n.getMessage("optionsModelLabel")}</label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {recommendedModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <small>코드 설명에 사용할 AI 모델을 선택하세요. (
            <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">
                모델 목록 보기
            </a>)
        </small>
      </div>

      <button onClick={saveSettings}>{chrome.i18n.getMessage("optionsSaveButton")}</button>

      <p className="important-note">
        <strong>중요:</strong> '설정 저장' 버튼을 누르면 입력한 URL에 대한 접근 권한을 요청하는 팝업이 나타날 수 있습니다. 확장 프로그램이 정상적으로 작동하려면 **반드시 '허용'**을 클릭해야 합니다.
      </p>
    </div>
  );
}

export default Options;