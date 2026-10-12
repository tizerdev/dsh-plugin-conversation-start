window.__ModuleLoader__.load({
  id: 'dsh-plugin-conversation-start',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // ---------- CSS (scoped via plugin-prefixed class + dataset tag) ----------
    const css = [
      '.dshLocalConvStart_row{display:flex;justify-content:center;align-items:center;gap:6px;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);padding:4px 0 8px;user-select:none;pointer-events:none}',
      '.dshLocalConvStart_empty{opacity:.55;font-style:italic}',
      '.dshLocalConvStart_sep{margin:0 4px;opacity:.55}',
      '.dshLocalConvStart_relative{opacity:.85}'
    ].join('');
    const tagId = 'dsh-plugin-conversation-start/ConversationStart.module.css';
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = 'dsh-plugin-conversation-start';
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    const cssMap = {
      row: 'dshLocalConvStart_row',
      empty: 'dshLocalConvStart_empty',
      sep: 'dshLocalConvStart_sep',
      relative: 'dshLocalConvStart_relative'
    };

    // ---------- i18n dictionaries ----------
    const NS = 'conversation-start';
    const zh = {
      'label.started': '对话开始于',
      'label.empty': '等待第一条消息…',
      'aria.started': '对话开始于',
      'relative.justNow': '刚刚',
      'relative.minutesAgo': '{n} 分钟前',
      'relative.hoursAgo': '{n} 小时前',
      'relative.daysAgo': '{n} 天前',
      'relative.minutesLater': '{n} 分钟后',
      'relative.hoursLater': '{n} 小时后',
      'relative.daysLater': '{n} 天后'
    };
    const en = {
      'label.started': 'Conversation started at',
      'label.empty': 'Waiting for the first message…',
      'aria.started': 'Conversation started at',
      'relative.justNow': 'just now',
      'relative.minutesAgo': '{n} minutes ago',
      'relative.hoursAgo': '{n} hours ago',
      'relative.daysAgo': '{n} days ago',
      'relative.minutesLater': 'in {n} minutes',
      'relative.hoursLater': 'in {n} hours',
      'relative.daysLater': 'in {n} days'
    };

    // ---------- helpers ----------
    /** Format a millisecond timestamp as `YYYY-MM-DD HH:MM:SS` in the local time zone. */
    function formatTime(timeMs) {
      const d = new Date(timeMs);
      const pad = (n) => String(n).padStart(2, '0');
      return (
        d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
      );
    }

    /** Render a relative-time string like "5 分钟前" / "in 3 hours". */
    function formatRelative(nowMs, pastMs, t) {
      const delta = nowMs - pastMs;
      const future = delta < 0;
      const abs = Math.abs(delta);
      const minutes = Math.floor(abs / 60000);
      if (minutes < 1) return t('relative.justNow');
      let key, n;
      if (minutes < 60) {
        key = future ? 'relative.minutesLater' : 'relative.minutesAgo';
        n = minutes;
      } else if (minutes < 60 * 24) {
        key = future ? 'relative.hoursLater' : 'relative.hoursAgo';
        n = Math.floor(minutes / 60);
      } else {
        key = future ? 'relative.daysLater' : 'relative.daysAgo';
        n = Math.floor(minutes / (60 * 24));
      }
      return t(key).replace('{n}', String(n));
    }

    /** Walk the session's contiguous event window; return the time of the first `user/message`. */
    function firstUserMessageTime(eventSource) {
      if (!eventSource) return null;
      const snap = eventSource.getSnapshot();
      const entries = snap && snap.entries ? snap.entries : [];
      for (let i = 0; i < entries.length; i++) {
        const ev = entries[i] && entries[i].event;
        if (ev && ev.type === 'user/message') return ev.time;
      }
      return null;
    }

    /**
     * Subscribe to the current session's eventSource and return the live time of
     * its first `user/message`. Recomputes whenever `sessionId` changes; uses
     * stable callback references so React's effect cleanup can reliably tear down
     * the previous subscription before the next one is installed.
     */
    function useFirstUserMessageTime(sessionId, sessions) {
      const eventSource = React.useMemo(() => {
        if (!sessionId || !sessions) return null;
        const binding = sessions.binding(sessionId);
        return binding && binding.session ? binding.session.eventSource : null;
      }, [sessionId, sessions]);

      const subscribe = React.useCallback(
        (notify) => (eventSource ? eventSource.subscribe(notify) : () => {}),
        [eventSource]
      );
      const getSnapshot = React.useCallback(
        () => firstUserMessageTime(eventSource),
        [eventSource]
      );
      const getServerSnapshot = React.useCallback(() => null, []);

      return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    }

    /** Ticking `now` state used by the relative-time formatter. */
    function useNow(absoluteMs) {
      const [now, setNow] = React.useState(() => Date.now());
      React.useEffect(() => {
        if (absoluteMs == null) return undefined;
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
      }, [absoluteMs]);
      return now;
    }

    // ---------- React view ----------
    /**
     * View: a one-line footer shown above the composer.
     * `sessionId` and `t` are owner-provided standardProps; `sessions` is the
     * client sessions service we capture in the slot's inject callback.
     */
    function ConversationStart({ sessionId, sessions, t }) {
      const time = useFirstUserMessageTime(sessionId, sessions);
      // useNow must run on every render to keep the hook count stable; it
      // internally short-circuits when `time` is null so no interval runs
      // while the session is empty.
      const now = useNow(time);
      if (time == null) {
        return h('div', {
          className: cssMap.row + ' ' + cssMap.empty,
          'data-conversation-start': 'empty',
          role: 'note',
          'aria-label': t('label.empty')
        }, t('label.empty'));
      }
      const relative = formatRelative(now, time, t);
      return h('div', {
        className: cssMap.row,
        'data-conversation-start': true,
        role: 'note',
        'aria-label': t('aria.started') + ' ' + formatTime(time) + ', ' + relative
      },
        '\u{1F55B} ' + t('label.started') + ' ' + formatTime(time),
        h('span', { className: cssMap.sep, 'aria-hidden': true }, '\u00B7'),
        h('span', { className: cssMap.relative }, relative)
      );
    }

    // ---------- apply ----------
    return {
      inject: ['slots', 'sessions', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'conversation-start: dictionaries');
        const sessions = ctx.sessions;
        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'conversation-start',
          order: 5,
          locale: NS,
          inject: () => ({ sessions })
        }, ConversationStart));
      }
    };
  }
});
