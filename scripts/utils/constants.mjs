import path from 'path';

export const CONTENT_DIR = 'content';
export const PUBLIC_DIR = 'public';

export const INBOX_DIR = path.join(CONTENT_DIR, 'inbox');
export const INBOX_FAILED_DIR = path.join(INBOX_DIR, 'failed');
export const UNTAGGED_DIR = path.join(CONTENT_DIR, 'untagged');
export const TOOLS_DIR = path.join(CONTENT_DIR, 'tools');
export const AGENTS_DIR = path.join(CONTENT_DIR, 'agents');
export const INSIGHTS_FAILED_DIR = path.join(CONTENT_DIR, 'insights-failed');
