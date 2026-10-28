import path from 'node:path';
import { pathToFileURL } from 'node:url';

const cli = process.env.CAREER_DASHBOARD_CLI;
if (!cli) {
  const message = 'Career dashboard commands require the separately installed career-dashboard app. Set CAREER_DASHBOARD_CLI to the absolute path of its cli.mjs. The interview commands in profile.mjs work without it.';
  if (!process.argv[2] || process.argv[2] === 'help') console.log(message);
  else { console.error(message); process.exitCode = 1; }
} else if (!path.isAbsolute(cli)) {
  console.error('CAREER_DASHBOARD_CLI must be an absolute path to the separately installed cli.mjs.');
  process.exitCode = 1;
} else {
  try {
    const { main } = await import(pathToFileURL(cli).href);
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
