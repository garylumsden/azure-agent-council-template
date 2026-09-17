// Presentation only: two independent, near-bottom scroll followers and local timestamps.
// Weak ownership plus removal observation also cleans up after enhanced navigation or
// a disconnected Blazor circuit, when .NET disposal cannot make an interop call.
(() => {
    "use strict";
    const controllers = new WeakMap();
    const nearBottom = 64;
    const clock = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const fullTimestamp = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium", timeStyle: "long"
    });

    function createController(root, reference) {
        let dotnet = reference;
        let disposed = false;
        let frame = 0;
        let session;
        let following = true;
        let readerPaused = false;
        let callbackPending = false;
        const response = createFollower("response", true);
        const timeline = createFollower("timeline", false);

        function pauseReader() {
            if (readerPaused || !following || callbackPending || disposed) return;
            readerPaused = true;
            callbackPending = true;
            dotnet.invokeMethodAsync("PauseResponseFollow")
                .catch(error => {
                    // Do not hide unexpected callback failures. In particular, no retry loop
                    // should keep a disposed .NET reference or a disconnected circuit alive.
                    if (!disposed && root.isConnected)
                        console.error("Could not pause debate response following.", error);
                })
                .finally(() => { callbackPending = false; });
        }

        function createFollower(name, isResponse) {
            const viewport = root.querySelector(`[data-debate-${name}-scroll]`);
            const content = root.querySelector(`[data-debate-${name}-content]`);
            if (!viewport || !content) throw new Error(`Missing debate ${name} scroll surface.`);
            let pinned = true;
            let lastHeight = -1;
            let lastViewportHeight = -1;
            let lastTop = 0;
            let wasVisible = false;
            const visible = () => viewport.clientHeight > 0 && viewport.getClientRects().length > 0;
            const atBottom = () => viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= nearBottom;

            function onScroll() {
                if (!visible()) return;
                lastTop = viewport.scrollTop;
                pinned = atBottom();
                if (isResponse && !pinned) pauseReader();
            }

            function toBottom() {
                pinned = true;
                if (!visible()) return;
                viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
                lastTop = viewport.scrollTop;
                lastHeight = viewport.scrollHeight;
                lastViewportHeight = viewport.clientHeight;
            }

            function toTop() {
                pinned = false;
                lastTop = 0;
                viewport.scrollTop = 0;
                lastHeight = viewport.scrollHeight;
                lastViewportHeight = viewport.clientHeight;
            }

            function refresh() {
                if (!visible()) {
                    wasVisible = false;
                    return;
                }
                const canFollow = !isResponse || (following && !readerPaused);
                if (!wasVisible && (!pinned || !canFollow)) viewport.scrollTop = lastTop;
                wasVisible = true;
                // A streaming render that changes neither height nor viewport does nothing.
                // pinned comes from the previous scroll position, not the newly grown content.
                if (pinned && canFollow && (lastHeight !== viewport.scrollHeight || lastViewportHeight !== viewport.clientHeight))
                    toBottom();
                lastHeight = viewport.scrollHeight;
                lastViewportHeight = viewport.clientHeight;
            }

            function onToggle(event) {
                // Expanding an earlier reason is reading, not a request to jump to the end.
                if (event.target instanceof HTMLDetailsElement && event.target.open) pinned = false;
            }

            viewport.addEventListener("scroll", onScroll, { passive: true });
            if (!isResponse) viewport.addEventListener("toggle", onToggle, true);
            return {
                viewport, content, refresh, toBottom, toTop,
                reset() { pinned = true; lastHeight = -1; lastViewportHeight = -1; lastTop = 0; },
                dispose() {
                    viewport.removeEventListener("scroll", onScroll);
                    viewport.removeEventListener("toggle", onToggle, true);
                }
            };
        }

        function schedule() {
            if (disposed || frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (!root.isConnected) { dispose(); return; }
                response.refresh();
                timeline.refresh();
            });
        }

        const resize = new ResizeObserver(schedule);
        resize.observe(response.content);
        resize.observe(response.viewport);
        resize.observe(timeline.content);
        resize.observe(timeline.viewport);
        const removal = new MutationObserver(() => {
            if (!root.isConnected) dispose();
        });
        removal.observe(document.body, { childList: true, subtree: true });

        function localizeTimes() {
            for (const time of root.querySelectorAll("time[data-debate-local-time]:not([data-debate-localized])")) {
                const value = new Date(time.dateTime);
                if (!Number.isNaN(value.getTime())) {
                    time.textContent = clock.format(value);
                    time.title = fullTimestamp.format(value);
                    time.setAttribute("aria-label", time.title);
                }
                time.setAttribute("data-debate-localized", "");
            }
        }

        function sync(options) {
            if (disposed) return;
            if (session !== options.session) {
                session = options.session;
                readerPaused = false;
                response.reset();
                timeline.reset();
            }
            following = options.following;
            if (options.responseAction === "bottom") {
                readerPaused = false;
                response.toBottom();
            } else if (options.responseAction === "top") {
                response.toTop();
            }
            if (options.timelineToBottom) timeline.toBottom();
            localizeTimes();
            if (options.focusId) {
                const target = document.getElementById(options.focusId);
                const fallback = document.getElementById(options.fallbackFocusId);
                const focusTarget = target && root.contains(target) ? target : fallback;
                if (focusTarget && root.contains(focusTarget)) focusTarget.focus({ preventScroll: true });
            }
            schedule();
        }

        function dispose() {
            if (disposed) return;
            disposed = true;
            if (frame) cancelAnimationFrame(frame);
            resize.disconnect();
            removal.disconnect();
            response.dispose();
            timeline.dispose();
            dotnet = null;
            controllers.delete(root);
        }

        return { sync, dispose };
    }

    window.debateScroll = {
        sync(root, reference, options) {
            if (!(root instanceof HTMLElement) || !root.isConnected) return;
            let controller = controllers.get(root);
            if (!controller) {
                controller = createController(root, reference);
                controllers.set(root, controller);
            }
            controller.sync(options);
        },
        dispose(root) {
            controllers.get(root)?.dispose();
        }
    };
})();
