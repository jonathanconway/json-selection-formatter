const output = document.getElementById('output');
const status = document.getElementById('status');

// Parse JSON, unwrapping any layers of string-encoded or backslash-escaped JSON.
function parse(text) {
  const s = text.trim();
  const unwrap = (v) => {
    while (typeof v === 'string') v = JSON.parse(v);
    return v;
  };
  try {
    return unwrap(JSON.parse(s));
  } catch (e) {
    try {
      return unwrap(JSON.parse('"' + s.replace(/^"|"$/g, '') + '"'));
    } catch {
      throw e;
    }
  }
}

const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function highlight(json) {
  return escapeHtml(json).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|(true|false|null)|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (m, str, colon, kw) => {
      const cls = str ? (colon ? 'key' : 'str') : kw ? 'kw' : 'num';
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

async function main() {
  const id = location.hash.slice(1);
  const text = (await chrome.storage.session.get(id))[id];
  if (text == null) {
    output.innerHTML = '<span class="err">Selection not found (it is cleared when the browser restarts).</span>';
    return;
  }
  let formatted;
  try {
    formatted = JSON.stringify(parse(text), null, 2);
  } catch (e) {
    output.innerHTML = `<span class="err">Not valid JSON: ${escapeHtml(e.message)}</span>\n\n${escapeHtml(text)}`;
    return;
  }
  output.innerHTML = highlight(formatted);
  document.getElementById('copy').onclick = async () => {
    await navigator.clipboard.writeText(formatted);
    status.textContent = 'Copied';
    setTimeout(() => (status.textContent = ''), 1500);
  };
}

main();
