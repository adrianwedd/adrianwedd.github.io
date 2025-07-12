import yaml
import jsonschema
import sys

def validate_tasks(file_path="tasks.yml"):
    """Validate task phases against the schema embedded in the YAML file."""
    # ``file_path`` allows running validation on a custom tasks file
    try:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)

        if 'jsonschema' not in data:
            print(f"Error: 'jsonschema' key not found in {file_path}")
            sys.exit(1)

        if 'phases' not in data:
            print(f"Error: 'phases' key not found in {file_path}")
            sys.exit(1)

        schema_str = data['jsonschema']
        schema = yaml.safe_load(schema_str)
        tasks = data['phases']

        jsonschema.validate(instance=tasks, schema=schema)
        print(f"Successfully validated {len(tasks)} tasks in {file_path}.")

    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML in {file_path}: {e}")
        sys.exit(1)
    except jsonschema.ValidationError as e:
        print(f"Validation error in {file_path}: {e.message}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    validate_tasks()
