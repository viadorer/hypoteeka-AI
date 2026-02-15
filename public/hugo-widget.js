/**
 * Hugo AI Widget - Embeddable chat widget
 * 
 * Usage:
 * <script>
 *   window.HugoConfig = {
 *     apiUrl: 'https://your-domain.com',
 *     widgetKey: 'your-widget-key',
 *     primaryColor: '#E91E63',
 *     position: 'bottom-right',
 *     greeting: 'Ahoj! Jsem Hugo, váš hypoteční poradce. Jak vám mohu pomoci?',
 *     title: 'Hugo',
 *     subtitle: 'Hypoteční poradce',
 *   };
 * </script>
 * <script src="https://your-domain.com/hugo-widget.js" defer></script>
 */
(function() {
  'use strict';

  // --- Config ---
  var cfg = window.HugoConfig || {};
  var API_URL = cfg.apiUrl || '';
  var WIDGET_KEY = cfg.widgetKey || '';
  var PRIMARY = cfg.primaryColor || '#E91E63';
  var POSITION = cfg.position || 'bottom-right';
  var GREETING = cfg.greeting || 'Ahoj! Jsem Hugo, vas hypotecni poradce. Jak vam mohu pomoci?';
  var TITLE = cfg.title || 'Hugo';
  var SUBTITLE = cfg.subtitle || 'Hypotecni poradce';
  var LOGO = cfg.logoUrl || '';
  var Z_INDEX = cfg.zIndex || 9999;

  // --- State ---
  var isOpen = false;
  var messages = [];
  var sessionId = 'hw_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  var isStreaming = false;

  // --- Helpers ---
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'innerHTML') node.innerHTML = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function(c) {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  function formatPrice(n) {
    return Math.round(n).toLocaleString('cs-CZ') + ' Kc';
  }

  // --- Styles ---
  function injectStyles() {
    var posRight = POSITION.includes('right');
    var posBottom = POSITION.includes('bottom');

    var css = `
      #hugo-widget-bubble {
        position: fixed;
        ${posBottom ? 'bottom: 20px' : 'top: 20px'};
        ${posRight ? 'right: 20px' : 'left: 20px'};
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${PRIMARY};
        color: #fff;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: ${Z_INDEX};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        padding: 0;
      }
      #hugo-widget-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 24px rgba(0,0,0,0.3);
      }
      #hugo-widget-bubble svg {
        width: 28px;
        height: 28px;
        fill: #fff;
      }
      #hugo-widget-bubble.hugo-open svg.hugo-icon-chat { display: none; }
      #hugo-widget-bubble.hugo-open svg.hugo-icon-close { display: block; }
      #hugo-widget-bubble:not(.hugo-open) svg.hugo-icon-chat { display: block; }
      #hugo-widget-bubble:not(.hugo-open) svg.hugo-icon-close { display: none; }

      #hugo-widget-container {
        position: fixed;
        ${posBottom ? 'bottom: 92px' : 'top: 92px'};
        ${posRight ? 'right: 20px' : 'left: 20px'};
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 560px;
        max-height: calc(100vh - 120px);
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.15);
        z-index: ${Z_INDEX - 1};
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #1a1a1a;
      }
      #hugo-widget-container.hugo-visible {
        display: flex;
        animation: hugoSlideIn 0.25s ease-out;
      }
      @keyframes hugoSlideIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .hugo-header {
        background: ${PRIMARY};
        color: #fff;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .hugo-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
      }
      .hugo-header-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .hugo-header-avatar svg {
        width: 22px;
        height: 22px;
        fill: #fff;
      }
      .hugo-header-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .hugo-header-info p {
        margin: 0;
        font-size: 12px;
        opacity: 0.85;
      }

      .hugo-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f5f7fa;
      }
      .hugo-msg {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px;
        word-wrap: break-word;
        white-space: pre-wrap;
      }
      .hugo-msg-assistant {
        background: #fff;
        align-self: flex-start;
        border: 1px solid #e8eaed;
        border-bottom-left-radius: 4px;
      }
      .hugo-msg-user {
        background: ${PRIMARY};
        color: #fff;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }
      .hugo-msg-typing {
        background: #fff;
        align-self: flex-start;
        border: 1px solid #e8eaed;
        border-bottom-left-radius: 4px;
        color: #999;
        font-style: italic;
      }

      .hugo-input-area {
        padding: 12px 16px;
        border-top: 1px solid #e8eaed;
        display: flex;
        gap: 8px;
        background: #fff;
        flex-shrink: 0;
      }
      .hugo-input-area input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 24px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
        font-family: inherit;
        transition: border-color 0.2s;
      }
      .hugo-input-area input:focus {
        border-color: ${PRIMARY};
      }
      .hugo-input-area input::placeholder {
        color: #999;
      }
      .hugo-input-area button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: ${PRIMARY};
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.2s;
      }
      .hugo-input-area button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .hugo-input-area button svg {
        width: 18px;
        height: 18px;
        fill: #fff;
      }

      .hugo-powered {
        text-align: center;
        padding: 6px;
        font-size: 11px;
        color: #999;
        background: #fff;
        flex-shrink: 0;
      }
      .hugo-powered a {
        color: ${PRIMARY};
        text-decoration: none;
      }

      @media (max-width: 480px) {
        #hugo-widget-container {
          width: calc(100vw - 16px);
          height: calc(100vh - 80px);
          ${posBottom ? 'bottom: 72px' : 'top: 72px'};
          ${posRight ? 'right: 8px' : 'left: 8px'};
          border-radius: 12px;
        }
        #hugo-widget-bubble {
          ${posBottom ? 'bottom: 12px' : 'top: 12px'};
          ${posRight ? 'right: 12px' : 'left: 12px'};
          width: 54px;
          height: 54px;
        }
      }
    `;

    var style = document.createElement('style');
    style.id = 'hugo-widget-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- SVG Icons ---
  var ICON_CHAT = '<svg class="hugo-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  var ICON_CLOSE = '<svg class="hugo-icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  var ICON_USER = '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

  // --- Build DOM ---
  function buildWidget() {
    // Bubble button
    var bubble = el('button', {
      id: 'hugo-widget-bubble',
      'aria-label': 'Otevrit chat s Hugem',
      innerHTML: ICON_CHAT + ICON_CLOSE,
      onClick: toggleWidget,
    });

    // Container
    var container = el('div', { id: 'hugo-widget-container' });

    // Header
    var avatar = el('div', { className: 'hugo-header-avatar' });
    if (LOGO) {
      avatar.appendChild(el('img', { src: LOGO, alt: TITLE }));
    } else {
      avatar.innerHTML = ICON_USER;
    }
    var headerInfo = el('div', { className: 'hugo-header-info' }, [
      el('h3', {}, TITLE),
      el('p', {}, SUBTITLE),
    ]);
    var header = el('div', { className: 'hugo-header' }, [avatar, headerInfo]);

    // Messages area
    var messagesArea = el('div', { className: 'hugo-messages', id: 'hugo-messages' });

    // Input area
    var input = el('input', {
      type: 'text',
      placeholder: 'Napiste zpravu...',
      id: 'hugo-input',
      onKeydown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } },
    });
    var sendBtn = el('button', {
      id: 'hugo-send-btn',
      'aria-label': 'Odeslat',
      innerHTML: ICON_SEND,
      onClick: sendMessage,
    });
    var inputArea = el('div', { className: 'hugo-input-area' }, [input, sendBtn]);

    // Powered by
    var powered = el('div', { className: 'hugo-powered' }, [
      document.createTextNode('Powered by '),
      el('a', { href: 'https://hypoteeka.cz', target: '_blank', rel: 'noopener' }, 'Hugo AI'),
    ]);

    container.appendChild(header);
    container.appendChild(messagesArea);
    container.appendChild(inputArea);
    container.appendChild(powered);

    document.body.appendChild(container);
    document.body.appendChild(bubble);

    // Add greeting message (marked so it's not sent to API)
    messages.push({ role: 'assistant', content: GREETING, _greeting: true });
    renderMessages();
  }

  // --- Toggle ---
  function toggleWidget() {
    isOpen = !isOpen;
    var container = document.getElementById('hugo-widget-container');
    var bubble = document.getElementById('hugo-widget-bubble');
    if (isOpen) {
      container.classList.add('hugo-visible');
      bubble.classList.add('hugo-open');
      var input = document.getElementById('hugo-input');
      if (input) setTimeout(function() { input.focus(); }, 100);
    } else {
      container.classList.remove('hugo-visible');
      bubble.classList.remove('hugo-open');
    }
  }

  // --- Messages ---
  function addMessage(role, text) {
    messages.push({ role: role, content: text });
    renderMessages();
  }

  function renderMessages() {
    var area = document.getElementById('hugo-messages');
    if (!area) return;
    area.innerHTML = '';
    messages.forEach(function(msg) {
      var cls = 'hugo-msg hugo-msg-' + msg.role;
      var div = el('div', { className: cls });
      // Simple markdown-like formatting
      div.innerHTML = formatText(msg.content);
      area.appendChild(div);
    });
    // Scroll to bottom
    area.scrollTop = area.scrollHeight;
  }

  function formatText(text) {
    if (!text) return '';
    // Escape HTML
    var safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Bold
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  function showTyping() {
    var area = document.getElementById('hugo-messages');
    if (!area) return;
    var existing = document.getElementById('hugo-typing');
    if (existing) return;
    var div = el('div', { className: 'hugo-msg hugo-msg-typing', id: 'hugo-typing', textContent: 'Hugo pise...' });
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById('hugo-typing');
    if (typing) typing.remove();
  }

  function setInputEnabled(enabled) {
    var input = document.getElementById('hugo-input');
    var btn = document.getElementById('hugo-send-btn');
    if (input) input.disabled = !enabled;
    if (btn) btn.disabled = !enabled;
  }

  // --- Send Message ---
  async function sendMessage() {
    var input = document.getElementById('hugo-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || isStreaming) return;

    input.value = '';
    addMessage('user', text);
    isStreaming = true;
    setInputEnabled(false);
    showTyping();

    try {
      // Build messages for API (AI SDK UI format with parts)
      // Skip the initial greeting (first assistant message) and streaming placeholders
      var apiMessages = messages.filter(function(m, idx) {
        if (m._streaming) return false;
        if (idx === 0 && m.role === 'assistant' && m._greeting) return false;
        return true;
      }).map(function(m) {
        return {
          role: m.role,
          parts: [{ type: 'text', text: m.content }],
        };
      });

      var response = await fetch((API_URL || '') + '/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Widget-Key': WIDGET_KEY,
        },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: sessionId,
          config: { tenantId: cfg.tenantId || '' },
        }),
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      hideTyping();

      // Read SSE streaming response (AI SDK v6 data: format)
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var assistantText = '';
      var buffer = '';

      while (true) {
        var result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || !line.startsWith('data: ')) continue;

          var jsonStr = line.slice(6); // Remove "data: " prefix
          try {
            var evt = JSON.parse(jsonStr);
            // text-delta events contain the streaming text
            if (evt.type === 'text-delta' && evt.delta) {
              assistantText += evt.delta;
              updateAssistantMessage(assistantText);
            }
          } catch(e) { /* skip unparseable */ }
        }
      }

      // Finalize
      if (assistantText) {
        // Mark as no longer streaming
        if (messages.length > 0 && messages[messages.length - 1]._streaming) {
          delete messages[messages.length - 1]._streaming;
        }
      } else {
        // No text received -- might be tool-only response
        addMessage('assistant', 'Zpracovavam vas pozadavek...');
      }

    } catch (err) {
      hideTyping();
      console.error('[Hugo Widget] Error:', err);
      addMessage('assistant', 'Omlouvam se, doslo k technicke chybe. Zkuste to prosim znovu.');
    } finally {
      isStreaming = false;
      setInputEnabled(true);
      var inp = document.getElementById('hugo-input');
      if (inp) inp.focus();
    }
  }

  function updateAssistantMessage(text) {
    // Update last assistant message or create new one
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1]._streaming) {
      messages[messages.length - 1].content = text;
    } else {
      messages.push({ role: 'assistant', content: text, _streaming: true });
    }
    renderMessages();
  }

  // --- Init ---
  function init() {
    if (document.getElementById('hugo-widget-bubble')) return; // Already initialized
    injectStyles();
    buildWidget();
    console.log('[Hugo Widget] Initialized. Session:', sessionId);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for programmatic control
  window.HugoWidget = {
    open: function() { if (!isOpen) toggleWidget(); },
    close: function() { if (isOpen) toggleWidget(); },
    toggle: toggleWidget,
    sendMessage: function(text) {
      var input = document.getElementById('hugo-input');
      if (input) { input.value = text; sendMessage(); }
    },
  };

})();
