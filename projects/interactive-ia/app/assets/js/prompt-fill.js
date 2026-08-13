/* ============================================
   PROMPT-FILL
   Generic, reusable across every prompt instance.
   Each .js-prompt-fill block supplies its own
   template + fields in markup; this module just
   reads {{TOKEN}} placeholders out of a hidden
   <script type="text/plain"> template, replaces
   them live as the reader types, and copies the
   result to the clipboard. No network calls.

   What the reader types is saved to localStorage
   per prompt, so navigating away does not discard
   a half-filled prompt.
   ============================================ */

const PromptFill = {

  STORE_PREFIX: 'ia-course:prompt:',

  init() {
    document.querySelectorAll('.js-prompt-fill').forEach((block, i) => this.bind(block, i));
  },

  // Prefer the enclosing section's id (every prompt section has one, and it is
  // the same id the prompt library links to). Fall back to page path + index so
  // a prompt without an id still gets a stable, unique key.
  storeKey(block, index, token) {
    const section = block.closest('.prompt-fill');
    const scope = (section && section.id)
      ? section.id
      : window.location.pathname + ':' + index;
    return `${this.STORE_PREFIX}${scope}:${token}`;
  },

  read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },

  write(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (e) {
      // Storage unavailable or full, the prompt still works, it just
      // will not be remembered.
    }
  },

  bind(block, index) {
    const templateEl  = block.querySelector('.js-prompt-template');
    const preview     = block.querySelector('.js-prompt-preview');
    const copyBtn     = block.querySelector('.js-prompt-copy');
    const copiedLabel = block.querySelector('.js-prompt-copied');
    const inputs      = block.querySelectorAll('.js-prompt-input');

    if (!templateEl || !preview) return;

    const rawTemplate = templateEl.textContent.trim();

    // Only the tokens this block actually declares count as "not yet filled in".
    // Pattern-matching every [BRACKETED] string also caught the RICE headers the
    // course is teaching ([ROLE], [INSTRUCTIONS], [OUTPUT FORMAT]), which made
    // the scaffolding look like something the reader had forgotten to complete.
    const unfilledLabels = new Set();

    const render = () => {
      let text = rawTemplate;
      unfilledLabels.clear();

      inputs.forEach((input) => {
        const token = input.dataset.token;
        if (!token) return;
        const value = input.value.trim();
        const label = input.dataset.placeholder || token;
        if (!value) unfilledLabels.add(label);
        text = text.split(`{{${token}}}`).join(value.length ? value : `[${label}]`);
      });

      const escapeHtml = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      if (unfilledLabels.size === 0) {
        preview.innerHTML = escapeHtml(text);
        return;
      }

      // Split on exactly the placeholder strings we just inserted.
      const alternatives = [...unfilledLabels]
        .map((l) => `\\[${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`)
        .join('|');

      preview.innerHTML = text
        .split(new RegExp(`(${alternatives})`, 'g'))
        .map((chunk) => {
          const bare = chunk.slice(1, -1);
          if (chunk.startsWith('[') && chunk.endsWith(']') && unfilledLabels.has(bare)) {
            return `<span class="is-unfilled">${escapeHtml(chunk)}</span>`;
          }
          return escapeHtml(chunk);
        })
        .join('');
    };

    // Restore anything the reader typed previously, then keep it in sync.
    inputs.forEach((input) => {
      const token = input.dataset.token;
      if (!token) return;
      const key = this.storeKey(block, index, token);

      const saved = this.read(key);
      if (saved !== null && !input.value) input.value = saved;

      const persist = () => this.write(key, input.value.trim());
      input.addEventListener('input', () => { render(); persist(); });
      input.addEventListener('change', () => { render(); persist(); });
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copy(block, preview, copyBtn, copiedLabel);
      });
    }

    render();
  },

  copy(block, preview, copyBtn, copiedLabel) {
    const text = preview.textContent;

    const succeed = () => {
      this.clearError(block);
      if (!copiedLabel) return;
      copyBtn.style.display = 'none';
      copiedLabel.style.display = 'inline-flex';
      setTimeout(() => {
        copiedLabel.style.display = 'none';
        copyBtn.style.display = 'inline-flex';
      }, 2000);
    };

    // The async clipboard API needs a secure context. Opened over file://
    // it is undefined, which is exactly the offline case this course supports,
    // so fall back rather than throwing into a void.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(succeed, () => {
        if (this.copyFallback(text)) succeed();
        else this.showError(block, preview);
      });
      return;
    }

    if (this.copyFallback(text)) succeed();
    else this.showError(block, preview);
  },

  copyFallback(text) {
    try {
      const scratch = document.createElement('textarea');
      scratch.value = text;
      scratch.setAttribute('readonly', '');
      scratch.setAttribute('aria-hidden', 'true');
      scratch.style.position = 'fixed';
      scratch.style.top = '-1000px';
      scratch.style.opacity = '0';
      document.body.appendChild(scratch);
      scratch.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(scratch);
      return ok;
    } catch (e) {
      return false;
    }
  },

  // Last resort: select the prompt so the reader can copy it themselves, and
  // say so, instead of leaving a button that appears to do nothing.
  showError(block, preview) {
    let note = block.querySelector('.js-prompt-copy-error');
    if (!note) {
      note = document.createElement('p');
      note.className = 'prompt-fill__copy-error js-prompt-copy-error';
      note.setAttribute('role', 'status');
      block.querySelector('.prompt-fill__output').appendChild(note);
    }
    note.textContent = 'This browser blocked the copy. The prompt is selected: press Ctrl+C (or Cmd+C) to copy it.';

    try {
      const range = document.createRange();
      range.selectNodeContents(preview);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      // Selection unavailable, the message above still tells the reader what to do.
    }
  },

  clearError(block) {
    const note = block.querySelector('.js-prompt-copy-error');
    if (note) note.remove();
  },

};

document.addEventListener('DOMContentLoaded', () => {
  PromptFill.init();
});
