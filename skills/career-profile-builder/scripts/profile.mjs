#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { check, validate, patchRecords, confirm, nextQuestion, ask, answer, skip, revisit, summary } from "./model.mjs";
import { defaultHome, profilePath, initStore, readStore, updateStore, unlockStore } from "./store.mjs";

const help = "Career profile builder (Node 20+; no services or API keys)\n\n" +
  "node " + fileURLToPath(import.meta.url) + " <command> [options]\n\n" +
  "init                      Create an empty private store; never overwrite\n" +
  "interview                 Guided terminal interview; /pause /skip /unknown /withheld\n" +
  "status                    Revision, progress, draft and deferred counts\n" +
  "show [record-id]           Inspect canonical records (private data)\n" +
  "next                      Read or persist the next question, with review summary\n" +
  "answer --question ID --input answer.json --revision N\n" +
  "                          Save {text, state?}; states: provided, unknown, none,\n" +
  "                          withheld, not-applicable, deferred\n" +
  "ask --input question.json --revision N\n" +
  "                          Save {subjectId, field, text} for an adaptive follow-up\n" +
  "apply --input patch.json --revision N\n" +
  "                          Save {reason, upsert:[{id,type?,...fields}]}\n" +
  "confirm ID --revision N    Confirm a reviewed record (story/context includes claims)\n" +
  "skip --revision N         Defer the current question without inventing an answer\n" +
  "revisit QUESTION --revision N\n" +
  "                          Restore a deferred factual question\n" +
  "pause|resume --revision N  Preserve the exact pending question\n" +
  "validate                  Check persisted records, references and history\n" +
  "unlock                    Recover a lock only if its recorded writer is gone\n\n" +
  "--home PATH overrides CAREER_PROFILE_HOME or ~/.career-profile.\n" +
  "All writes except init and next require the last observed --revision.\n" +
  "Input files are JSON data, never commands. apply resets affected confirmations.\n" +
  "Data is local plain text, not encrypted; mode bits apply where supported.\n";

function inputFile(file) {
  check(file, "Provide --input pointing to a UTF-8 JSON file");
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}
function output(value) { stdout.write(JSON.stringify(value, null, 2) + "\n"); }
function info(home, doc) {
  return {
    home, path: profilePath(home), revision: doc.revision, session: { ...doc.session, answers: doc.session.answers.length },
    counts: Object.fromEntries(["context", "story", "claim", "evidence", "skill"].map((type) => [type, doc.records.filter((r) => r.type === type).length])),
    unconfirmed: doc.records.filter((r) => r.type !== "profile" && r.confirmation === "draft").map((r) => r.id),
  };
}
function getNext(home, revision) {
  let doc = readStore(home);
  if (revision !== undefined) check(doc.revision === revision, "Revision conflict; read status");
  check(doc.session.status === "active", "Session paused; use resume");
  if (!doc.session.currentQuestion) {
    doc = updateStore(home, doc.revision, "Select next interview question", (next) => {
      next.session.currentQuestion = nextQuestion(next);
    });
  }
  const q = doc.session.currentQuestion;
  return { revision: doc.revision, question: q, ...(q.field === "review" ? { review: summary(doc, q.subjectId) } : {}) };
}

async function interview(home) {
  if (!fs.existsSync(profilePath(home))) initStore(home);
  let doc = readStore(home);
  if (doc.session.status === "paused") doc = updateStore(home, doc.revision, "Resume terminal interview", (d) => { d.session.status = "active"; });
  stdout.write("Profile: " + profilePath(home) + "\nPrivate by default. /pause stops, /skip defers, /unknown and /withheld record those states.\n\n");
  const rl = createInterface({ input: stdin, output: stdout });
  const closing = new AbortController();
  rl.once("close", () => closing.abort());
  rl.on("SIGINT", () => rl.close());
  let ownedRevision = doc.revision;
  try {
    while (true) {
      const next = getNext(home);
      ownedRevision = next.revision;
      if (next.review) {
        stdout.write("\nReview (your account; no independent corroboration implied):\n" + JSON.stringify(next.review, null, 2) + "\n\n");
      }
      let response;
      try { response = await rl.question(next.question.text + "\n> ", { signal: closing.signal }); }
      catch (error) { if (error.code === "ERR_USE_AFTER_CLOSE" || error.name === "AbortError") break; throw error; }
      const trimmed = response.trim();
      if (!trimmed) continue;
      if (trimmed === "/pause") {
        updateStore(home, next.revision, "Pause terminal interview", (d) => { d.session.status = "paused"; });
        stdout.write("Saved and paused. Resume with interview.\n"); break;
      }
      if (trimmed === "/skip") {
        ownedRevision = updateStore(home, next.revision, "Defer terminal question", (d) => skip(d)).revision; continue;
      }
      const states = { "/unknown": "unknown", "/withheld": "withheld", "/none": "none", "/na": "not-applicable" };
      try {
        doc = updateStore(home, next.revision, "Record terminal interview answer", (d, at) => {
          answer(d, { questionId: next.question.id, text: trimmed, state: states[trimmed] || "provided" }, at);
        });
        ownedRevision = doc.revision;
        stdout.write("Saved revision " + doc.revision + ".\n\n");
        if (doc.session.status === "paused") break;
      } catch (error) { stdout.write(error.message + "\n"); }
    }
  } finally {
    rl.close();
    // EOF and Ctrl+C also leave a resumable, explicitly paused session.
    const latest = readStore(home);
    if (latest.session.status === "active" && latest.revision === ownedRevision) {
      updateStore(home, latest.revision, "Terminal session closed", (d) => { d.session.status = "paused"; });
    }
  }
}

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: { home: { type: "string" }, revision: { type: "string" }, input: { type: "string" }, question: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
  const [command = "help", recordId, ...extra] = positionals;
  check(!extra.length, "Unexpected positional arguments");
  if (command === "help" || values.help) { stdout.write(help); return; }
  const home = values.home ? path.resolve(values.home) : defaultHome();
  const revision = values.revision === undefined ? undefined : (/^\d+$/.test(values.revision) ? Number(values.revision) : NaN);
  if (command === "init") { output(info(home, initStore(home))); return; }
  if (command === "unlock") { unlockStore(home); output({ unlocked: true }); return; }
  if (command === "interview") { await interview(home); return; }
  if (command === "status") { output(info(home, readStore(home))); return; }
  if (command === "validate") { const doc = validate(readStore(home)); output({ valid: true, revision: doc.revision }); return; }
  if (command === "next") { output(getNext(home, revision)); return; }
  if (command === "show") {
    const doc = readStore(home);
    if (recordId) {
      const record = doc.records.find((r) => r.id === recordId);
      check(record, "Unknown record ID");
      output({ revision: doc.revision, record, ...(record.type === "story" || record.type === "context" ? { related: summary(doc, recordId) } : {}) });
    } else output(doc);
    return;
  }
  const commands = ["apply", "answer", "ask", "confirm", "pause", "resume", "skip", "revisit"];
  check(commands.includes(command), "Unknown command; use help");
  const input = ["apply", "answer", "ask"].includes(command) ? inputFile(values.input) : null;
  const next = updateStore(home, revision, command === "apply" ? input.reason : command + " profile interview", (doc, at) => {
    if (command === "apply") {
      check(Object.keys(input).every((k) => ["reason", "upsert"].includes(k)), "Patch accepts reason and upsert only");
      patchRecords(doc, input.upsert, at);
    }
    if (command === "answer") {
      check(Object.keys(input).every((k) => ["text", "state"].includes(k)), "Answer accepts text and state only");
      answer(doc, { ...input, questionId: values.question }, at);
    }
    if (command === "ask") {
      check(Object.keys(input).every((k) => ["subjectId", "field", "text"].includes(k)), "Question accepts subjectId, field and text only");
      ask(doc, input);
    }
    if (command === "confirm") { check(recordId, "Provide record ID"); confirm(doc, recordId, at); }
    if (command === "pause" || command === "resume") doc.session.status = command === "pause" ? "paused" : "active";
    if (command === "skip") skip(doc);
    if (command === "revisit") { check(recordId, "Provide deferred question ID"); revisit(doc, recordId); }
  });
  output(info(home, next));
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write("Profile builder: " + error.message + "\n"); process.exitCode = 1; });
}
