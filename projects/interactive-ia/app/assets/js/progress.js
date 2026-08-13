/* ============================================
   IA COURSE: PROGRESS & EXERCISE JS
   Handles: localStorage state, progress map
   updates, exercise commit behavior,
   feedback reveal, option selection UI
   ============================================ */

'use strict';

/* ============================================
   PROGRESS: localStorage interface
   ============================================ */

const Progress = {

  key: function(chunkId) {
    return 'ia-course:' + chunkId;
  },

  isComplete: function(chunkId) {
    try {
      return localStorage.getItem(this.key(chunkId)) === 'complete';
    } catch (e) {
      return false;
    }
  },

  markComplete: function(chunkId) {
    try {
      localStorage.setItem(this.key(chunkId), 'complete');
    } catch (e) {
      // localStorage unavailable: fail silently, course still usable
    }
  },

  clear: function(chunkId) {
    try {
      localStorage.removeItem(this.key(chunkId));
    } catch (e) {
      // no-op
    }
  },

  // Removes every course key, including saved prompt-fill field values.
  // Returns the number of keys removed so the caller can confirm to the reader.
  clearAll: function() {
    try {
      var doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ia-course:') === 0) doomed.push(k);
      }
      doomed.forEach(function(k) { localStorage.removeItem(k); });
      return doomed.length;
    } catch (e) {
      return 0;
    }
  },

  getChapterProgress: function(chunkIds) {
    var completed = chunkIds.filter(id => this.isComplete(id));
    return {
      total: chunkIds.length,
      completed: completed.length
    };
  }

};


/* ============================================
   EXERCISE: commit and feedback reveal
   ============================================ */

const Exercise = {

  init: function() {
    var form = document.querySelector('.js-exercise-form');
    if (!form) return;

    var chunkId   = form.dataset.chunkId;
    var commitBtn = form.querySelector('.js-commit');
    var feedback  = document.querySelector('.js-feedback');
    var completeEl = form.querySelector('.js-complete');

    var retryBtn = this.buildRetryButton(form, chunkId, commitBtn, feedback, completeEl);

    // If already complete on load, restore committed state
    if (Progress.isComplete(chunkId)) {
      this.restoreCommitted(form, commitBtn, feedback, completeEl, retryBtn);
      return;
    }

    // Option selection, visual feedback on choose
    this.initOptions(form, commitBtn);

    // Commit
    if (commitBtn) {
      commitBtn.addEventListener('click', function() {
        Exercise.handleCommit(form, chunkId, commitBtn, feedback, completeEl, retryBtn);
      });
    }
  },

  // Built in JS rather than markup because the whole commit/reveal cycle is
  // JS-only: with scripting off there is nothing to reset.
  buildRetryButton: function(form, chunkId, commitBtn, feedback, completeEl) {
    if (!completeEl) return null;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'exercise__retry js-retry';
    btn.textContent = 'Try again';
    btn.style.display = 'none';
    btn.setAttribute('aria-label', 'Clear your answer and attempt this exercise again');
    completeEl.insertAdjacentElement('afterend', btn);

    btn.addEventListener('click', function() {
      Exercise.handleRetry(form, chunkId, commitBtn, feedback, completeEl, btn);
    });

    return btn;
  },

  initOptions: function(form, commitBtn) {
    // Bind once. Retry used to call this again and stack handlers; the early
    // return after restoreCommitted is why a first-time bind still has to run
    // from handleRetry for chunks that loaded already complete.
    if (form.dataset.optionsBound === '1') {
      this.syncSelectedClasses(form);
      this.updateCommitState(form, commitBtn);
      return;
    }
    form.dataset.optionsBound = '1';

    // Let the browser own checking/unchecking. A previous click handler on the
    // label fought native label behavior (and stopPropagation on the input
    // meant clicking the radio circle never enabled Commit).
    form.querySelectorAll('.js-option input').forEach(function(input) {
      input.addEventListener('change', function() {
        Exercise.syncSelectedClasses(form);
        Exercise.updateCommitState(form, commitBtn);
      });
    });

    form.querySelectorAll('textarea').forEach(function(ta) {
      ta.addEventListener('input', function() {
        Exercise.updateCommitState(form, commitBtn);
      });
    });

    this.syncSelectedClasses(form);
    this.updateCommitState(form, commitBtn);
  },

  syncSelectedClasses: function(form) {
    form.querySelectorAll('.js-option').forEach(function(option) {
      var input = option.querySelector('input');
      option.classList.toggle('is-selected', !!(input && input.checked));
    });
  },

  updateCommitState: function(form, commitBtn) {
    if (!commitBtn) return;
    var ready = this.isFormReady(form);
    commitBtn.disabled = !ready;
  },

  isFormReady: function(form) {
    // Check all radio groups have a selection
    var radioGroups = {};
    form.querySelectorAll('input[type="radio"]').forEach(function(input) {
      if (!radioGroups[input.name]) radioGroups[input.name] = false;
      if (input.checked) radioGroups[input.name] = true;
    });
    for (var group in radioGroups) {
      if (!radioGroups[group]) return false;
    }

    // Check all required checkboxes (if any marked required)
    var requiredCheckboxGroups = {};
    form.querySelectorAll('input[type="checkbox"][data-required-group]').forEach(function(input) {
      var g = input.dataset.requiredGroup;
      if (!requiredCheckboxGroups[g]) requiredCheckboxGroups[g] = false;
      if (input.checked) requiredCheckboxGroups[g] = true;
    });
    for (var cg in requiredCheckboxGroups) {
      if (!requiredCheckboxGroups[cg]) return false;
    }

    // Check all required textareas have content
    var textareas = form.querySelectorAll('textarea[required]');
    for (var i = 0; i < textareas.length; i++) {
      if (textareas[i].value.trim().length < 5) return false;
    }

    return true;
  },

  handleCommit: function(form, chunkId, commitBtn, feedback, completeEl, retryBtn) {
    // Mark complete in storage
    Progress.markComplete(chunkId);

    // Lock the form
    this.lockForm(form);

    // Hide commit, show complete indicator and the way back out
    if (commitBtn) commitBtn.style.display = 'none';
    if (completeEl) completeEl.style.display = 'inline-flex';
    if (retryBtn) retryBtn.style.display = 'inline-flex';

    // Reveal feedback. Dropping `hidden` is what actually exposes the answers:
    // until now they were absent from the accessibility tree and from find-in-page.
    if (feedback) {
      feedback.hidden = false;
      // Two frames so the un-hidden layout settles before the transition starts
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          feedback.classList.add('is-revealed');
          setTimeout(function() {
            feedback.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Move focus into the revealed answers so a keyboard or screen
            // reader user lands on them instead of having to hunt.
            feedback.focus({ preventScroll: true });
          }, 100);
        });
      });
    }

    // Update any progress indicators on this page
    ProgressUI.updateChunkStatus(chunkId);
  },

  handleRetry: function(form, chunkId, commitBtn, feedback, completeEl, retryBtn) {
    Progress.clear(chunkId);

    // Re-hide the answers before anything else, so they are never briefly
    // available in an un-committed state.
    if (feedback) {
      feedback.classList.remove('is-revealed');
      feedback.style.transition = '';
      feedback.hidden = true;
    }

    this.unlockForm(form);
    form.reset();
    form.querySelectorAll('.js-option').forEach(function(option) {
      option.classList.remove('is-selected');
    });

    if (completeEl) completeEl.style.display = 'none';
    if (retryBtn) retryBtn.style.display = 'none';
    if (commitBtn) {
      commitBtn.style.display = 'inline-flex';
      commitBtn.disabled = true;
    }

    // Rebind option handlers, which init() skipped for an already-complete chunk
    this.initOptions(form, commitBtn);

    ProgressUI.clearChunkStatus(chunkId);

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  lockForm: function(form) {
    form.querySelectorAll('input').forEach(function(input) {
      input.disabled = true;
    });
    form.querySelectorAll('textarea').forEach(function(ta) {
      ta.disabled = true;
    });
    form.querySelectorAll('.js-option').forEach(function(option) {
      option.style.cursor = 'default';
      option.style.pointerEvents = 'none';
    });
  },

  unlockForm: function(form) {
    form.querySelectorAll('input').forEach(function(input) {
      input.disabled = false;
    });
    form.querySelectorAll('textarea').forEach(function(ta) {
      ta.disabled = false;
    });
    form.querySelectorAll('.js-option').forEach(function(option) {
      option.style.cursor = '';
      option.style.pointerEvents = '';
    });
  },

  restoreCommitted: function(form, commitBtn, feedback, completeEl, retryBtn) {
    this.lockForm(form);
    if (commitBtn) commitBtn.style.display = 'none';
    if (completeEl) completeEl.style.display = 'inline-flex';
    if (retryBtn) retryBtn.style.display = 'inline-flex';
    if (feedback) {
      // No transition on restore: just show immediately
      feedback.style.transition = 'none';
      feedback.hidden = false;
      feedback.classList.add('is-revealed');
    }
  }

};


/* ============================================
   PROGRESS UI: updates DOM indicators
   ============================================ */

const ProgressUI = {

  CHECK_SVG: '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  // The dot carries the only indication of completion, so its accessible name
  // has to move with its visual state, otherwise assistive tech keeps
  // reporting "Not yet complete" for finished chunks.
  paintDot: function(dot, complete) {
    dot.classList.toggle('is-complete', complete);
    dot.innerHTML = complete ? this.CHECK_SVG : '';
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', complete ? 'Complete' : 'Not yet complete');
  },

  // Update the completion dot for a specific chunk
  // Used on chapter pages
  updateChunkStatus: function(chunkId) {
    var dot = document.querySelector('[data-chunk-status="' + chunkId + '"]');
    if (dot) this.paintDot(dot, true);
  },

  clearChunkStatus: function(chunkId) {
    var dot = document.querySelector('[data-chunk-status="' + chunkId + '"]');
    if (dot) this.paintDot(dot, false);
  },

  // Render progress on course home chapter cards
  // Each card has data-chunk-ids="id1,id2,id3"
  initHomePage: function() {
    var cards = document.querySelectorAll('.js-chapter-card');
    var totalAll = 0;
    var doneAll  = 0;

    cards.forEach(function(card) {
      var ids = (card.dataset.chunkIds || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!ids.length) return;

      var progress = Progress.getChapterProgress(ids);
      totalAll += progress.total;
      doneAll  += progress.completed;

      var fraction = card.querySelector('.js-fraction');
      var fill     = card.querySelector('.js-bar-fill');

      if (fraction) {
        fraction.textContent = progress.completed + ' of ' + progress.total + ' complete';
      }
      if (fill) {
        var pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
        fill.style.width = pct + '%';
      }
    });

    this.renderOverall(doneAll, totalAll);
  },

  renderOverall: function(done, total) {
    var el = document.querySelector('.js-overall-progress');
    if (!el || !total) return;
    var pct = Math.round((done / total) * 100);
    el.textContent = done === 0
      ? total + ' chunks across 12 chapters. Nothing completed yet.'
      : done + ' of ' + total + ' chunks complete (' + pct + '%).';
  },

  // Render completion dots on chapter pages
  initChapterPage: function() {
    var self = this;
    document.querySelectorAll('[data-chunk-status]').forEach(function(dot) {
      self.paintDot(dot, Progress.isComplete(dot.dataset.chunkStatus));
    });
  },

  initResetControl: function() {
    var btn = document.querySelector('.js-progress-reset');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var ok = window.confirm(
        'Reset all progress?\n\nThis clears every completed chunk and any prompt fields you have filled in, in this browser only. It cannot be undone.'
      );
      if (!ok) return;

      Progress.clearAll();
      ProgressUI.initHomePage();

      var done = document.querySelector('.js-progress-reset-done');
      if (done) {
        done.textContent = 'Progress cleared.';
        done.style.display = 'block';
      }
    });
  }

};


/* ============================================
   INIT on DOM ready
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Exercise pages
  Exercise.init();

  // Course home
  if (document.querySelector('.js-chapter-card')) {
    ProgressUI.initHomePage();
    ProgressUI.initResetControl();
  }

  // Chapter pages
  if (document.querySelector('[data-chunk-status]')) {
    ProgressUI.initChapterPage();
  }
});
