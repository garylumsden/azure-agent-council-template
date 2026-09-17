'use strict';

// Synthetic fixtures stay outside src and never read the active scenario or Azure resources.
window.DEBATE_FIXTURE = {
  members: [
    { id: 'avery', name: 'Avery', role: 'Strategy', initials: 'AV', tone: 'blue', stance: 'Support', position: 'A limited pilot can show whether a shared knowledge service reduces repeated work.' },
    { id: 'morgan', name: 'Morgan', role: 'Delivery', initials: 'MO', tone: 'mint', stance: 'Conditions', position: 'Support a phased launch with a named owner and a tested way to stop the pilot.' },
    { id: 'rowan', name: 'Rowan', role: 'Risk', initials: 'RO', tone: 'rose', stance: 'Oppose', position: 'The current proposal does not define acceptable access boundaries or a retention period.' },
    { id: 'casey', name: 'Casey', role: 'Evidence', initials: 'CA', tone: 'lilac', stance: 'Conditions', position: 'Agree on measures before the pilot begins. Activity alone will not show a useful outcome.' },
    { id: 'jordan', name: 'Jordan', role: 'Finance', initials: 'JO', tone: 'sand', stance: 'Conditions', position: 'Name the budget owner and set a spending ceiling before authorising the pilot.' },
    { id: 'quinn', name: 'Quinn', role: 'Operations', initials: 'QU', tone: 'slate', stance: 'Support', position: 'A small, reversible service is supportable if the support path is documented.' }
  ],
  turns: [
    {
      id: 't1', member: 'avery', at: 2, round: 1, time: '00:42', topic: 'Scope',
      title: 'Test the need before committing to a wider rollout.',
      paragraphs: [
        'I support a limited pilot. The proposal addresses repeated effort: teams currently answer the same questions in separate places.',
        'Start with one internal collection and a small volunteer group. Keep the current way of working available throughout the pilot.',
        'My support depends on the pilot remaining a learning exercise, not becoming a permanent service by default.'
      ],
      source: 'Pilot scope', section: 'scope'
    },
    {
      id: 't2', member: 'rowan', at: 3, round: 1, time: '01:18', topic: 'Access',
      title: 'A small pilot still needs clear access boundaries.',
      paragraphs: [
        'I disagree with approving the proposal in its current form. A small audience does not remove the need to define which information each person can retrieve.',
        'The dossier does not identify the owner of the access review. It also leaves the retention period undecided.',
        'I would reconsider if both decisions were made before any real internal content entered the pilot.'
      ],
      source: 'Open decisions', section: 'decisions'
    },
    {
      id: 't3', member: 'morgan', at: 4, round: 2, time: '02:06', topic: 'Rollout',
      title: 'Make the pilot reversible, not just small.',
      paragraphs: [
        'Rowan is right that the access boundary comes first. I propose a gated pilot: complete the access review before inviting participants.',
        'Give one delivery owner the authority to stop the service. Test the shutdown procedure with sample content before the first real document is added.',
        'This preserves Avery’s learning goal without treating the unresolved controls as work that can wait until later.'
      ],
      source: 'Pilot safeguards', section: 'safeguards', respondsTo: 't2'
    },
    {
      id: 't4', member: 'casey', at: 6, round: 2, time: '02:54', topic: 'Evidence',
      title: 'Measure successful answers, not activity.',
      paragraphs: [
        'I support Morgan’s gates. I would add an evaluation plan before the pilot starts, using representative questions and an agreed review method.',
        'Count answers that reviewers judge useful and supported by the source material. Also record questions the service cannot answer.',
        'Compare those results with the existing process. Without that comparison, we cannot tell whether the pilot has improved the work.'
      ],
      source: 'Evaluation plan', section: 'evaluation', respondsTo: 't3'
    },
    {
      id: 't5', member: 'jordan', at: 7, round: 3, time: '03:36', topic: 'Ownership',
      title: 'Make each condition someone’s responsibility.',
      paragraphs: [
        'I can support the pilot with the conditions discussed. The assessment should identify an owner for access, delivery, evaluation, and the budget.',
        'Set the spending ceiling before launch. The dossier does not supply a figure, so the council should not invent one.',
        'Review the outcome before renewing the pilot. Approval today should not imply approval for a wider service.'
      ],
      source: 'Open decisions', section: 'decisions', respondsTo: 't4'
    }
  ],
  events: [
    { label: 'Initial positions', kind: 'assessment', phase: 'Initial assessment', round: 0, time: '00:00', announcement: 'Members are forming their initial positions. No debate responses have been delivered yet.', hands: [] },
    { label: 'The floor opens', kind: 'open', phase: 'Debate', round: 1, time: '00:24', announcement: 'All six initial positions are received. The floor is open: who wishes to speak first?', hands: [{ member: 'avery', reason: 'Explain why a narrow pilot can test the need.' }, { member: 'rowan', reason: 'Challenge the undefined access boundary.' }] },
    { label: 'Avery takes the floor', kind: 'response', phase: 'Debate', round: 1, time: '00:42', turn: 't1', announcement: 'Avery has the floor to explain the proposed scope. Rowan’s access concern remains in the raised-hand list.', hands: [{ member: 'rowan', reason: 'Challenge the undefined access boundary.' }, { member: 'morgan', reason: 'Propose a controlled delivery sequence.' }] },
    { label: 'Rowan challenges', kind: 'response', phase: 'Debate', round: 1, time: '01:18', turn: 't2', announcement: 'Rowan has the floor to challenge access and retention assumptions before the council considers delivery.', hands: [{ member: 'morgan', reason: 'Respond to the access concern with launch gates.' }, { member: 'casey', reason: 'Ask how a successful pilot will be measured.' }] },
    { label: 'Morgan responds', kind: 'response', phase: 'Debate', round: 2, time: '02:06', turn: 't3', announcement: 'Morgan has the floor to respond to Rowan’s access concern and propose a reversible pilot.', hands: [{ member: 'casey', reason: 'The pilot needs evidence of useful answers, not just usage.' }, { member: 'jordan', reason: 'Each launch condition needs an owner and a budget.' }, { member: 'quinn', reason: 'Clarify who can stop the service and support participants.' }] },
    { label: 'The floor reopens', kind: 'open', phase: 'Debate', round: 2, time: '02:40', announcement: 'Morgan’s response is complete. The floor is open for evidence and operational concerns.', hands: [{ member: 'casey', reason: 'The pilot needs evidence of useful answers, not just usage.' }, { member: 'jordan', reason: 'Each launch condition needs an owner and a budget.' }, { member: 'quinn', reason: 'Clarify who can stop the service and support participants.' }] },
    { label: 'Casey adds evidence', kind: 'response', phase: 'Debate', round: 2, time: '02:54', turn: 't4', announcement: 'Casey has the floor to define how the pilot should be evaluated against the existing process.', hands: [{ member: 'jordan', reason: 'Each launch condition needs an owner and a budget.' }, { member: 'quinn', reason: 'Clarify who can stop the service and support participants.' }] },
    { label: 'Jordan adds conditions', kind: 'response', phase: 'Debate', round: 3, time: '03:36', turn: 't5', announcement: 'Jordan has the floor to address ownership and budget conditions. The Chair will then synthesise the discussion.', hands: [] },
    { label: 'Chair synthesises', kind: 'synthesis', phase: 'Synthesis', round: 3, time: '04:12', announcement: 'The debate has concluded. The Chair is preparing the Assessment from the responses and recorded positions.', hands: [] },
    { label: 'Assessment delivered', kind: 'complete', phase: 'Complete', round: 3, time: '04:48', announcement: 'The Chair has delivered the Assessment. Review the conditions and dissent before proceeding.', hands: [] }
  ],
  sections: [
    { id: 'scope', title: 'Pilot scope', text: 'Evaluate a shared knowledge service with a small volunteer group and one internal collection. Keep the existing process available. This is a synthetic dossier for interaction design.' },
    { id: 'safeguards', title: 'Pilot safeguards', text: 'Use sample content before real content. Define an access review, a named delivery owner, and a tested shutdown procedure. The council is reviewing whether these requirements are sufficient.' },
    { id: 'evaluation', title: 'Evaluation plan', text: 'Assess representative questions against the existing process. Record useful, supported answers and unanswered questions. The evaluation owner and acceptance measures remain open.' },
    { id: 'decisions', title: 'Open decisions', text: 'The proposal does not yet name an access owner, retention period, evaluation owner, or budget ceiling. These are unresolved decisions, not supplied facts.' }
  ]
};
