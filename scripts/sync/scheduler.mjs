import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const shellQuote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const systemdQuote = value => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%') + '"';
export function scheduleFiles(home, config, platform = process.platform, userHome = os.homedir()) {
  const id = 't3-skills-' + createHash('sha256').update(home).digest('hex').slice(0, 12);
  const runner = path.join(home, 'runner.mjs');
  if (platform === 'win32') {
    const launch = path.join(home, 'run-hidden.vbs');
    const command = `"${config.node}" "${runner}" --home "${home}"`;
    const vbs = `Set shell = CreateObject("WScript.Shell")\nresult = shell.Run("${command.replaceAll('"', '""')}", 0, True)\nWScript.Quit result\n`;
    const start = new Date(Date.now() + 60000).toISOString();
    const definition = `<?xml version="1.0" encoding="UTF-16"?><Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><TimeTrigger><Repetition><Interval>PT${config.interval}M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${start}</StartBoundary><Enabled>true</Enabled></TimeTrigger><LogonTrigger><Enabled>true</Enabled><UserId>${xml(config.windowsUser)}</UserId></LogonTrigger></Triggers><Principals><Principal id="Author"><UserId>${xml(config.windowsUser)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT5M</ExecutionTimeLimit><Hidden>true</Hidden></Settings><Actions Context="Author"><Exec><Command>${xml(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe'))}</Command><Arguments>"${xml(launch)}"</Arguments><WorkingDirectory>${xml(home)}</WorkingDirectory></Exec></Actions></Task>`;
    return { id, kind: 'windows', files: [[launch, vbs], [path.join(home, 'task.xml'), definition]] };
  }
  if (platform === 'darwin') {
    const args = [config.node, runner, '--home', home].map(a => `<string>${xml(a)}</string>`).join('');
    const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${id}</string><key>ProgramArguments</key><array>${args}</array><key>RunAtLoad</key><true/><key>StartInterval</key><integer>${config.interval * 60}</integer><key>StandardOutPath</key><string>${xml(path.join(home, 'scheduler.log'))}</string><key>StandardErrorPath</key><string>${xml(path.join(home, 'scheduler-error.log'))}</string></dict></plist>`;
    return { id, kind: 'launchd', files: [[path.join(userHome, 'Library', 'LaunchAgents', `${id}.plist`), plist]] };
  }
  if (platform !== 'linux') throw Error(`Automatic scheduling is unsupported on ${platform}; run sync from your OS scheduler`);
  const command = [config.node, runner, '--home', home].map(systemdQuote).join(' ');
  return { id, kind: 'systemd', files: [
    [path.join(userHome, '.config', 'systemd', 'user', `${id}.service`), `[Unit]\nDescription=Personal skills sync\n[Service]\nType=oneshot\nExecStart=${command}\n`],
    [path.join(userHome, '.config', 'systemd', 'user', `${id}.timer`), `[Unit]\nDescription=Update personal skills periodically\n[Timer]\nOnStartupSec=30s\nOnUnitActiveSec=${config.interval}min\nPersistent=true\n[Install]\nWantedBy=timers.target\n`],
  ] };
}

const run = (exe, args, input) => {
  const r = spawnSync(exe, args, { input, encoding: 'utf8', windowsHide: true, timeout: 20000 });
  if (r.status !== 0) throw Error(r.error?.message || r.stderr || `${exe} failed`);
  return r.stdout;
};

export function registerSchedule(home, config, requested = 'auto') {
  if (!['auto', 'cron'].includes(requested)) throw Error('Scheduler must be auto or cron');
  let spec = scheduleFiles(home, config);
  if (process.platform === 'linux' || requested === 'cron') {
    const systemd = spawnSync('systemctl', ['--user', 'show-environment'], { encoding: 'utf8', timeout: 10000 });
    if (requested === 'cron' || (requested === 'auto' && systemd.status !== 0)) {
      if (60 % config.interval !== 0) throw Error('Cron interval must divide 60 minutes');
      const marker = `# ${spec.id}`;
      const old = spawnSync('crontab', ['-l'], { encoding: 'utf8', timeout: 10000 });
      if (old.error || (old.status !== 0 && !/no crontab/i.test(old.stderr))) throw Error(old.error?.message || old.stderr || 'Cannot read existing crontab');
      const lines = old.status === 0 ? old.stdout.split('\n').filter(line => !line.endsWith(marker)) : [];
      const command = [config.node, path.join(home, 'runner.mjs'), '--home', home].map(shellQuote).join(' ').replaceAll('%', '\\%');
      const frequency = config.interval === 60 ? '0' : `*/${config.interval}`;
      lines.push(`${frequency} * * * * ${command} >> ${shellQuote(path.join(home, 'scheduler.log')).replaceAll('%', '\\%')} 2>&1 ${marker}`, `@reboot ${command} ${marker}`);
      run('crontab', ['-'], lines.filter(Boolean).join('\n') + '\n');
      return { id: spec.id, kind: 'cron' };
    }
    if (systemd.status !== 0) throw Error('No user systemd manager; use --scheduler cron');
  }
  for (const [file, text] of spec.files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, spec.kind === 'windows' && file.endsWith('.xml') ? '\uFEFF' + text : text,
      { mode: 0o600, encoding: spec.kind === 'windows' && file.endsWith('.xml') ? 'utf16le' : 'utf8' });
  }
  if (spec.kind === 'windows') run('schtasks.exe', ['/Create', '/TN', spec.id, '/XML', path.join(home, 'task.xml'), '/F']);
  else if (spec.kind === 'launchd') {
    const domain = `gui/${os.userInfo().uid}`;
    spawnSync('launchctl', ['bootout', `${domain}/${spec.id}`], { encoding: 'utf8', timeout: 10000 });
    run('launchctl', ['bootstrap', domain, spec.files[0][0]]);
  } else { run('systemctl', ['--user', 'daemon-reload']); run('systemctl', ['--user', 'enable', '--now', `${spec.id}.timer`]); }
  return { id: spec.id, kind: spec.kind };
}

export function removeSchedule(home, config) {
  const schedule = config.schedule;
  if (!schedule) return;
  if (schedule.kind === 'windows') run('schtasks.exe', ['/Delete', '/TN', schedule.id, '/F']);
  else if (schedule.kind === 'launchd') {
    run('launchctl', ['bootout', `gui/${os.userInfo().uid}/${schedule.id}`]);
    const file = scheduleFiles(home, config).files[0][0];
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  else if (schedule.kind === 'systemd') run('systemctl', ['--user', 'disable', '--now', `${schedule.id}.timer`]);
  else if (schedule.kind === 'cron') {
    const old = run('crontab', ['-l']);
    run('crontab', ['-'], old.split('\n').filter(line => !line.endsWith(`# ${schedule.id}`)).join('\n').trimEnd() + '\n');
  }
}
