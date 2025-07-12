import fsPromises from 'fs/promises';
import fs from 'fs';
import { log } from './logger.mjs';

// Wrapper around fs.readFile with logging
export async function readFile(filePath, encoding = 'utf8') {
  try {
    return await fsPromises.readFile(filePath, encoding);
  } catch (err) {
    log.error(`Error reading file ${filePath}:`, err.message);
    throw err;
  }
}

// Read a file as a stream and resolve with its contents
export async function readFileStream(filePath, encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    let data = '';
    const stream = fs.createReadStream(filePath, { encoding });
    stream.on('data', (chunk) => {
      data += chunk;
    });
    stream.on('end', () => resolve(data));
    stream.on('error', (err) => {
      log.error(`Error reading file ${filePath}:`, err.message);
      reject(err);
    });
  });
}

// Write a file and log any errors
export async function writeFile(filePath, data, encoding = 'utf8') {
  try {
    await fsPromises.writeFile(filePath, data, encoding);
  } catch (err) {
    log.error(`Error writing file ${filePath}:`, err.message);
    throw err;
  }
}

// Create a directory recursively by default
export async function mkdir(dirPath, options = { recursive: true }) {
  try {
    await fsPromises.mkdir(dirPath, options);
  } catch (err) {
    log.error(`Error creating directory ${dirPath}:`, err.message);
    throw err;
  }
}

// Read directory contents with optional fs options
export async function readdir(dirPath, options) {
  try {
    return await fsPromises.readdir(dirPath, options);
  } catch (err) {
    log.error(`Error reading directory ${dirPath}:`, err.message);
    throw err;
  }
}

// Rename a file and log failures
export async function rename(oldPath, newPath) {
  try {
    await fsPromises.rename(oldPath, newPath);
  } catch (err) {
    log.error(
      `Error renaming file from ${oldPath} to ${newPath}:`,
      err.message
    );
    throw err;
  }
}
