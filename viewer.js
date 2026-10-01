const outputElement = document.getElementById('output');
const statusElement = document.getElementById('status');
const copyButton = document.getElementById('copy');

const JSON_INDENT_SPACES = 2;
const COPIED_STATUS_DURATION_MS = 1500;

// Matches the JSON tokens we colour. Strings are matched first, so keywords and
// numbers that appear inside a string are never coloured separately.
const JSON_TOKEN_PATTERN = new RegExp(
  [
    String.raw`("(?:\\.|[^"\\])*")(\s*:)?`, // string, plus a trailing colon if it is a key
    String.raw`(true|false|null)`, // keyword
    String.raw`-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?`, // number
  ].join('|'),
  'g'
);

async function main() {
  const selectedText = await loadSelectedText();
  if (selectedText === undefined) {
    showError({ message: 'Selection not found (it is cleared when the browser restarts).' });
    return;
  }

  const { formattedJson, error } = formatJson(selectedText);
  if (error) {
    showError({ message: `Not valid JSON: ${error.message}`, originalText: selectedText });
    return;
  }

  showFormattedJson(formattedJson);
  enableCopyButton(formattedJson);
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

// The background script stores the selection under an id passed in the URL hash.
async function loadSelectedText() {
  const selectionId = location.hash.slice(1);
  const storedItems = await chrome.storage.session.get(selectionId);
  return storedItems[selectionId];
}

// ---------------------------------------------------------------------------
// Parsing and formatting
// ---------------------------------------------------------------------------

function formatJson(text) {
  try {
    const parsedValue = parseJson(text);
    return { formattedJson: JSON.stringify(parsedValue, null, JSON_INDENT_SPACES) };
  } catch (error) {
    return { error };
  }
}

// Parses JSON text, also accepting JSON that has been string-encoded
// (e.g. `"{\"a\":1}"`) or backslash-escaped without quotes (e.g. `{\"a\":1}`).
function parseJson(text) {
  const trimmedText = text.trim();

  try {
    return parseNestedJson(trimmedText);
  } catch (originalError) {
    try {
      return parseNestedJson(unescapeJsonString(trimmedText));
    } catch {
      // Report the first error, as it describes the text the user actually selected.
      throw originalError;
    }
  }
}

// Keeps parsing while the result is a string, to unwrap JSON encoded inside JSON strings.
function parseNestedJson(text) {
  let value = JSON.parse(text);
  while (typeof value === 'string') {
    value = JSON.parse(value);
  }
  return value;
}

// Turns `{\"a\":1}` into `{"a":1}` by parsing it as the contents of a JSON string.
function unescapeJsonString(text) {
  const textWithoutOuterQuotes = text.replace(/^"|"$/g, '');
  return JSON.parse(`"${textWithoutOuterQuotes}"`);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function showFormattedJson(formattedJson) {
  outputElement.innerHTML = highlightJson(formattedJson);
}

function showError({ message, originalText = '' }) {
  const errorHtml = `<span class="err">${escapeHtml(message)}</span>`;
  const originalTextHtml = originalText ? `\n\n${escapeHtml(originalText)}` : '';
  outputElement.innerHTML = errorHtml + originalTextHtml;
}

// Wraps each token in a <span> whose class sets its colour (see viewer.css).
function highlightJson(formattedJson) {
  const safeJson = escapeHtml(formattedJson);

  return safeJson.replace(JSON_TOKEN_PATTERN, (token, stringLiteral, keyColon, keyword) => {
    const tokenClass = getTokenClass({ stringLiteral, keyColon, keyword });
    return `<span class="${tokenClass}">${token}</span>`;
  });
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

// Only `&` and `<` need escaping, as the text is only ever placed inside an element.
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

// ---------------------------------------------------------------------------
// Copying
// ---------------------------------------------------------------------------

function enableCopyButton(formattedJson) {
  copyButton.onclick = async () => {
    await navigator.clipboard.writeText(formattedJson);
    showTemporaryStatus('Copied');
  };
}

function showTemporaryStatus(message) {
  statusElement.textContent = message;
  setTimeout(() => {
    statusElement.textContent = '';
  }, COPIED_STATUS_DURATION_MS);
}

main();
