#!/usr/bin/env python3
"""
Parse ESLint output to extract all prefer-nullish-coalescing errors
"""
import re
import json

def parse_eslint_output(file_path):
    """Parse ESLint output and extract nullish coalescing errors"""
    errors = []
    current_file = None

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')

            # Check if this is a file path line (starts with C:\)
            if line.startswith('C:\\'):
                current_file = line.strip()
            # Check if this is an error line with prefer-nullish-coalescing
            elif 'prefer-nullish-coalescing' in line and current_file:
                # Parse the line number and column
                # Format: "  59:37  error  Prefer using nullish..."
                match = re.match(r'\s+(\d+):(\d+)\s+error\s+Prefer using nullish', line)
                if match:
                    line_num = int(match.group(1))
                    column = int(match.group(2))
                    errors.append({
                        'file': current_file,
                        'line': line_num,
                        'column': column
                    })

    return errors

def main():
    input_file = 'eslint-output.txt'
    output_file = 'nullish-coalescing-errors.json'

    errors = parse_eslint_output(input_file)

    print(f"Found {len(errors)} nullish coalescing errors")
    print(f"\nWriting to {output_file}...")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(errors, f, indent=2)

    # Print summary by file
    files = {}
    for error in errors:
        file_name = error['file']
        if file_name not in files:
            files[file_name] = []
        files[file_name].append(error['line'])

    print(f"\nErrors by file:")
    for file_path, lines in sorted(files.items()):
        short_name = file_path.split('\\')[-1]
        print(f"  {short_name}: {len(lines)} errors (lines: {', '.join(map(str, sorted(lines)))})")

if __name__ == '__main__':
    main()
