import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './content.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';


// --- Debounce Utility Function ---
// Delays function execution until after a certain time has passed without new calls.
function debounce<F extends (...args: any[]) => void>(func: F, waitFor: number) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), waitFor);
    };
}

// --- Execution Guard ---
// Prevents the script from running multiple times on the same page.
// @ts-ignore // To add a custom property to window without TS error
if (window.bitbucketLLMAssistantLoaded) {
    console.log('[Content Script] Already initialized, skipping.');
} else {
    // @ts-ignore
    window.bitbucketLLMAssistantLoaded = true;
    console.log('[Content Script] Initializing...');

    // --- Explain Button Component ---
    // Renders the "Explain Code" button.
    interface ExplainButtonProps {
        position: { top: number; left: number };
        onClick: () => void;
    }

    const ExplainButton: React.FC<ExplainButtonProps> = ({ position, onClick }) => {
        return (
            <button
                className="explain-button" // Styled via content.css
                style={{
                    position: 'absolute',
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                }}
                onClick={onClick}
            >
                {chrome.i18n.getMessage("explainButtonText")}
            </button>
        );
    };

    // --- Explanation Box Component ---
    // Renders the box displaying the explanation, loading state, or errors.
    interface ExplanationBoxProps {
        isLoading: boolean;
        explanation: string | null;
        error: string | null;
        onClose: () => void;
    }

    const ExplanationBox: React.FC<ExplanationBoxProps> = ({ isLoading, explanation, error, onClose }) => {
        if (!isLoading && !explanation && !error) {
            return null; // Render nothing if there's nothing to show
        }

        // Function to create sanitized markup from markdown string
        const createSanitizedMarkup = (markdownText: string | null) => {
            if (!markdownText) return { __html: '' };
            const rawHtml = marked.parse(markdownText, { gfm: true, breaks: true }) as string; //
            const sanitizedHtml = DOMPurify.sanitize(rawHtml);
            return { __html: sanitizedHtml };
        };

        return (
            <div className="explanation-box">
                <button className="close-button" onClick={onClose}>×</button>
                <h4>{chrome.i18n.getMessage("explanationBoxTitle")}</h4>
                <hr />
                {isLoading && <p>{chrome.i18n.getMessage("loadingMessage")}</p>}
                {error && <p className="error-text">{error}</p>}
                {explanation && (
                    <div
                        className="markdown-body"
                        dangerouslySetInnerHTML={createSanitizedMarkup(explanation)}
                    />
                )}
            </div>
        );
    };

    // --- Main App Component ---
    // Manages the state and logic for the content script UI.
    const ContentApp: React.FC = () => {
        const [selectedText, setSelectedText] = useState<string>('');
        const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
        const [explanation, setExplanation] = useState<string | null>(null);
        const [isLoading, setIsLoading] = useState<boolean>(false);
        const [error, setError] = useState<string | null>(null);
        const lastMouseUpTime = useRef<number>(0); // Ref to store the timestamp of the last mouseup event

        // Closes the explanation box.
        const closeExplanationBox = useCallback(() => {
            setIsLoading(false);
            setExplanation(null);
            setError(null);
        }, []);

        // Processes the current text selection and sets the button position.
        const processSelection = useCallback((mouseEvent?: MouseEvent) => {
            if (isLoading || explanation || error) { // Don't show button if explanation box is active
                setButtonPosition(null);
                return;
            }

            const selection = window.getSelection();
            const text = selection?.toString().trim() || '';

            if (text.length > 10) { // Only for selections longer than 10 characters
                setSelectedText(text);
                if (mouseEvent) { // Position near mouse if triggered by mouseup
                    setButtonPosition({
                        top: mouseEvent.pageY + 15, // Offset from mouse pointer
                        left: mouseEvent.pageX + 5,
                    });
                } else if (selection && selection.rangeCount > 0) { // Position based on selection rect for other cases (e.g., Ctrl+A)
                    let range = selection.getRangeAt(0);
                    if (!range) {
                        setButtonPosition(null);
                        setSelectedText('');
                        return;
                    }
                    let rect = range.getBoundingClientRect();

                    // If initial rect is invalid (e.g. for full document selection), try anchor node's rect
                    if ((rect.width === 0 && rect.height === 0) && selection.anchorNode && selection.anchorNode.nodeType === Node.ELEMENT_NODE) {
                        console.log('[Content Script] Range rect invalid, trying anchorNode rect.');
                        rect = (selection.anchorNode as Element).getBoundingClientRect();
                    }
                    
                    if (rect.width > 0 || rect.height > 0) {
                        let topPos = window.scrollY + rect.top + 5;
                        let leftPos = window.scrollX + rect.left + 5;

                        // Heuristic for full page selection (e.g., Ctrl+A on body)
                        if ((selection.anchorNode === document.body || selection.anchorNode === document.documentElement) &&
                            (selection.focusNode === document.body || selection.focusNode === document.documentElement) &&
                            rect.top < 50 && rect.left < 50 ) { // If selection starts near top-left of viewport
                            console.log('[Content Script] Full page selection detected, positioning button near viewport top-left.');
                            topPos = window.scrollY + 20;  // 20px from viewport top
                            leftPos = window.scrollX + 20; // 20px from viewport left
                        }
                        setButtonPosition({ top: topPos, left: leftPos });
                    } else {
                        console.warn('[Content Script] Invalid rect for selection, cannot position button.');
                        setButtonPosition(null);
                        setSelectedText('');
                    }
                } else {
                    setButtonPosition(null); // No valid range or mouse event
                }
            } else {
                setSelectedText(''); // Clear selected text if too short
                setButtonPosition(null); // Selection too short or cleared
            }
        }, [isLoading, explanation, error]);

        // Handles mouseup events, typically after a drag selection.
        const handleMouseUp = useCallback((event: MouseEvent) => {
            lastMouseUpTime.current = Date.now(); // Record the time of mouseup
            // Use a short timeout to ensure selection is finalized in the browser.
            setTimeout(() => processSelection(event), 0);
        }, [processSelection]);

        // Debounced version of processSelection for the 'selectionchange' event.
        const debouncedProcessSelectionForChange = useCallback(debounce(() => {
            // Only process if mouseup didn't happen very recently.
            // This helps prevent this from overriding a position set by a drag selection.
            if (Date.now() - lastMouseUpTime.current < 150) { // 150ms threshold
                // console.log('[Content Script] selectionchange shortly after mouseup, ignoring for now.');
                return;
            }
            // console.log('[Content Script] selectionchange processing (not immediately after mouseup)');
            processSelection(); // No mouseEvent, for Ctrl+A, keyboard nav, etc.
        }, 250), [processSelection]);

        // Handles general selection changes (e.g., Ctrl+A, keyboard navigation).
        const handleSelectionChange = useCallback(() => {
            debouncedProcessSelectionForChange();
        }, [debouncedProcessSelectionForChange]);

        // Hides the button if a click occurs outside relevant UI elements or selection is lost.
        const handleDocumentClick = useCallback((event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest('.explain-button') || target.closest('.explanation-box')) {
                return; // Click on button or box, do nothing
            }

            // If clicked outside, and no significant text is currently selected, hide the button.
            // A small timeout can help ensure the selection state is updated after the click.
            setTimeout(() => {
                if (!isLoading && !explanation && !error) { // Only hide if not loading/showing explanation
                    const currentSelection = window.getSelection()?.toString().trim() || '';
                    if (currentSelection.length <= 10) {
                        setButtonPosition(null);
                        setSelectedText(''); // Also clear selected text if button is hidden
                    }
                }
            }, 50); // Slightly increased timeout to ensure selection state is stable
        }, [isLoading, explanation, error]);

        // Handles the click on the "Explain Code" button.
        const handleExplainClick = () => {
            if (!selectedText) return;

            console.log('[Content Script] Requesting explanation for:', selectedText.substring(0,100) + "...");
            setIsLoading(true);
            setButtonPosition(null); // Hide button after click
            setError(null);
            setExplanation(null);

            chrome.runtime.sendMessage(
                { type: 'EXPLAIN_CODE', code: selectedText },
                (response) => { // Response is { success: boolean, data?: string, error?: string }
                    setIsLoading(false);
                    if (chrome.runtime.lastError) {
                        setError(chrome.i18n.getMessage("errorCommFailed"));
                    } else if (response && response.success) {
                        setExplanation(response.data || null);
                        if (response.data === undefined || response.data === null || response.data.trim() === "") {
                            setError(chrome.i18n.getMessage("errorEmptyResponse"));
                        }
                    } else if (response) {
                        setError(chrome.i18n.getMessage("errorExplanationFailed", [response.error || 'Unknown error']));
                    } else {
                        setError(chrome.i18n.getMessage("errorNoResponse"));
                    }
                }
            );
        };

        // Sets up and tears down global event listeners.
        useEffect(() => {
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('selectionchange', handleSelectionChange);
            document.addEventListener('click', handleDocumentClick, true); // Use capture phase for document click
            return () => {
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('selectionchange', handleSelectionChange);
                document.removeEventListener('click', handleDocumentClick, true);
            };
        }, [handleMouseUp, handleSelectionChange, handleDocumentClick]);

        return (
            <>
                {buttonPosition && <ExplainButton position={buttonPosition} onClick={handleExplainClick} />}
                <ExplanationBox
                    isLoading={isLoading}
                    explanation={explanation}
                    error={error}
                    onClose={closeExplanationBox}
                />
            </>
        );
    };

    // --- Renders the React App into the DOM ---
    // Checks if a root element already exists to avoid re-creating it if HMR or other reloads occur.
    let rootElement = document.getElementById('bitbucket-llm-assistant-root');
    if (!rootElement) {
        rootElement = document.createElement('div');
        rootElement.id = 'bitbucket-llm-assistant-root';
        document.body.appendChild(rootElement);
    }

    // Ensure we only render once into the root, especially with HMR.
    // @ts-ignore // Accessing a custom property on the element
    if (!rootElement._reactRootContainer) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <ContentApp />
            </React.StrictMode>
        );
    } else {
        console.log('[Content Script] React root already exists. Skipping re-render of root.');
    }

} // --- End of Execution Guard ---
