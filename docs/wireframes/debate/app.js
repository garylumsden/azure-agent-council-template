'use strict';

(() => {
  const data = window.DEBATE_FIXTURE;
  const layouts = {
    desk: ['Live desk', 'The council, the response, and the conversation. Side by side.'],
    stage: ['Focus stage', 'One response at a time. Built for presenting.'],
    lanes: ['Conversation lanes', 'Follow each member’s reasoning without mixing the voices.'],
    split: ['Split review', 'Keep an earlier response beside what is being said now.'],
    timeline: ['Event timeline', 'Read the sequence. Keep the live debate in sight.']
  };
  const state = { layout: 'stage', event: 4, selected: null, pinned: 't2', panel: null, panelValue: null, scenario: 'normal', playing: false, filter: 'all' };
  let playback;
  let toastTimer;
  let opener;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const member = id => data.members.find(item => item.id === id);
  const event = () => data.events[state.event];
  const turns = () => data.turns.filter(turn => turn.at <= state.event);
  const latest = () => turns().at(-1);
  const selected = () => turns().find(turn => turn.id === state.selected) ?? latest();
  const avatar = (person, size = '') => `<span class="avatar ${person.tone} ${size}" aria-hidden="true">${person.initials}</span>`;
  const stance = person => `<span class="stance ${person.stance.toLowerCase()}">${escape(person.stance)}</span>`;
  const handList = () => state.scenario === 'no-hands' ? [] : event().hands;
  const badge = (text, className = '') => `<span class="state-tag ${className}">${text}</span>`;
  const action = (name, value, text, className = 'quiet-button') => `<button class="${className}" data-action="${name}" data-value="${escape(value)}"${className === 'icon-button' && name === 'member' ? ` aria-label="Inspect ${escape(member(value).name)}"` : ''}>${text}</button>`;

  function memberState(person) {
    if (state.event === 0) return 'Forming a position';
    if (event().turn && data.turns.find(turn => turn.id === event().turn)?.member === person.id) return 'Has the floor';
    if (handList().some(hand => hand.member === person.id)) return 'Hand raised';
    return turns().some(turn => turn.member === person.id) ? 'Response delivered' : 'Listening';
  }

  function roster(compact = false) {
    return `<div class="roster ${compact ? 'compact-roster' : ''}">${data.members.map(person => {
      const status = memberState(person);
      return `<button class="member-row ${status === 'Has the floor' ? 'on-floor' : ''}" data-action="member" data-value="${person.id}">
        ${avatar(person)}<span class="member-identity"><strong>${person.name}</strong><span>${person.role}</span></span>
        <span class="member-state ${status === 'Hand raised' ? 'hand-state' : ''}">${status === 'Hand raised' ? '<span aria-hidden="true">&#8593;</span> ' : ''}${status}</span>
      </button>`;
    }).join('')}</div>`;
  }

  function responseList() {
    return `<div class="response-list">${turns().map(turn => {
      const person = member(turn.member);
      return `<button data-action="read" data-value="${turn.id}" class="response-link ${selected()?.id === turn.id ? 'selected' : ''}" aria-pressed="${selected()?.id === turn.id}">
        <span class="response-index">${turns().indexOf(turn) + 1}</span><span><strong>${person.name}<span class="response-time">${turn.time}</span></strong><span>${turn.title}</span></span>
      </button>`;
    }).join('')}</div>`;
  }

  function response(turn, { spotlight = false, label = null, tools = true } = {}) {
    if (!turn) return `<div class="empty-response"><span class="waiting-symbol" aria-hidden="true">&#9675;</span><h3>The first response is next.</h3><p>The council has tabled its initial positions. Raised-hand reasons appear below while the Moderator selects a speaker.</p>${action('positions', '', 'Read initial positions', 'secondary-button')}</div>`;
    const person = member(turn.member);
    const isCurrent = event().turn === turn.id;
    const blocked = state.scenario === 'blocked' && turn.id === latest()?.id;
    const reply = data.turns.find(item => item.id === turn.respondsTo);
    return `<article class="response-article ${spotlight ? 'spotlight-article' : ''}" data-turn="${turn.id}">
      <header class="speaker-header">${avatar(person, spotlight ? 'avatar-large' : '')}
        <div class="speaker-identity"><h3>${person.name} <span>${person.role}</span></h3><div>${badge(label ?? (isCurrent ? 'Has the floor' : 'Response delivered'), isCurrent ? 'live-tag' : '')}<span>Round ${turn.round}<span aria-hidden="true"> · </span>${turn.time}</span></div></div>
        ${tools ? action('member', person.id, 'Profile', 'quiet-button profile-button') : ''}
      </header>
      <div class="response-prose">
        ${reply ? `<button class="reply-context" data-action="reply" data-value="${reply.id}"><span aria-hidden="true">&#8627;</span><span>Responding to ${member(reply.member).name}<span class="reply-summary">: ${escape(reply.title)}</span></span></button>` : ''}
        ${blocked ? `<div class="safety-message"><h4>Contribution blocked</h4><p>The content-safety policy blocked this simulated response. Its text is not displayed.</p><p>The Moderator can continue with the other members.</p>${action('scenario', 'normal', 'Restore normal simulation', 'secondary-button')}</div>` : `
          <h4>${turn.title}</h4>
          ${turn.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')}
          ${state.scenario === 'long' ? Array.from({ length: 7 }, (_, index) => `<p>Extended sample ${index + 1}: this deliberately long response tests reading inside the response panel. The Moderator and raised-hand reasons remain outside this scroll area. Readers can inspect the earlier discussion without moving the whole workspace.</p>`).join('') : ''}
        `}
      </div>
      ${!blocked ? `<footer class="response-footer"><button class="source-link" data-action="source" data-value="${turn.section}"><span aria-hidden="true">&#9782;</span> ${turn.source}<span class="source-type">Dossier source</span><span aria-hidden="true">&#8599;</span></button>${tools ? action('pin', turn.id, 'Compare this response', 'quiet-button') : ''}</footer>` : ''}
    </article>`;
  }

  function desk() {
    return `<div class="desk-layout">
      <section class="council-pane panel"><div class="panel-title"><h3>Council</h3><span>${data.members.length} members</span></div>${roster()}<div class="pane-note">Select a member to inspect their initial position and responses.</div></section>
      <section class="reading-pane panel" aria-label="Selected response">${readingMarker()}${response(selected())}${responseNavigation(true)}</section>
      <section class="history-pane panel"><div class="panel-title"><h3>Responses</h3><span>${turns().length} delivered</span></div>${responseList()}<div class="pane-note">Read any response. The Moderator and raised hands stay live.</div></section>
    </div>`;
  }

  function stage() {
    return `<div class="stage-layout"><section class="stage-main panel" aria-label="Spotlight response">
      ${readingMarker()}${response(selected(), { spotlight: true })}
      ${responseNavigation()}
    </section><section class="stage-council" aria-label="Council members">${roster(true)}</section></div>`;
  }

  function responseNavigation(mobileOnly = false) {
    return `<nav class="response-navigation ${mobileOnly ? 'mobile-response-nav' : ''}" aria-label="Read responses"><button class="quiet-button" data-action="older" ${turns().indexOf(selected()) <= 0 ? 'disabled' : ''}>&#8592; Earlier response</button><span>${selected() ? turns().indexOf(selected()) + 1 : 0} of ${turns().length} responses</span><button class="quiet-button" data-action="newer" ${!selected() || selected().id === latest()?.id ? 'disabled' : ''}>Newer response &#8594;</button></nav>`;
  }

  function lanes() {
    return `<div class="lanes-layout" aria-label="Responses grouped by council member">${data.members.map(person => {
      const contributions = turns().filter(turn => turn.member === person.id);
      return `<section class="lane panel"><header class="lane-header">${avatar(person)}<div><h3>${person.name}</h3><span>${person.role}</span></div>${action('member', person.id, '&#8599;', 'icon-button')}</header>
        <div class="lane-scroll"><div class="initial-position"><div><strong>Initial position</strong>${stance(person)}</div><p>${person.position}</p></div>
        ${contributions.map(turn => `<button class="lane-response ${event().turn === turn.id ? 'on-floor' : ''}" data-action="inspect-turn" data-value="${turn.id}"><span class="lane-response-meta">Round ${turn.round}<span>${turn.time}</span></span><strong>${turn.title}</strong><span>${state.scenario === 'blocked' && turn.id === latest()?.id ? 'Contribution blocked by the content-safety policy.' : turn.paragraphs[0]}</span><span class="lane-read">Read response <span aria-hidden="true">&#8599;</span></span></button>`).join('')}
        ${!contributions.length ? `<div class="lane-empty"><span aria-hidden="true">&#8212;</span><p>No debate response yet.</p><span>${memberState(person)}</span></div>` : ''}
        </div>
      </section>`;
    }).join('')}</div>`;
  }

  function split() {
    const earlier = turns().filter(turn => turn.id !== latest()?.id);
    const pinned = earlier.find(turn => turn.id === state.pinned) ?? earlier.at(-1);
    return `<div class="split-layout">
      <section class="comparison-pane panel"><div class="comparison-heading"><label for="compare-select">Keep in view</label><select id="compare-select" ${!earlier.length ? 'disabled' : ''}>${earlier.length ? earlier.map(turn => `<option value="${turn.id}" ${pinned?.id === turn.id ? 'selected' : ''}>${member(turn.member).name} · ${turn.topic} · Round ${turn.round}</option>`).join('') : '<option>No earlier response yet</option>'}</select></div>${response(pinned, { label: 'Pinned for comparison', tools: false })}</section>
      <section class="comparison-pane current-comparison panel"><div class="comparison-heading"><strong>Latest response</strong><span class="live-text">${event().kind === 'response' ? 'Has the floor' : 'Live context'}</span></div>${response(latest(), { tools: false })}</section>
    </div>`;
  }

  function timeline() {
    const pastEvents = data.events.slice(0, state.event + 1).filter(item => state.filter === 'all' || (state.filter === 'responses' ? item.kind === 'response' : item.kind !== 'response'));
    return `<div class="timeline-layout">
      <section class="timeline-pane panel"><div class="timeline-controls"><h3>Event history</h3><label class="sr-only" for="event-filter">Filter event history</label><select id="event-filter"><option value="all" ${state.filter === 'all' ? 'selected' : ''}>All events</option><option value="responses" ${state.filter === 'responses' ? 'selected' : ''}>Responses</option><option value="moderator" ${state.filter === 'moderator' ? 'selected' : ''}>Moderator</option></select></div>
        <ol class="event-list">${pastEvents.map(item => `<li class="${item === event() ? 'current-event' : ''}"><span class="event-time">${item.time}</span><span class="event-node" aria-hidden="true"></span><button data-action="${item.turn ? 'read' : 'announcement'}" data-value="${data.events.indexOf(item)}" ${item.turn ? `data-turn-id="${item.turn}"` : ''}><strong>${item.label}</strong><span>${item.kind === 'response' ? data.turns.find(turn => turn.id === item.turn).title : item.announcement}</span></button></li>`).join('')}</ol>
      </section>
      <section class="reading-pane panel" aria-label="Selected event response">${readingMarker()}${response(selected())}</section>
    </div>`;
  }

  function readingMarker() {
    if (!state.selected || state.selected === latest()?.id) return '';
    const unread = turns().filter(turn => turn.at > selected().at).length;
    return `<div class="reading-marker"><span>Reading an earlier response</span><button data-action="follow">${unread} newer ${unread === 1 ? 'response' : 'responses'} &#8594;</button></div>`;
  }

  function specialWorkspace() {
    if (state.event === 0) {
      return `<section class="initial-workspace panel"><div class="initial-workspace-heading"><h3>The council is reviewing the dossier.</h3><p>Positions appear here as they arrive. The debate begins after the initial assessment.</p></div><div class="forming-grid">${data.members.map((person, index) => `<div class="forming-member">${avatar(person)}<div><strong>${person.name}</strong><span>${person.role}</span><p>${index < 3 ? person.position : 'Forming an initial position...'}</p></div>${index < 3 ? badge('Received') : badge('Reviewing', 'live-tag')}</div>`).join('')}</div></section>`;
    }
    if (event().kind === 'synthesis') return `<section class="completion-workspace panel"><div class="chair-mark" aria-hidden="true">C</div><h3>The Chair is preparing the Assessment.</h3><p>The debate is complete. The Chair is combining recommendations, conditions, dissent, and risks.</p><div class="synthesis-steps"><span>Debate complete</span><span class="live-text">Assessment in progress</span><span>Nexus analysis next</span></div>${action('announcements', '', 'Review moderator history', 'secondary-button')}<p class="small-note">Use Next event to see the simulated result.</p></section>`;
    if (event().kind === 'complete') return `<section class="completion-workspace assessment-workspace panel"><div class="assessment-summary"><span class="completion-check" aria-hidden="true">&#10003;</span><h3>Support with conditions</h3><p>The council recommends a limited, reversible pilot after the required controls have named owners.</p>${badge('Synthetic Assessment', 'live-tag')}</div><div class="assessment-details"><section><h4>Conditions before launch</h4><ul><li>Approve access boundaries and a retention period.</li><li>Name a delivery owner and test the shutdown procedure.</li><li>Agree on evaluation measures and a budget ceiling.</li></ul></section><section><h4>Dissent remains visible</h4><p>Rowan opposed the proposal as submitted. The Assessment does not treat conditional support as unanimous approval.</p><h4>Nexus analysis</h4><p>No connections in this synthetic example. No stored assessments were queried.</p></section></div>${action('review-debate', '', 'Return to the debate', 'secondary-button')}</section>`;
    return null;
  }

  function renderHands() {
    const hands = handList();
    $('#hand-count').textContent = hands.length;
    $('.mobile-hands-hint').hidden = hands.length < 2;
    $('#hands-description').textContent = event().kind === 'complete' || event().kind === 'synthesis' ? 'The debate is concluded. No further speaker selection.' : 'Reasons are visible. The Moderator chooses who speaks.';
    $('#hands').innerHTML = hands.length ? hands.map(hand => {
      const person = member(hand.member);
      return `<button class="hand-request" data-action="hand" data-value="${person.id}">${avatar(person)}<span><strong>${person.name}<span>${person.role}</span></strong><span class="hand-reason">${hand.reason}</span></span><span class="hand-open" aria-hidden="true">&#8599;</span></button>`;
    }).join('') : `<div class="no-hands"><span aria-hidden="true">&#8212;</span> ${event().kind === 'complete' || event().kind === 'synthesis' ? 'No pending hands. The council has finished speaking.' : state.event === 0 ? 'Hands will appear when the debate opens.' : 'No hands raised. The current response stays in view.'}</div>`;
  }

  function render() {
    const focused = document.activeElement;
    const focusAction = focused?.dataset?.action;
    const focusValue = focused?.dataset?.value;
    const active = event();
    document.body.dataset.layout = state.layout;
    document.body.dataset.connection = state.scenario === 'connection' ? 'lost' : 'connected';
    for (const button of document.querySelectorAll('[data-action="layout"]')) button.setAttribute('aria-pressed', String(button.dataset.value === state.layout));
    $('#concept-name').textContent = layouts[state.layout][0];
    $('#idea-position').textContent = `Idea ${Object.keys(layouts).indexOf(state.layout) + 1} of ${Object.keys(layouts).length}`;
    $('#concept-description').textContent = layouts[state.layout][1];
    $('#session-state').innerHTML = state.scenario === 'connection' ? '<span class="connection-dot"></span> Connection lost' : `<span class="connection-dot"></span> ${active.phase}`;
    $('#moderator-message').textContent = state.scenario === 'connection' ? 'Connection lost. Showing the last received state. Reconnect the simulation to resume updates.' : active.announcement;
    $('#round-indicator').textContent = active.round ? `Round ${active.round} / 3` : 'Before the debate';
    const unread = state.selected ? turns().filter(turn => turn.at > selected()?.at).length : 0;
    $('#follow-button').innerHTML = state.selected ? `Return to live${unread ? ` <span>${unread} new</span>` : ''} &#8594;` : '<span class="small-live-dot" aria-hidden="true"></span> Following live';
    $('#follow-button').setAttribute('aria-pressed', String(!state.selected));
    $('#workspace').innerHTML = specialWorkspace() ?? ({ desk, stage, lanes, split, timeline })[state.layout]();
    renderHands();
    $('#event-range').value = state.event;
    $('#event-range').setAttribute('aria-valuetext', `${state.event + 1} of ${data.events.length}: ${active.label}`);
    $('#event-label').textContent = `${state.event + 1} / ${data.events.length} · ${active.label}`;
    $('#play-button').textContent = state.playing ? 'Pause demo' : state.event === data.events.length - 1 ? 'Replay demo' : 'Play demo';
    $('#play-button').setAttribute('aria-pressed', String(state.playing));
    $('#next-button').disabled = state.event === data.events.length - 1 || state.scenario === 'connection';
    $('[data-action="previous"]').disabled = state.event === 0 || state.scenario === 'connection';
    $('#event-range').disabled = state.scenario === 'connection';
    $('#play-button').disabled = state.scenario === 'connection';
    if (state.panel) renderInspector();
    if (focusAction && !document.contains(focused)) {
      const replacement = [...document.querySelectorAll('[data-action]')].find(button => button.dataset.action === focusAction && button.dataset.value === focusValue);
      replacement?.focus({ preventScroll: true });
    }
  }

  function announce(text) {
    $('#status-announcement').textContent = text;
  }

  function toast(text) {
    clearTimeout(toastTimer);
    $('#toast').textContent = text;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3600);
  }

  function stopPlayback() {
    clearInterval(playback);
    state.playing = false;
  }

  function goToEvent(index) {
    if (state.scenario === 'connection') return;
    state.event = Math.max(0, Math.min(data.events.length - 1, index));
    if (state.selected && !turns().some(turn => turn.id === state.selected)) state.selected = null;
    if (state.event === data.events.length - 1) stopPlayback();
    render();
    announce(`${event().label}. ${event().announcement}`);
  }

  function openInspector(panel, value = null) {
    opener = document.activeElement;
    state.panel = panel;
    state.panelValue = value;
    $('#inspector').hidden = false;
    renderInspector();
    $('[data-action="close"]').focus();
  }

  function closeInspector() {
    state.panel = null;
    $('#inspector').hidden = true;
    if (opener && document.contains(opener)) opener.focus();
    else $('#workspace').focus();
  }

  function renderInspector() {
    let title = '';
    let content = '';
    const person = member(state.panelValue);
    if (state.panel === 'help') {
      title = 'Try the five ideas';
      content = `<p class="inspector-lead">Same debate. Five ways to follow it.</p><ol class="help-steps"><li>Switch layouts at the top. Your simulated event stays the same.</li><li>Select <strong>Next event</strong>, or play the automatic demo.</li><li>Inspect a raised hand. Its reason is visible without hover.</li><li>Read an earlier response. Then return to live.</li><li>Open a dossier source or compare two responses.</li></ol><div class="info-note"><strong>Prototype, not a live council</strong><p>All names, documents, responses, and assessments are synthetic. Playback controls affect only this demonstration.</p></div><h3>Keyboard</h3><p>Use Tab to reach controls and Escape to close this panel. Use the arrow keys on the simulation slider.</p><h3>The five ideas</h3>${Object.entries(layouts).map(([id, layout]) => `<button class="layout-description" data-action="layout" data-value="${id}"><strong>${layout[0]} &#8599;</strong><span>${layout[1]}</span></button>`).join('')}<p class="small-note">Design process: Impeccable by Paul Bakaus. This prototype retains the app’s existing visual vocabulary.</p>`;
    } else if (state.panel === 'document' || state.panel === 'source') {
      title = state.panel === 'source' ? 'Dossier source' : 'Dossier under review';
      content = `<p class="inspector-lead">Shared knowledge pilot</p><p class="small-note">Synthetic dossier. Source inspection is local; no document service is called.</p>${data.sections.map(section => `<section class="document-section ${state.panelValue === section.id ? 'source-selected' : ''}" id="source-${section.id}"><h3>${section.title}${state.panelValue === section.id ? ' <span class="source-indicator">Cited</span>' : ''}</h3><p>${section.text}</p></section>`).join('')}`;
    } else if (state.panel === 'member' || state.panel === 'hand') {
      const hand = handList().find(item => item.member === person.id);
      title = state.panel === 'hand' ? 'Request to speak' : 'Council member';
      content = `<div class="profile-heading">${avatar(person, 'avatar-large')}<div><h3>${person.name}</h3><p>${person.role}</p></div></div>
        ${hand ? `<section class="hand-detail"><h3>Why this hand is raised</h3><p>${hand.reason}</p><span class="small-note">The Moderator selects speakers. This is not a first-in, first-out queue.</span></section>` : `<p class="small-note">${memberState(person)}. No pending request to speak.</p>`}
        <h3>Initial position</h3>${stance(person)}<p>${person.position}</p><h3>Responses so far</h3>${turns().filter(turn => turn.member === person.id).map(turn => `<button class="profile-response" data-action="inspect-turn" data-value="${turn.id}"><strong>${turn.title}</strong><span>Round ${turn.round} · ${turn.time} &#8599;</span></button>`).join('') || '<p>No debate response has been delivered by this member.</p>'}`;
    } else if (state.panel === 'positions') {
      title = 'Initial positions';
      content = `<p>These are the members’ starting positions, not final votes or a live consensus score.</p><div class="positions-list">${data.members.map(person => `<section>${avatar(person)}<div><h3>${person.name} <span>${person.role}</span></h3>${stance(person)}<p>${state.event === 0 && data.members.indexOf(person) >= 3 ? 'Forming an initial position...' : person.position}</p></div></section>`).join('')}</div>`;
    } else if (state.panel === 'announcements' || state.panel === 'announcement') {
      title = 'Moderator history';
      content = `<p class="small-note">Announcements remain available after the live banner changes.</p><ol class="announcement-history">${data.events.slice(0, state.event + 1).map((item, index) => `<li class="${String(state.panelValue) === String(index) ? 'source-selected' : ''}"><span>${item.time} · ${item.label}</span><p>${item.announcement}</p></li>`).join('')}</ol>`;
    } else if (state.panel === 'turn') {
      title = 'Response detail';
      const turn = turns().find(item => item.id === state.panelValue);
      content = turn ? response(turn) : '<p>This response has not occurred at the current simulated event.</p>';
    } else if (state.panel === 'options') {
      title = 'Simulation scenarios';
      content = `<p>Explore difficult states without starting a real debate.</p><div class="scenario-options">${[
        ['normal', 'Normal debate', 'Restore the standard synthetic discussion.'],
        ['long', 'Long response', 'Test independent scrolling while live context stays visible.'],
        ['no-hands', 'No raised hands', 'See the waiting state without an empty panel.'],
        ['blocked', 'Blocked contribution', 'Hide the latest response and show a content-safety notice.'],
        ['connection', 'Connection lost', 'Keep the last state visible and stop simulation updates.']
      ].map(([id, name, description]) => `<button class="scenario-option ${state.scenario === id ? 'selected' : ''}" data-action="scenario" data-value="${id}" aria-pressed="${state.scenario === id}"><strong>${name}</strong><span>${description}</span></button>`).join('')}</div>${state.scenario === 'connection' ? action('scenario', 'normal', 'Reconnect simulation', 'primary-button') : ''}`;
    }
    $('#inspector-title').textContent = title;
    $('#inspector-content').innerHTML = content;
    if (state.panel === 'source') $(`#source-${state.panelValue}`)?.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('click', click => {
    const button = click.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const value = button.dataset.value;
    switch (button.dataset.action) {
      case 'layout':
        state.layout = value;
        if (state.panel === 'help') closeInspector();
        render();
        announce(`${layouts[value][0]}. ${layouts[value][1]}`);
        break;
      case 'help': case 'document': case 'positions': case 'announcements': case 'options':
        openInspector(button.dataset.action); break;
      case 'source': case 'member': case 'hand': case 'announcement':
        openInspector(button.dataset.action, value); break;
      case 'inspect-turn':
        openInspector('turn', value); break;
      case 'close': closeInspector(); break;
      case 'read':
        state.selected = button.dataset.turnId ?? value;
        render();
        if (state.layout === 'timeline' && matchMedia('(max-width: 767px)').matches) $('.timeline-layout .reading-pane').scrollIntoView({ block: 'nearest', inline: 'end' });
        announce('Reading an earlier response. The moderator and raised hands still show the live state.');
        break;
      case 'reply':
        state.pinned = value;
        state.layout = 'split';
        render();
        break;
      case 'pin':
        if (value === latest()?.id) {
          toast('The latest response is already on the right. Choose an earlier response on the left.');
        } else state.pinned = value;
        state.layout = 'split';
        if (state.panel) closeInspector();
        render();
        break;
      case 'follow':
        state.selected = null;
        if (state.layout === 'timeline') state.filter = 'all';
        render();
        if (state.layout === 'timeline' && matchMedia('(max-width: 767px)').matches) $('.timeline-layout .reading-pane')?.scrollIntoView({ block: 'nearest', inline: 'end' });
        announce('Following the latest response.');
        break;
      case 'older': case 'newer': {
        const offset = button.dataset.action === 'older' ? -1 : 1;
        const next = turns()[turns().indexOf(selected()) + offset];
        if (next) state.selected = next.id === latest()?.id ? null : next.id;
        render();
        break;
      }
      case 'next': stopPlayback(); goToEvent(state.event + 1); break;
      case 'previous': stopPlayback(); goToEvent(state.event - 1); break;
      case 'reset':
        stopPlayback();
        state.scenario = 'normal';
        state.selected = null;
        goToEvent(0);
        break;
      case 'review-debate':
        stopPlayback();
        goToEvent(7);
        state.layout = 'timeline';
        render();
        break;
      case 'play':
        if (state.playing) stopPlayback();
        else {
          if (state.event === data.events.length - 1) goToEvent(0);
          state.playing = true;
          playback = setInterval(() => goToEvent(state.event + 1), 7000);
        }
        render();
        break;
      case 'scenario':
        state.scenario = value;
        if (value === 'connection') stopPlayback();
        if (['long', 'blocked'].includes(value) && (state.event < 2 || state.event > 7)) state.event = 4;
        render();
        announce(`${value === 'normal' ? 'Normal debate restored' : 'Simulation scenario changed'}.`);
        break;
    }
  });

  $('#event-range').addEventListener('input', input => {
    stopPlayback();
    goToEvent(Number(input.target.value));
  });
  document.addEventListener('change', change => {
    if (change.target.id === 'compare-select') { state.pinned = change.target.value; render(); $('#compare-select').focus(); }
    if (change.target.id === 'event-filter') { state.filter = change.target.value; render(); $('#event-filter').focus(); }
  });
  document.addEventListener('keydown', key => {
    if (key.key === 'Escape' && state.panel) closeInspector();
  });
  window.addEventListener('pagehide', stopPlayback);
  render();
})();
