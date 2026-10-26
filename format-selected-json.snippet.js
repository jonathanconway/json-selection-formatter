// Format Selected JSON — Chrome DevTools Snippet version.
// Select some JSON on the page, then run this snippet (Sources > Snippets, Cmd/Ctrl+Enter).
// Same parsing and highlighting as the extension's viewer.js, without any chrome.* APIs.
(() => {
  const JSON_INDENT_SPACES = 2;
  const COPIED_STATUS_DURATION_MS = 1500;

  const JSON_TOKEN_PATTERN = new RegExp(
    [
      String.raw`("(?:\\.|[^"\\])*")(\s*:)?`, // string, plus a trailing colon if it is a key
      String.raw`(true|false|null)`, // keyword
      String.raw`-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?`, // number
    ].join('|'),
    'g'
  );

  const VIEWER_CSS = `
    :root {
      --bg: #ffffff; --fg: #1f2328; --key: #0550ae; --str: #0a3069;
      --num: #116329; --kw: #8250df; --err: #cf222e; --border: #d0d7de;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1e1e1e; --fg: #d4d4d4; --key: #9cdcfe; --str: #ce9178;
        --num: #b5cea8; --kw: #569cd6; --err: #f48771; --border: #3c3c3c;
      }
    }
    body { background: var(--bg); color: var(--fg); margin: 0; font: 14px system-ui, sans-serif; }
    header { position: sticky; top: 0; background: var(--bg); border-bottom: 1px solid var(--border); padding: 8px 16px; }
    button { font: inherit; padding: 4px 12px; cursor: pointer; }
    #status { margin-left: 8px; opacity: 0.7; }
    pre { font: 13px ui-monospace, Menlo, monospace; padding: 16px; margin: 0; white-space: pre-wrap; word-break: break-word; }
    .key { color: var(--key); } .str { color: var(--str); } .num { color: var(--num); }
    .kw { color: var(--kw); } .err { color: var(--err); }
  `;

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  // window.getSelection() doesn't see text selected inside <input>/<textarea>, so check those first.
  function loadSelectedText() {
    const activeElement = document.activeElement;
    const isTextField = activeElement && /^(INPUT|TEXTAREA)$/.test(activeElement.tagName);
    if (isTextField && activeElement.selectionStart !== activeElement.selectionEnd) {
      return activeElement.value.slice(activeElement.selectionStart, activeElement.selectionEnd);
    }
    return String(window.getSelection());
  }

  // ---------------------------------------------------------------------------
  // Parsing and formatting (identical to viewer.js)
  // ---------------------------------------------------------------------------

  function formatJson(text) {
    try {
      const parsedValue = parseJson(text);
      return { formattedJson: JSON.stringify(parsedValue, null, JSON_INDENT_SPACES) };
    } catch (error) {
      return { error };
    }
  }

  function parseJson(text) {
    const trimmedText = text.trim();
    try {
      return parseNestedJson(trimmedText);
    } catch (originalError) {
      try {
        return parseNestedJson(unescapeJsonString(trimmedText));
      } catch {
        throw originalError;
      }
    }
  }

  function parseNestedJson(text) {
    let value = JSON.parse(text);
    while (typeof value === 'string') {
      value = JSON.parse(value);
    }
    return value;
  }

  function unescapeJsonString(text) {
    const textWithoutOuterQuotes = text.replace(/^"|"$/g, '');
    return JSON.parse(`"${textWithoutOuterQuotes}"`);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  // The new window inherits the page's CSP and Trusted Types policy, so this avoids
  // innerHTML and <style> tags: nodes are built directly and CSS goes in a constructed sheet.
  function openViewerWindow() {
    const viewerWindow = window.open('', '_blank');
    if (!viewerWindow) return undefined;

    const viewerDocument = viewerWindow.document;
    viewerDocument.title = 'Formatted JSON';
    const styleSheet = new viewerWindow.CSSStyleSheet();
    styleSheet.replaceSync(VIEWER_CSS);
    viewerDocument.adoptedStyleSheets = [styleSheet];

    const header = viewerDocument.createElement('header');
    const copyButton = viewerDocument.createElement('button');
    copyButton.textContent = 'Copy';
    const statusElement = viewerDocument.createElement('span');
    statusElement.id = 'status';
    header.append(copyButton, statusElement);
    const outputElement = viewerDocument.createElement('pre');
    viewerDocument.body.append(header, outputElement);

    return { viewerWindow, viewerDocument, copyButton, statusElement, outputElement };
  }

  function showFormattedJson(viewer, formattedJson) {
    viewer.outputElement.append(...highlightJson(viewer.viewerDocument, formattedJson));
  }

  function showError(viewer, { message, originalText = '' }) {
    const errorElement = viewer.viewerDocument.createElement('span');
    errorElement.className = 'err';
    errorElement.textContent = message;
    viewer.outputElement.append(errorElement, originalText ? `\n\n${originalText}` : '');
    viewer.copyButton.hidden = true;
  }

  // Splits the text into plain text nodes and coloured <span>s (see VIEWER_CSS).
  function highlightJson(viewerDocument, formattedJson) {
    const nodes = [];
    let lastIndex = 0;
    for (const match of formattedJson.matchAll(JSON_TOKEN_PATTERN)) {
      const [token, stringLiteral, keyColon, keyword] = match;
      nodes.push(formattedJson.slice(lastIndex, match.index));
      const tokenElement = viewerDocument.createElement('span');
      tokenElement.className = getTokenClass({ stringLiteral, keyColon, keyword });
      tokenElement.textContent = token;
      nodes.push(tokenElement);
      lastIndex = match.index + token.length;
    }
    nodes.push(formattedJson.slice(lastIndex));
    return nodes;
  }

  function getTokenClass({ stringLiteral, keyColon, keyword }) {
    if (stringLiteral) {
      const isObjectKey = keyColon !== undefined;
      return isObjectKey ? 'key' : 'str';
    }
    if (keyword) {
      return 'kw';
    }
    return 'num';
  }

  // ---------------------------------------------------------------------------
  // Copying
  // ---------------------------------------------------------------------------

  function enableCopyButton(viewer, formattedJson) {
    viewer.copyButton.onclick = async () => {
      try {
        await viewer.viewerWindow.navigator.clipboard.writeText(formattedJson);
      } catch {
        copyWithSelection(viewer);
      }
      showTemporaryStatus(viewer, 'Copied');
    };
  }

  // Fallback for pages whose permissions policy blocks the async clipboard API.
  function copyWithSelection(viewer) {
    const selection = viewer.viewerWindow.getSelection();
    selection.selectAllChildren(viewer.outputElement);
    viewer.viewerDocument.execCommand('copy');
    selection.removeAllRanges();
  }

  function showTemporaryStatus(viewer, message) {
    viewer.statusElement.textContent = message;
    setTimeout(() => {
      viewer.statusElement.textContent = '';
    }, COPIED_STATUS_DURATION_MS);
  }

  // ---------------------------------------------------------------------------

  const selectedText = loadSelectedText();
  if (!selectedText.trim()) {
    console.warn('Format Selected JSON: select some JSON on the page first.');
    return;
  }

  const viewer = openViewerWindow();
  if (!viewer) {
    console.warn('Format Selected JSON: the new tab was blocked. Allow pop-ups for this site and run it again.');
    return;
  }

  const { formattedJson, error } = formatJson(selectedText);
  if (error) {
    showError(viewer, { message: `Not valid JSON: ${error.message}`, originalText: selectedText });
    return;
  }

  showFormattedJson(viewer, formattedJson);
  enableCopyButton(viewer, formattedJson);
})();
