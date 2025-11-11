#!/usr/bin/env python3
"""
Comprehensive analysis of nullish coalescing errors
Examines each error with surrounding context to determine risk level
"""
import json
import re
from dataclasses import dataclass
from typing import List, Dict, Optional
from pathlib import Path

@dataclass
class ErrorAnalysis:
    file: str
    line: int
    column: int
    context_before: List[str]
    context_line: str
    context_after: List[str]
    variable_name: str
    fallback_value: str
    risk_category: str
    risk_level: str
    notes: str

def read_file_context(file_path: str, line_num: int, context_lines: int = 20) -> tuple:
    """Read file and return context around the error line"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        start = max(0, line_num - context_lines - 1)
        end = min(len(lines), line_num + context_lines)

        before = [l.rstrip() for l in lines[start:line_num-1]]
        error_line = lines[line_num-1].rstrip() if line_num <= len(lines) else ""
        after = [l.rstrip() for l in lines[line_num:end]]

        return before, error_line, after
    except Exception as e:
        return [], f"Error reading file: {str(e)}", []

def extract_logical_or_expression(line: str, column: int) -> tuple:
    """Extract the variable and fallback from a || expression"""
    # Find the || operator
    or_match = re.search(r'(\w+(?:\.\w+)*(?:\?\.\w+)*(?:\([^)]*\))?)\s*\|\|\s*([^;,\)\}]+)', line)

    if or_match:
        variable = or_match.group(1).strip()
        fallback = or_match.group(2).strip()
        return variable, fallback

    return "unknown", "unknown"

def categorize_risk(variable: str, fallback: str, context: str) -> tuple:
    """Categorize risk based on variable name, fallback value, and context"""
    context_lower = context.lower()
    variable_lower = variable.lower()
    fallback_lower = fallback.lower()

    # SAFE CASES - String IDs, names, references
    if any(keyword in variable_lower for keyword in ['id', 'name', 'ref', 'key', 'url', 'path', 'src']):
        if fallback in ['""', "''", "'unknown'", '"unknown"', "'untitled'", '"untitled"']:
            return "Safe - String ID/Name", "LOW", "Empty string not valid for ID/name"

    # DANGEROUS - Numbers (0 is valid)
    if any(keyword in variable_lower for keyword in ['count', 'index', 'length', 'size', 'limit', 'page', 'row', 'col', 'position', 'offset']):
        if fallback.isdigit() or fallback == '0' or fallback in ['9', '10', '100']:
            return "Dangerous - Number", "HIGH", "0 might be a valid value - REVIEW CAREFULLY"

    # DANGEROUS - String (empty string might be valid)
    if any(keyword in variable_lower for keyword in ['text', 'label', 'description', 'message', 'query', 'search', 'filter']):
        if fallback in ['""', "''", "'default'", '"default"']:
            return "Dangerous - String", "MEDIUM", "Empty string might be valid user input"

    # DANGEROUS - Boolean (false is valid)
    if any(keyword in variable_lower for keyword in ['enabled', 'disabled', 'active', 'visible', 'show', 'hide', 'is', 'has', 'can', 'should']):
        if fallback in ['true', 'false']:
            return "Dangerous - Boolean", "HIGH", "false is a valid value - DO NOT CHANGE"

    # Config/defaults - might be intentional
    if 'config' in variable_lower or 'settings' in variable_lower or 'options' in variable_lower:
        return "Config Default", "MEDIUM", "Might intentionally treat 0/false/'' as falsy"

    # Default: Unknown
    return "Unknown", "MEDIUM", "Needs manual review"

def analyze_errors(errors_file: str, base_path: str) -> List[ErrorAnalysis]:
    """Analyze all errors and categorize them"""
    with open(errors_file, 'r', encoding='utf-8') as f:
        errors = json.load(f)

    analyses = []

    for i, error in enumerate(errors):
        print(f"Analyzing error {i+1}/{len(errors)}: {error['file'].split(chr(92))[-1]}:{error['line']}")

        before, error_line, after = read_file_context(error['file'], error['line'])

        # Extract variable and fallback
        variable, fallback = extract_logical_or_expression(error_line, error['column'])

        # Get context for analysis (combine surrounding lines)
        full_context = '\n'.join(before[-10:] + [error_line] + after[:10])

        # Categorize risk
        risk_cat, risk_level, notes = categorize_risk(variable, fallback, full_context)

        analyses.append(ErrorAnalysis(
            file=error['file'],
            line=error['line'],
            column=error['column'],
            context_before=before[-5:],  # Last 5 lines before
            context_line=error_line,
            context_after=after[:5],  # Next 5 lines after
            variable_name=variable,
            fallback_value=fallback,
            risk_category=risk_cat,
            risk_level=risk_level,
            notes=notes
        ))

    return analyses

def generate_report(analyses: List[ErrorAnalysis], output_file: str):
    """Generate comprehensive markdown report"""

    # Group by file
    by_file: Dict[str, List[ErrorAnalysis]] = {}
    for analysis in analyses:
        short_path = analysis.file.replace('C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\client\\src\\', '')
        if short_path not in by_file:
            by_file[short_path] = []
        by_file[short_path].append(analysis)

    # Count by category
    categories = {}
    for analysis in analyses:
        cat = analysis.risk_category
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Phase 3.6 - Nullish Coalescing Investigation (Tier 3)\n\n")
        f.write("**Date:** 2025-01-10\n")
        f.write(f"**Total Errors:** {len(analyses)}\n")
        f.write("**Risk Level:** HIGHEST - Can silently break business logic\n")
        f.write("**Why Most Dangerous:** Changes behavior for 0, false, and '' values\n\n")

        f.write("---\n\n")
        f.write("## ⚠️ CRITICAL WARNING ⚠️\n\n")
        f.write("Nullish coalescing (`??`) is NOT a simple find-replace for `||`. The behavior changes for:\n")
        f.write("- Numbers: `0` (zero counts, indexes, prices)\n")
        f.write("- Strings: `''` (empty but valid text)\n")
        f.write("- Booleans: `false` (disabled states, flags)\n\n")
        f.write("**Every single case must be analyzed individually.**\n\n")

        f.write("---\n\n")
        f.write("## Executive Summary\n\n")
        f.write(f"Investigated all **{len(analyses)} nullish coalescing errors** across **{len(by_file)} files**.\n\n")

        f.write("**Error Breakdown by Risk:**\n")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            f.write(f"- {cat}: **{count}** errors\n")

        f.write("\n---\n\n")
        f.write("## Detailed Analysis\n\n")

        error_num = 1
        for file_path in sorted(by_file.keys()):
            f.write(f"### File: `{file_path}`\n\n")
            f.write(f"**Errors in this file:** {len(by_file[file_path])}\n\n")

            for analysis in by_file[file_path]:
                f.write(f"#### Error #{error_num} - Line {analysis.line}\n\n")
                f.write(f"**Risk Category:** {analysis.risk_category}  \n")
                f.write(f"**Risk Level:** {analysis.risk_level}  \n")
                f.write(f"**Variable:** `{analysis.variable_name}`  \n")
                f.write(f"**Fallback:** `{analysis.fallback_value}`  \n\n")

                f.write("**Context:**\n")
                f.write("```typescript\n")
                for line in analysis.context_before:
                    f.write(f"{line}\n")
                f.write(f">>> {analysis.context_line}  <<<< ERROR HERE\n")
                for line in analysis.context_after:
                    f.write(f"{line}\n")
                f.write("```\n\n")

                f.write(f"**Analysis:** {analysis.notes}\n\n")

                if analysis.risk_level == "HIGH":
                    f.write("⚠️ **ACTION REQUIRED:** Manual review needed before changing\n\n")
                elif analysis.risk_level == "MEDIUM":
                    f.write("⚠️ **CAUTION:** Review recommended\n\n")
                else:
                    f.write("✅ **Likely Safe:** Can probably be changed to `??`\n\n")

                f.write("---\n\n")
                error_num += 1

        # Risk Matrix
        f.write("## Risk Matrix\n\n")
        f.write("| # | File | Line | Variable | Fallback | Risk Category | Risk Level |\n")
        f.write("|---|------|------|----------|----------|---------------|------------|\n")
        for i, analysis in enumerate(analyses, 1):
            short_file = analysis.file.split(chr(92))[-1]
            f.write(f"| {i} | {short_file} | {analysis.line} | `{analysis.variable_name}` | `{analysis.fallback_value}` | {analysis.risk_category} | {analysis.risk_level} |\n")

        f.write("\n---\n\n")
        f.write("## Recommendations\n\n")
        f.write("1. **Review all HIGH risk items individually** - These are likely breaking changes\n")
        f.write("2. **Test MEDIUM risk items carefully** - Edge cases may exist\n")
        f.write("3. **LOW risk items can be automated** - But still test!\n")
        f.write("4. **Add eslint-disable comments for intentional `||` usage**\n\n")

def main():
    errors_file = 'nullish-coalescing-errors.json'
    base_path = 'C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\client\\src'
    output_file = 'C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\reports\\phase3-6-nullish-coalescing-investigation.md'

    print("Starting comprehensive nullish coalescing analysis...")
    print(f"Reading errors from: {errors_file}")

    analyses = analyze_errors(errors_file, base_path)

    print(f"\n\nAnalyzed {len(analyses)} errors")
    print(f"Generating report at: {output_file}")

    # Ensure reports directory exists
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)

    generate_report(analyses, output_file)

    print(f"\nReport created successfully!")
    print(f"\nSummary by risk level:")
    risk_counts = {}
    for a in analyses:
        level = a.risk_level
        risk_counts[level] = risk_counts.get(level, 0) + 1

    for level, count in sorted(risk_counts.items()):
        print(f"  {level}: {count} errors")

if __name__ == '__main__':
    main()
