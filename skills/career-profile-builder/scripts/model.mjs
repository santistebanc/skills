import { randomUUID } from "node:crypto";

export const SCHEMA_VERSION = 1;
export const recordTypes = ["profile", "context", "story", "claim", "evidence", "skill"];
const states = ["provided", "unknown", "none", "withheld", "not-applicable", "deferred"];
const categories = ["employment", "education", "volunteering", "open-source", "personal", "caregiving", "other"];
const steps = ["direction", "context-label", "context-kind", "context-role", "context-period", "inventory-next", "choose-context", "story-situation", "story-actions", "story-others", "story-decision", "story-outcome", "story-support", "story-reflection", "review", "revise-field", "revise-answer", "continue"];
const fields = {
  profile: ["name"],
  context: ["label", "category"],
  story: ["label", "contextId"],
  claim: ["subjectId", "field", "statement", "answerState", "source", "evidenceIds", "dependsOn", "metric", "dates", "conflict"],
  evidence: ["label", "kind", "uri", "locator", "capturedAt", "version", "availability"],
  skill: ["label", "claimIds"],
};
const common = ["id", "type", "visibility", "publicText", "confirmation", "confirmedAt", "revision", "createdAt", "updatedAt"];
export const id = (prefix) => prefix + "_" + randomUUID();
export function check(ok, message) { if (!ok) throw new Error(message); }
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && v.trim().length > 0;
const list = (v) => Array.isArray(v) && v.every(text) && new Set(v).size === v.length;
const timestamp = (v) => text(v) && Number.isFinite(Date.parse(v));

function dateBounds(value) {
  check(typeof value === "string" && /^\d{4}(-\d{2})?(-\d{2})?$/.test(value), "Use a year, year-month or full ISO date");
  const [y, m, d] = value.split("-").map(Number);
  check(y >= 1 && y <= 9999 && (m === undefined || (m >= 1 && m <= 12)), "Invalid date: " + value);
  const days = m ? new Date(Date.UTC(y === 1 ? 2001 : y, m, 0)).getUTCDate() : 31;
  check(d === undefined || (d >= 1 && d <= days), "Invalid calendar date: " + value);
  return [y * 10000 + (m || 1) * 100 + (d || 1), y * 10000 + (m || 12) * 100 + (d || (m ? days : 31))];
}

export function validate(doc) {
  check(object(doc) && doc.schemaVersion === SCHEMA_VERSION, "Unsupported profile schemaVersion");
  check(Number.isSafeInteger(doc.revision) && doc.revision >= 0, "Invalid revision");
  check(timestamp(doc.createdAt) && timestamp(doc.updatedAt), "Invalid store timestamps");
  check(Array.isArray(doc.records), "records must be an array");
  const map = new Map(doc.records.map((r) => [r.id, r]));
  check(map.size === doc.records.length, "Duplicate record ID");
  check(map.get("profile")?.type === "profile" && doc.records.filter((r) => r.type === "profile").length === 1, "Exactly one profile record is required");
  for (const r of doc.records) {
    check(object(r) && recordTypes.includes(r.type), "Unknown record type");
    check(text(r.id) && /^[a-zA-Z0-9_-]+$/.test(r.id), "Invalid record ID");
    check(Object.keys(r).every((k) => common.includes(k) || fields[r.type].includes(k)), "Unknown field in " + r.id);
    check(["private", "anonymized", "public"].includes(r.visibility), "Invalid visibility in " + r.id);
    check(r.publicText === null || text(r.publicText), "Invalid publicText");
    check(r.visibility !== "anonymized" || text(r.publicText), "Anonymized records require approved publicText");
    check(["draft", "confirmed"].includes(r.confirmation), "Invalid confirmation");
    check(r.confirmation === "confirmed" ? timestamp(r.confirmedAt) : r.confirmedAt === null, "Confirmation timestamp mismatch");
    check(Number.isSafeInteger(r.revision) && r.revision >= 0 && r.revision <= doc.revision, "Invalid record revision");
    check(timestamp(r.createdAt) && timestamp(r.updatedAt), "Invalid record timestamps");
    if (r.type === "profile") check(r.name === null || text(r.name), "Invalid profile name");
    if (["context", "story", "evidence", "skill"].includes(r.type)) check(text(r.label), "Record needs a label: " + r.id);
    if (r.type === "context") check(categories.includes(r.category), "Invalid context category");
    if (r.type === "story") check(map.get(r.contextId)?.type === "context", "Story needs an existing context");
    if (r.type === "claim") {
      check(["profile", "context", "story"].includes(map.get(r.subjectId)?.type), "Claim subject must be a profile, context or story");
      check(text(r.field) && text(r.statement) && states.includes(r.answerState), "Invalid claim statement, field or answerState");
      check(object(r.source) && ["self-report", "document", "inference", "calculation"].includes(r.source.kind) && text(r.source.reference), "Claim needs source kind and reference");
      check(Object.keys(r.source).every((k) => ["kind", "reference", "excerpt"].includes(k)), "Unknown source field");
      check(r.source.excerpt === undefined || typeof r.source.excerpt === "string", "Invalid source excerpt");
      check(list(r.evidenceIds) && r.evidenceIds.every((ref) => map.get(ref)?.type === "evidence"), "Invalid evidence reference");
      check(list(r.dependsOn) && r.dependsOn.every((ref) => map.get(ref)?.type === "claim" && ref !== r.id), "Invalid claim dependency");
      check(r.conflict === null || text(r.conflict), "Invalid conflict note");
      check(r.confirmation !== "confirmed" || r.conflict === null, "Resolve conflicts before confirmation");
      if (r.metric !== null) {
        const m = r.metric;
        check(object(m) && ["measured", "estimate", "calculation", "scale", "qualitative"].includes(m.kind) && text(m.basis), "Metric needs a kind and basis");
        check(Object.keys(m).every((k) => ["kind", "value", "unit", "baseline", "period", "basis", "attribution", "uncertainty"].includes(k)), "Unknown metric field");
        check(m.value === null || typeof m.value === "string" || (typeof m.value === "number" && Number.isFinite(m.value)), "Invalid metric value");
        for (const key of ["unit", "period", "attribution", "uncertainty"]) check(m[key] === undefined || m[key] === null || text(m[key]), "Invalid metric " + key);
        check(m.baseline === undefined || m.baseline === null || (typeof m.baseline === "number" && Number.isFinite(m.baseline)), "Invalid metric baseline");
        check(!["measured", "scale", "calculation"].includes(m.kind) || (typeof m.value === "number" && Number.isFinite(m.value) && text(m.unit)), "Measured, scale and calculated metrics need numeric value and unit");
        check(m.kind !== "calculation" || r.dependsOn.length > 0, "Calculations require input claim IDs");
      }
      if (r.dates !== null) {
        const d = r.dates;
        check(object(d) && Object.keys(d).every((k) => ["start", "end", "ongoing", "approximate"].includes(k)), "Invalid date fields");
        check(d.start === null || typeof d.start === "string", "Invalid start date");
        check(d.end === null || typeof d.end === "string", "Invalid end date");
        check([null, true, false].includes(d.ongoing) && typeof d.approximate === "boolean", "Dates require explicit ongoing and approximate values");
        const start = d.start === null ? null : dateBounds(d.start);
        const end = d.end === null ? null : dateBounds(d.end);
        check(!(d.ongoing === true && end), "Ongoing context cannot have an end date");
        check(!(start && end && start[0] > end[1]), "End date precedes start date");
      }
    }
    if (r.type === "evidence") {
      check(["self-report", "artifact", "feedback", "document", "other"].includes(r.kind), "Invalid evidence kind");
      check(["available", "described", "unavailable", "withheld"].includes(r.availability), "Invalid evidence availability");
      for (const key of ["uri", "locator", "version"]) check(r[key] === null || text(r[key]), "Invalid evidence " + key);
      check(r.capturedAt === null || timestamp(r.capturedAt), "Invalid evidence capturedAt");
    }
    if (r.type === "skill") check(list(r.claimIds) && r.claimIds.every((ref) => map.get(ref)?.type === "claim"), "Invalid skill claim reference");
  }
  // Explicit calculation dependencies must be acyclic.
  const visiting = new Set(), visited = new Set();
  function visit(r) {
    if (visited.has(r.id)) return;
    check(!visiting.has(r.id), "Cyclic claim dependencies");
    visiting.add(r.id);
    for (const ref of r.dependsOn) visit(map.get(ref));
    visiting.delete(r.id); visited.add(r.id);
  }
  for (const r of doc.records.filter((r) => r.type === "claim")) visit(r);
  const s = doc.session;
  check(object(s) && ["active", "paused"].includes(s.status) && steps.includes(s.step), "Invalid session");
  check(s.contextId === null || map.get(s.contextId)?.type === "context", "Invalid session context");
  check(s.storyId === null || map.get(s.storyId)?.type === "story", "Invalid session story");
  check(s.correctionId === null || ["claim", "context"].includes(map.get(s.correctionId)?.type), "Invalid correction target");
  check(Array.isArray(s.answers) && Array.isArray(s.deferred), "Invalid session answers/deferred");
  if (s.currentQuestion) validateQuestion(s.currentQuestion, doc);
  for (const q of s.deferred) validateQuestion(q, doc);
  check(Array.isArray(doc.history) && doc.history.length === doc.revision, "Revision history mismatch");
  for (const [i, h] of doc.history.entries()) {
    check(h.revision === i + 1 && timestamp(h.at) && text(h.reason) && Array.isArray(h.records), "Invalid revision history");
  }
  return doc;
}

function defaults(type) {
  return ({
    profile: { name: null },
    context: { label: "", category: "other" },
    story: { label: "", contextId: null },
    claim: { subjectId: null, field: "", statement: "", answerState: "provided", source: null, evidenceIds: [], dependsOn: [], metric: null, dates: null, conflict: null },
    evidence: { label: "", kind: "other", uri: null, locator: null, capturedAt: null, version: null, availability: "described" },
    skill: { label: "", claimIds: [] },
  })[type];
}

export function makeRecord(type, data, revision, at) {
  check(recordTypes.includes(type), "Unknown record type");
  return { ...defaults(type), visibility: "private", publicText: null, confirmation: "draft", confirmedAt: null, ...data, type, revision, createdAt: at, updatedAt: at };
}
export function createProfile(at = new Date().toISOString()) {
  return validate({
    schemaVersion: SCHEMA_VERSION, revision: 0, createdAt: at, updatedAt: at,
    records: [makeRecord("profile", { id: "profile" }, 0, at)],
    session: { status: "active", step: "direction", contextId: null, storyId: null, correctionId: null, currentQuestion: null, deferred: [], answers: [] },
    history: [],
  });
}

function dependents(doc, changed) {
  const ids = new Set(changed);
  let again = true;
  while (again) {
    again = false;
    for (const r of doc.records) {
      const related = ["story", "context"].includes(r.type) ? [r.contextId, ...doc.records.filter((c) => c.type === "claim" && c.subjectId === r.id).map((c) => c.id)]
        : r.type === "claim" ? [r.subjectId, ...r.dependsOn, ...r.evidenceIds]
        : r.type === "skill" ? r.claimIds : [];
      if (!ids.has(r.id) && related.some((ref) => ids.has(ref))) { ids.add(r.id); again = true; }
    }
  }
  return ids;
}

export function transact(original, reason, change, at = new Date().toISOString()) {
  validate(original);
  check(text(reason), "A change reason is required");
  const doc = structuredClone(original);
  change(doc, at);
  // Detect actual record edits, including operations that mutate an object in place.
  const before = new Map(original.records.map((r) => [r.id, r]));
  const changed = doc.records.filter((r) => JSON.stringify(r) !== JSON.stringify(before.get(r.id)));
  const revision = original.revision + 1;
  for (const r of changed) { r.revision = revision; r.updatedAt = at; }
  doc.revision = revision; doc.updatedAt = at;
  doc.history.push({
    revision, at, reason,
    records: [
      ...changed.map((r) => ({ id: r.id, before: before.get(r.id) || null, after: structuredClone(r) })),
      ...original.records.filter((r) => !doc.records.some((next) => next.id === r.id))
        .map((r) => ({ id: r.id, before: structuredClone(r), after: null })),
    ],
    sessionBefore: structuredClone(original.session),
    sessionAfter: structuredClone(doc.session),
  });
  return validate(doc);
}

export function patchRecords(doc, entries, at) {
  check(Array.isArray(entries) && entries.length > 0, "upsert must contain records");
  check(new Set(entries.map((r) => r.id)).size === entries.length, "Duplicate patch ID");
  const changed = [];
  for (const data of entries) {
    check(object(data) && text(data.id), "Every patch needs an ID");
    const existing = doc.records.find((r) => r.id === data.id);
    const type = data.type || existing?.type;
    check(recordTypes.includes(type), "New records need a type");
    check(!existing || type === existing.type, "Record type is immutable");
    check(Object.keys(data).every((k) => ["id", "type", "visibility", "publicText", ...fields[type]].includes(k)), "Patch contains managed or unknown fields");
    const next = existing ? { ...existing, ...data } : makeRecord(type, data, doc.revision + 1, at);
    if (JSON.stringify(next) === JSON.stringify(existing)) continue;
    next.confirmation = "draft"; next.confirmedAt = null;
    if (existing) doc.records[doc.records.indexOf(existing)] = next; else doc.records.push(next);
    changed.push(next.id);
  }
  const affected = dependents(doc, changed);
  for (const r of doc.records) {
    if (affected.has(r.id)) { r.confirmation = "draft"; r.confirmedAt = null; }
  }
  return changed;
}

export function confirm(doc, recordId, at) {
  const r = doc.records.find((r) => r.id === recordId);
  check(r, "Unknown record ID");
  const group = r.type === "story" || r.type === "context"
    ? [r, ...doc.records.filter((c) => c.type === "claim" && c.subjectId === r.id)] : [r];
  check(group.every((c) => c.type !== "claim" || c.conflict === null), "Resolve conflicts before confirmation");
  for (const item of group) { item.confirmation = "confirmed"; item.confirmedAt = at; }
}

function validateQuestion(q, doc) {
  check(object(q) && text(q.id) && text(q.text) && text(q.field), "Question needs id, text and field");
  check(["guided", "custom"].includes(q.mode) && steps.includes(q.step), "Invalid question mode/step");
  check(text(q.subjectId), "Question needs subjectId");
  check(q.mode !== "custom" || doc.records.some((r) => r.id === q.subjectId && ["profile", "context", "story"].includes(r.type)), "Custom question needs existing subject");
}
export function summary(doc, subjectId) {
  const story = doc.records.find((r) => r.id === subjectId);
  const context = story?.type === "story" ? doc.records.find((r) => r.id === story.contextId) : story;
  const ids = new Set([subjectId, context?.id]);
  const claims = doc.records.filter((r) => r.type === "claim" && ids.has(r.subjectId));
  const lastReview = doc.history.findLast((h) => h.records.some((r) => r.id === subjectId && r.after?.confirmation === "confirmed"))?.revision || 0;
  const corrections = doc.history.filter((h) => h.revision > lastReview).flatMap((h) => h.records
    .filter((r) => r.before && r.after?.type === "claim" && ids.has(r.after.subjectId) && r.before.statement !== r.after.statement)
    .map((r) => ({
      revision: h.revision, claimId: r.id, previous: r.before.statement, current: r.after.statement,
      checkRelatedClaimIds: claims.filter((claim) => claim.id !== r.id).map((claim) => claim.id),
    })));
  return {
    subject: story, context,
    claims,
    needsConsistencyReview: corrections.length > 0,
    corrections,
    ...(corrections.length ? { reviewNotice: "A statement was corrected. Check the other claims for the old account before confirming. The tool highlights related claims; it does not detect contradictions in natural language." } : {}),
  };
}

export function nextQuestion(doc) {
  check(doc.session.status === "active", "Session paused; use resume");
  if (doc.session.currentQuestion) return doc.session.currentQuestion;
  const s = doc.session;
  const correction = doc.records.find((r) => r.id === s.correctionId);
  const reviewNotice = s.step === "review" && summary(doc, s.storyId).needsConsistencyReview
    ? "A statement was corrected. Check the other saved claims for the old account as well. " : "";
  const prompts = {
    direction: ["profile", "direction", "What kinds of roles or work are you considering? Undecided is a useful answer."],
    "context-label": [id("context"), "label", "Name one work, learning, community or self-directed setting to include in your history. Paid work is only one option."],
    "context-kind": [s.contextId, "category", "What kind of setting is this? employment / education / volunteering / open-source / personal / caregiving / other"],
    "context-role": [s.contextId, "role", "What was your role or personal responsibility in this setting? Keep an official title separate from how you describe the work."],
    "context-period": [s.contextId, "period", "Approximately when were you involved? Use the precision you remember; say explicitly if it is still ongoing."],
    "inventory-next": ["profile", "continue", "Add another setting before going deeper? context (another setting), story (choose an episode), or done (pause)."],
    "choose-context": ["profile", "select-context", "Which setting should we explore? Enter its number or ID: " + doc.records.filter((r) => r.type === "context").map((r, i) => (i + 1) + ": " + r.label + " [" + r.id + "]").join("; ")],
    "story-situation": [id("story"), "situation", "Recall one specific episode from this setting. What was happening and what needed attention?"],
    "story-actions": [s.storyId, "own-actions", "What did you personally do in that episode?"],
    "story-others": [s.storyId, "others-actions", "Which parts were handled by other people?"],
    "story-decision": [s.storyId, "decision", "Which decision or tradeoff best shows your judgment?"],
    "story-outcome": [s.storyId, "outcome", "What happened after your work was used, including anything unchanged or unfinished? Numbers are optional."],
    "story-support": [s.storyId, "support", "What observation, feedback or artifact supports that account? It is fine if no artifact is available; describe sources without uploading confidential material."],
    "story-reflection": [s.storyId, "reflection", "What did you learn or what would you change next time?"],
    review: [s.storyId, "review", reviewNotice + "Read the saved account above. Is it accurate, including ownership boundaries and unknowns? yes / revise / defer"],
    "revise-field": [s.storyId, "select-claim", "Which part should change? Enter a number or ID: " + revisionChoices(doc).map((r, i) => (i + 1) + ": " + (r.type === "context" ? "setting name: " + r.label : r.field + ": " + r.statement) + " [" + r.id + "]").join("; ")],
    "revise-answer": [correction?.subjectId || correction?.id, "correction", "What should this say instead? Previous account: " + (correction?.statement || correction?.label)],
    continue: ["profile", "continue", "Where next? story (same setting), context (another setting), or done (pause here)."],
  };
  const [subjectId, field, prompt] = prompts[s.step];
  return { id: id("question"), subjectId, field, text: prompt, mode: "guided", step: s.step };
}

export function ask(doc, input) {
  check(doc.session.status === "active", "Session paused; use resume");
  check(!doc.session.currentQuestion, "Answer or skip the current question before asking another");
  const q = { ...input, id: id("question"), mode: "custom", step: doc.session.step };
  validateQuestion(q, doc);
  doc.session.currentQuestion = q;
  return q;
}

function advance(s, step, skipped = false) {
  if (step === "context-label" && skipped) s.step = "continue";
  else if (step === "story-situation" && skipped) s.step = "continue";
  else if (["inventory-next", "choose-context"].includes(step) && skipped) s.step = "continue";
  else if (step === "review") s.step = "continue";
  else if (["revise-field", "revise-answer"].includes(step)) { s.step = "review"; s.correctionId = null; }
  else s.step = steps[steps.indexOf(step) + 1] || "continue";
}

function revisionChoices(doc) {
  const ids = new Set([doc.session.storyId, doc.session.contextId]);
  return doc.records.filter((r) => (r.type === "context" && ids.has(r.id)) || (r.type === "claim" && ids.has(r.subjectId)));
}

export function answer(doc, { questionId, text: response, state = "provided" }, at) {
  const s = doc.session, q = s.currentQuestion;
  check(s.status === "active" && q && q.id === questionId, "Question changed or missing; read next again");
  check(text(response) && states.includes(state), "Answer needs nonempty text and valid state");
  const raw = response.trim(), value = raw.toLowerCase();
  const answerId = id("answer");
  const patches = [];
  if (q.mode === "guided" && q.step === "revise-answer") {
    const target = doc.records.find((r) => r.id === s.correctionId);
    check(target, "Correction target missing");
    patches.push(target.type === "context" ? { id: target.id, label: raw } : {
      id: target.id, statement: raw, answerState: state,
      source: { kind: "self-report", reference: answerId }, metric: null, dates: null, evidenceIds: [], dependsOn: [], conflict: null,
    });
  } else if (q.mode === "custom" || !["label", "category", "review", "continue", "select-context", "select-claim"].includes(q.field)) {
    if (q.mode === "guided" && q.step === "story-situation") {
      check(s.contextId, "Choose a context first");
      patches.push({ id: q.subjectId, type: "story", label: "Episode in " + doc.records.find((r) => r.id === s.contextId).label, contextId: s.contextId });
      s.storyId = q.subjectId;
    }
    patches.push({
      id: id("claim"), type: "claim", subjectId: q.subjectId, field: q.field,
      statement: raw, answerState: state, source: { kind: "self-report", reference: answerId },
    });
  } else if (q.step === "context-label") {
    check(state === "provided", "Provide a context name, or skip");
    patches.push({ id: q.subjectId, type: "context", label: raw, category: "other" });
    s.contextId = q.subjectId; s.storyId = null;
  } else if (q.step === "context-kind") {
    check(categories.includes(value), "Choose one of the listed context categories, or skip");
    patches.push({ id: q.subjectId, category: value });
  } else if (q.step === "review") {
    check(["yes", "confirm", "revise", "no", "defer"].includes(value), "Answer yes, revise or defer");
    if (["yes", "confirm"].includes(value)) { confirm(doc, q.subjectId, at); confirm(doc, s.contextId, at); }
    else if (value === "defer") s.deferred.push(q);
    else s.step = "revise-field";
  } else if (q.step === "revise-field") {
    const choices = revisionChoices(doc);
    const selected = choices.find((r) => r.id === raw) || (/^\d+$/.test(raw) ? choices[Number(raw) - 1] : null);
    check(selected, "Choose a listed part number or ID");
    s.correctionId = selected.id; s.step = "revise-answer";
  } else if (q.step === "choose-context") {
    const contexts = doc.records.filter((r) => r.type === "context");
    const selected = contexts.find((r) => r.id === raw) || (/^\d+$/.test(raw) ? contexts[Number(raw) - 1] : null);
    check(selected, "Choose a listed context number or ID");
    s.contextId = selected.id; s.storyId = null; s.step = "story-situation";
  } else if (["continue", "inventory-next"].includes(q.step)) {
    check(["story", "context", "done"].includes(value), "Choose story, context or done");
    check(value !== "story" || s.contextId, "Add a context first");
    if (value === "done") s.status = "paused";
    else s.step = value === "story" ? "choose-context" : "context-label";
  }
  if (patches.length) patchRecords(doc, patches, at);
  s.answers.push({ id: answerId, question: q, text: raw, state, at });
  s.currentQuestion = null;
  if (q.mode === "guided" && !["continue", "inventory-next", "choose-context", "revise-field"].includes(q.step) && !(q.step === "review" && ["revise", "no"].includes(value))) advance(s, q.step);
}

export function skip(doc) {
  const s = doc.session, q = s.currentQuestion;
  check(q && s.status === "active", "No active question to skip");
  s.deferred.push(q); s.currentQuestion = null;
  if (q.mode === "guided") advance(s, q.step, true);
}
export function revisit(doc, questionId) {
  const s = doc.session;
  check(s.status === "active" && !s.currentQuestion, "Resume and finish/skip the current question first");
  const index = s.deferred.findIndex((q) => q.id === questionId);
  check(index >= 0, "Unknown deferred question");
  const [q] = s.deferred.splice(index, 1);
  // Revisits must not move the guided cursor backwards or replace the active context.
  check(doc.records.some((r) => r.id === q.subjectId), "This question had no saved subject; start a new context or story instead");
  check(!["label", "category", "review", "continue", "select-context", "select-claim", "correction"].includes(q.field), "Use apply/confirm or start a new context/story for this deferred control question");
  s.currentQuestion = { ...q, mode: "custom", step: s.step };
}
