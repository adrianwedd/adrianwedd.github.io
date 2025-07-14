import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import yaml from 'yaml';
import Ajv from 'ajv';

export async function validateTasks(filePath = 'tasks.yml') {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const doc = yaml.parse(data);
    if (!doc.jsonschema) {
      console.error(`Error: 'jsonschema' key not found in ${filePath}`);
      process.exitCode = 1;
      return;
    }
    if (!doc.phases) {
      console.error(`Error: 'phases' key not found in ${filePath}`);
      process.exitCode = 1;
      return;
    }
    const schema = yaml.parse(doc.jsonschema);
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    if (!validate(doc.phases)) {
      console.error(
        `Validation error in ${filePath}: ${ajv.errorsText(validate.errors)}`
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `Successfully validated ${doc.phases.length} tasks in ${filePath}.`
    );
  } catch (err) {
    console.error(`An unexpected error occurred: ${err.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argPath = process.argv[2] || 'tasks.yml';
  validateTasks(argPath);
}
