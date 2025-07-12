import fs from 'fs/promises';
import { resolve4, resolveCname } from 'dns/promises';
import { pathToFileURL } from 'url';
import { log } from './utils/logger.mjs';

const GITHUB_IPS = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
];

async function getDomain() {
  const data = await fs.readFile('CNAME', 'utf8');
  return data.trim();
}

async function lookupA(domain) {
  try {
    return await resolve4(domain);
  } catch {
    return [];
  }
}

async function lookupCNAME(domain) {
  try {
    return await resolveCname(domain);
  } catch {
    return [];
  }
}

function isGitHubA(records) {
  return records.some((ip) => GITHUB_IPS.includes(ip));
}

function isGitHubCNAME(records) {
  return records.some((cname) => cname.endsWith('.github.io'));
}

async function main() {
  const domain = await getDomain();
  const aRecords = await lookupA(domain);
  const cnameRecords = await lookupCNAME(domain);

  const ok = isGitHubA(aRecords) || isGitHubCNAME(cnameRecords);

  if (ok) {
    log.info(`DNS PASS for ${domain}`);
  } else {
    log.error(`DNS FAIL for ${domain}`);
    if (aRecords.length) log.error('A records:', aRecords.join(', '));
    if (cnameRecords.length) log.error('CNAME records:', cnameRecords.join(', '));
  }
}

export {
  getDomain,
  lookupA,
  lookupCNAME,
  isGitHubA,
  isGitHubCNAME,
  main,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('check-dns main error:', err);
    process.exit(1);
  });
}
