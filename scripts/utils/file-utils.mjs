import fs from 'fs/promises';
import { log } from './logger.mjs';

export async function readFile(filePath, encoding = 'utf8') {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (err) {
    log.error(`Error reading file ${filePath}:`, err.message);
    throw err;
  }
}

export async function writeFile(filePath, data, encoding = 'utf8') {
  try {
    await fs.writeFile(filePath, data, encoding);
  } catch (err) {
    log.error(`Error writing file ${filePath}:`, err.message);
    throw err;
  }
}

export async function mkdir(dirPath, options = { recursive: true }) {
  try {
    await fs.mkdir(dirPath, options);
  } catch (err) {
    log.error(`Error creating directory ${dirPath}:`, err.message);
    throw err;
  }
}

export async function readdir(dirPath, options) {
  try {
    return await fs.readdir(dirPath, options);
  } catch (err) {
    log.error(`Error reading directory ${dirPath}:`, err.message);
    throw err;
  }
}

export async function rename(oldPath, newPath) {
  try {
    await fs.rename(oldPath, newPath);
  } catch (err) {
    log.error(`Error renaming file from ${oldPath} to ${newPath}:`, err.message);
    throw err;
  }
}