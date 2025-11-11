#!/usr/bin/env python3
"""
Enhanced nullish coalescing analysis with deeper insights
"""
import json
import re
from typing import Dict, List, Tuple

def deep_analyze_error(variable: str, fallback: str, context_lines: List[str], error_line: str) -> Dict:
    """Perform deep analysis of an error"""

    full_context = '\n'.join(context_lines + [error_line]).lower()

    # Extract more variable info from context
    variable_lower = variable.lower()
    fallback_lower = fallback.lower()

    analysis = {
        'can_be_zero': False,
        'can_be_empty_string': False,
        'can_be_false': False,
        'likely_type': 'unknown',
        'risk_level': 'MEDIUM',
        'risk_category': 'Unknown',
        'business_impact': 'Unknown - requires manual review',
        'fix_recommendation': 'Review manually',
        'test_scenarios': [],
        'notes': []
    }

    # Detect type from context
    if any(kw in full_context for kw in ['number', 'count', 'index', 'length', 'size']):
        analysis['likely_type'] = 'number'
        analysis['can_be_zero'] = True

    if any(kw in full_context for kw in ['string', 'text', 'label', 'name', 'message']):
        analysis['likely_type'] = 'string'

    if any(kw in full_context for kw in ['boolean', 'flag', 'enabled', 'disabled', 'is', 'has']):
        analysis['likely_type'] = 'boolean'
        analysis['can_be_false'] = True

    # Analyze by variable name patterns
    # NUMBERS - High risk if 0 is valid
    number_keywords = ['count', 'index', 'length', 'size', 'limit', 'page', 'row', 'col',
                       'position', 'offset', 'total', 'max', 'min', 'num', 'quantity']
    if any(kw in variable_lower for kw in number_keywords):
        analysis['risk_category'] = 'Dangerous - Number (0 is valid)'
        analysis['risk_level'] = 'HIGH'
        analysis['can_be_zero'] = True
        analysis['business_impact'] = 'CRITICAL - Using || treats 0 as falsy. If 0 is valid (e.g., count=0, index=0), current code is ALREADY BUGGY.'
        analysis['fix_recommendation'] = 'Change to ?? if 0 is a valid value'
        analysis['test_scenarios'] = [
            'Test with value = 0',
            'Test with value = null',
            'Test with value = undefined',
            'Test with positive numbers'
        ]
        analysis['notes'].append(f'Variable "{variable}" suggests numeric value where 0 might be valid')

    # BOOLEANS - Very high risk
    boolean_keywords = ['enabled', 'disabled', 'active', 'visible', 'hidden', 'show', 'hide',
                        'is', 'has', 'can', 'should', 'allow', 'checked', 'selected']
    if any(variable_lower.startswith(kw) or f'_{kw}' in variable_lower or f'.{kw}' in variable_lower for kw in boolean_keywords):
        analysis['risk_category'] = 'DANGEROUS - Boolean (false is valid)'
        analysis['risk_level'] = 'CRITICAL'
        analysis['can_be_false'] = True
        analysis['business_impact'] = 'BREAKING - false is a valid boolean value. Using || will ALWAYS treat false as falsy and use fallback!'
        analysis['fix_recommendation'] = 'KEEP || or use explicit !== null && !== undefined check'
        analysis['test_scenarios'] = [
            'Test with value = false',
            'Test with value = true',
            'Test with value = null',
            'Test with value = undefined'
        ]
        analysis['notes'].append(f'Variable "{variable}" is likely a boolean - DO NOT change to ??')

    # STRING IDs and names - Usually safe
    safe_string_keywords = ['id', 'key', 'ref', 'url', 'path', 'src', 'href']
    if any(kw in variable_lower for kw in safe_string_keywords):
        if fallback in ['""', "''", "'unknown'", '"unknown"', '`unknown`']:
            analysis['risk_category'] = 'Safe - String ID/Reference'
            analysis['risk_level'] = 'LOW'
            analysis['business_impact'] = 'Low - Empty string not valid for IDs/references'
            analysis['fix_recommendation'] = 'Safe to change to ??'
            analysis['test_scenarios'] = [
                'Test with value = null',
                'Test with value = undefined',
                'Test with valid string'
            ]
            analysis['notes'].append('Empty string not a valid ID - safe to change')

    # TEXT/LABELS - Medium risk
    text_keywords = ['text', 'label', 'description', 'message', 'title', 'caption', 'placeholder']
    if any(kw in variable_lower for kw in text_keywords):
        analysis['risk_category'] = 'Dangerous - String (empty string might be valid)'
        analysis['risk_level'] = 'MEDIUM'
        analysis['can_be_empty_string'] = True
        analysis['business_impact'] = 'User might intentionally set empty string. Using || treats "" as falsy.'
        analysis['fix_recommendation'] = 'Review if empty string is valid user input'
        analysis['test_scenarios'] = [
            "Test with value = ''",
            'Test with value = null',
            'Test with value = undefined',
            'Test with non-empty string'
        ]
        analysis['notes'].append('User might intentionally provide empty string - check form validation')

    # CONFIG/SETTINGS - Could be intentional
    if any(kw in variable_lower for kw in ['config', 'settings', 'options', 'props', 'params']):
        analysis['risk_category'] = 'Config Default (might be intentional)'
        analysis['risk_level'] = 'MEDIUM'
        analysis['business_impact'] = 'Config defaults often intentionally treat 0/false/"" as triggers for fallback'
        analysis['fix_recommendation'] = 'Review if current behavior is intentional - might need to keep ||'
        analysis['notes'].append('Config/settings often intentionally use || for defaults')

    # ERROR MESSAGES - Usually safe
    if 'error' in variable_lower or 'message' in variable_lower:
        if any(fallback.lower().startswith(q) for q in ["'", '"', '`']):
            analysis['risk_category'] = 'Safe - Error Message Fallback'
            analysis['risk_level'] = 'LOW'
            analysis['business_impact'] = 'Error messages should always be non-empty strings'
            analysis['fix_recommendation'] = 'Safe to change to ??'
            analysis['notes'].append('Error message fallback - safe to change')

    # DISPLAY NAMES - Usually safe
    if 'name' in variable_lower or 'displayname' in variable_lower:
        if 'tank' in full_context or 'rack' in full_context or 'box' in full_context:
            analysis['risk_category'] = 'Safe - Display Name Fallback'
            analysis['risk_level'] = 'LOW'
            analysis['business_impact'] = 'Display names should be non-empty - empty string not valid'
            analysis['fix_recommendation'] = 'Safe to change to ??'
            analysis['notes'].append('Display name with template literal fallback - safe')

    # Analyze fallback value
    if fallback.isdigit():
        num = int(fallback)
        if num > 0 and any(kw in variable_lower for kw in ['limit', 'size', 'rows', 'cols', 'max']):
            analysis['notes'].append(f'Fallback is {num} - likely a default limit/size config value')
            if 'Dangerous - Number' not in analysis['risk_category']:
                analysis['risk_category'] = 'Config Default - Number'

    return analysis

def generate_enhanced_report(errors_file: str, output_file: str):
    """Generate enhanced report with deep analysis"""

    with open(errors_file, 'r', encoding='utf-8') as f:
        errors = json.load(f)

    # Read each error and analyze
    print(f"Performing deep analysis of {len(errors)} errors...")

    analyzed_errors = []
    for i, error in enumerate(errors):
        print(f"Deep analyzing {i+1}/{len(errors)}...")

        # Read file context
        try:
            with open(error['file'], 'r', encoding='utf-8') as f:
                lines = f.readlines()

            line_num = error['line']
            start = max(0, line_num - 20)
            end = min(len(lines), line_num + 20)

            context_before = [l.rstrip() for l in lines[start:line_num-1]]
            error_line = lines[line_num-1].rstrip() if line_num <= len(lines) else ""

            # Extract variable and fallback
            or_match = re.search(r'(\w+(?:\.\w+)*(?:\?\.\w+)*(?:\([^)]*\))?)\s*\|\|\s*([^;,\)\}]+)', error_line)

            if or_match:
                variable = or_match.group(1).strip()
                fallback = or_match.group(2).strip()
            else:
                variable = 'unknown'
                fallback = 'unknown'

            # Deep analysis
            analysis = deep_analyze_error(variable, fallback, context_before, error_line)

            analyzed_errors.append({
                'error': error,
                'variable': variable,
                'fallback': fallback,
                'error_line': error_line,
                'analysis': analysis
            })

        except Exception as e:
            print(f"  Error analyzing {error['file']}:{error['line']} - {e}")
            analyzed_errors.append({
                'error': error,
                'variable': 'unknown',
                'fallback': 'unknown',
                'error_line': 'Error reading file',
                'analysis': {
                    'risk_category': 'Unknown - Error Reading',
                    'risk_level': 'MEDIUM',
                    'business_impact': 'Could not analyze',
                    'fix_recommendation': 'Manual review required',
                    'notes': [str(e)]
                }
            })

    # Count by category
    categories = {}
    risk_levels = {}
    for ae in analyzed_errors:
        cat = ae['analysis']['risk_category']
        level = ae['analysis']['risk_level']
        categories[cat] = categories.get(cat, 0) + 1
        risk_levels[level] = risk_levels.get(level, 0) + 1

    # Generate enhanced report
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Phase 3.6 - Nullish Coalescing Investigation (Tier 3)\n\n")
        f.write("**Date:** 2025-01-10  \n")
        f.write(f"**Total Errors:** {len(errors)}  \n")
        f.write("**Risk Level:** HIGHEST - Can silently break business logic  \n")
        f.write("**Why Most Dangerous:** Changes behavior for 0, false, and '' values  \n\n")

        f.write("---\n\n")
        f.write("## ⚠️ CRITICAL WARNING ⚠️\n\n")
        f.write("Nullish coalescing (`??`) is NOT a simple find-replace for `||`. The behavior changes for:\n")
        f.write("- **Numbers:** `0` (zero counts, indexes, prices)\n")
        f.write("- **Strings:** `''` (empty but valid text)\n")
        f.write("- **Booleans:** `false` (disabled states, flags)\n\n")
        f.write("**Every single case must be analyzed individually.**\n\n")

        f.write("---\n\n")
        f.write("## Executive Summary\n\n")
        f.write(f"Investigated all **{len(analyzed_errors)} nullish coalescing errors** across the codebase.\n\n")

        f.write("### Error Breakdown by Risk Category:\n\n")
        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            f.write(f"- **{cat}:** {count} errors\n")

        f.write("\n### Error Breakdown by Risk Level:\n\n")
        critical = risk_levels.get('CRITICAL', 0)
        high = risk_levels.get('HIGH', 0)
        medium = risk_levels.get('MEDIUM', 0)
        low = risk_levels.get('LOW', 0)

        f.write(f"- 🔴 **CRITICAL:** {critical} errors - DO NOT CHANGE without careful review\n")
        f.write(f"- ⚠️ **HIGH:** {high} errors - Likely breaking changes, needs investigation\n")
        f.write(f"- ⚠️ **MEDIUM:** {medium} errors - Requires case-by-case review\n")
        f.write(f"- ✅ **LOW:** {low} errors - Likely safe to change\n\n")

        f.write("### Common Patterns Found:\n\n")
        f.write("1. **Display Name Fallbacks** - `name || 'Tank 1'` - Usually safe\n")
        f.write("2. **Grid Size Defaults** - `rows || 9` - HIGH RISK if 0 is valid\n")
        f.write("3. **Error Message Fallbacks** - `error.message || 'Unknown'` - Usually safe\n")
        f.write("4. **Config Defaults** - `config.limit || 100` - May be intentional\n")
        f.write("5. **Boolean Flags** - `enabled || false` - CRITICAL - do not change\n\n")

        f.write("---\n\n")
        f.write("## Detailed Analysis\n\n")

        # Group by file
        by_file = {}
        for ae in analyzed_errors:
            file_path = ae['error']['file'].replace('C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\client\\src\\', '')
            if file_path not in by_file:
                by_file[file_path] = []
            by_file[file_path].append(ae)

        error_num = 1
        for file_path in sorted(by_file.keys()):
            f.write(f"### File: `{file_path}`\n\n")
            f.write(f"**Errors in this file:** {len(by_file[file_path])}  \n\n")

            for ae in by_file[file_path]:
                analysis = ae['analysis']
                error = ae['error']

                # Risk badge
                if analysis['risk_level'] == 'CRITICAL':
                    badge = '🔴'
                elif analysis['risk_level'] == 'HIGH':
                    badge = '⚠️'
                elif analysis['risk_level'] == 'MEDIUM':
                    badge = '⚠️'
                else:
                    badge = '✅'

                f.write(f"#### {badge} Error #{error_num} - Line {error['line']}\n\n")

                f.write(f"**Risk Category:** {analysis['risk_category']}  \n")
                f.write(f"**Risk Level:** {analysis['risk_level']}  \n")
                f.write(f"**Variable:** `{ae['variable']}`  \n")
                f.write(f"**Fallback:** `{ae['fallback']}`  \n\n")

                f.write("**Current Code:**\n")
                f.write("```typescript\n")
                f.write(f"{ae['error_line']}\n")
                f.write("```\n\n")

                f.write(f"**Business Impact:** {analysis['business_impact']}  \n\n")

                f.write(f"**Recommendation:** {analysis['fix_recommendation']}  \n\n")

                if analysis['test_scenarios']:
                    f.write("**Test Scenarios:**\n")
                    for scenario in analysis['test_scenarios']:
                        f.write(f"- {scenario}\n")
                    f.write("\n")

                if analysis['notes']:
                    f.write("**Notes:**\n")
                    for note in analysis['notes']:
                        f.write(f"- {note}\n")
                    f.write("\n")

                if analysis['can_be_zero']:
                    f.write("⚠️ **WARNING:** This variable can be 0. Current `||` treats 0 as falsy!\n\n")
                if analysis['can_be_false']:
                    f.write("🔴 **CRITICAL:** This variable can be false. DO NOT change to `??` without review!\n\n")
                if analysis['can_be_empty_string']:
                    f.write("⚠️ **CAUTION:** Empty string might be valid user input.\n\n")

                f.write("---\n\n")
                error_num += 1

        # Summary table
        f.write("## Risk Matrix - All 285 Errors\n\n")
        f.write("| # | File | Line | Variable | Fallback | Risk Category | Risk Level |\n")
        f.write("|---|------|------|----------|----------|---------------|------------|\n")
        for i, ae in enumerate(analyzed_errors, 1):
            short_file = ae['error']['file'].split(chr(92))[-1]
            risk_badge = '🔴' if ae['analysis']['risk_level'] == 'CRITICAL' else ('⚠️' if ae['analysis']['risk_level'] in ['HIGH', 'MEDIUM'] else '✅')
            f.write(f"| {i} | {short_file} | {ae['error']['line']} | `{ae['variable']}` | `{ae['fallback']}` | {ae['analysis']['risk_category']} | {risk_badge} {ae['analysis']['risk_level']} |\n")

        f.write("\n---\n\n")
        f.write("## Testing Strategy\n\n")
        f.write("**For EACH change from `||` to `??`:**\n\n")
        f.write("1. **Unit tests:**\n")
        f.write("   - Test with `value = 0` (for numbers)\n")
        f.write("   - Test with `value = ''` (for strings)\n")
        f.write("   - Test with `value = false` (for booleans)\n")
        f.write("   - Test with `value = null`\n")
        f.write("   - Test with `value = undefined`\n")
        f.write("   - Test with valid values\n\n")

        f.write("2. **Integration tests:**\n")
        f.write("   - Test with real user data\n")
        f.write("   - Test edge cases (pagination limit=0, empty search queries, etc.)\n\n")

        f.write("3. **Manual testing:**\n")
        f.write("   - Test forms with empty inputs\n")
        f.write("   - Test grids with different sizes\n")
        f.write("   - Test search with empty queries\n")
        f.write("   - Test config with all possible values\n\n")

        f.write("---\n\n")
        f.write("## Recommended Fix Strategy\n\n")
        f.write(f"**Phase 1: LOW Risk (✅ {low} errors, ~2 hours)**\n")
        f.write("- Error messages, display names, ID fallbacks\n")
        f.write("- Safe to change to `??`\n")
        f.write("- Can be semi-automated with careful review\n\n")

        f.write(f"**Phase 2: MEDIUM Risk (⚠️ {medium} errors, ~8-12 hours)**\n")
        f.write("- Config defaults, text fields, search queries\n")
        f.write("- Requires individual analysis\n")
        f.write("- Must determine if 0/''/ false are valid\n\n")

        f.write(f"**Phase 3: HIGH Risk (⚠️ {high} errors, ~6-8 hours)**\n")
        f.write("- Number fields where 0 might be valid\n")
        f.write("- Requires checking business logic\n")
        f.write("- May need to change to `??` if 0 is valid\n\n")

        f.write(f"**Phase 4: CRITICAL Risk (🔴 {critical} errors, ~4-6 hours)**\n")
        f.write("- Boolean flags and enabled/disabled states\n")
        f.write("- **DO NOT change to `??`** - will break logic!\n")
        f.write("- Add eslint-disable comments with explanation\n\n")

        f.write(f"**Total Estimated Time:** 20-28 hours (including testing)\n\n")

        f.write("---\n\n")
        f.write("## Long-term Recommendations\n\n")
        f.write("1. **Type System Improvements:**\n")
        f.write("   - Use strict types that exclude falsy values when not valid\n")
        f.write("   - Example: `type PositiveNumber = number & { __brand: 'positive' }`\n\n")

        f.write("2. **Explicit Fallbacks:**\n")
        f.write("   - Use ternary when 0/false/'' have different meanings\n")
        f.write("   - Example: `value !== null && value !== undefined ? value : fallback`\n\n")

        f.write("3. **Code Review Checklist:**\n")
        f.write("   - Always check if 0, false, or '' are valid values\n")
        f.write("   - Document when `||` is intentional\n")
        f.write("   - Add eslint-disable comments with reasoning\n\n")

        f.write("4. **Documentation:**\n")
        f.write("   - Document valid value ranges in JSDoc\n")
        f.write("   - Example: `@param limit - Number of items (0 = unlimited)`\n\n")

    print(f"\nEnhanced report created: {output_file}")
    print(f"\nRisk breakdown:")
    print(f"  CRITICAL: {critical}")
    print(f"  HIGH: {high}")
    print(f"  MEDIUM: {medium}")
    print(f"  LOW: {low}")

if __name__ == '__main__':
    errors_file = 'nullish-coalescing-errors.json'
    output_file = 'C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\reports\\phase3-6-nullish-coalescing-investigation.md'

    generate_enhanced_report(errors_file, output_file)
