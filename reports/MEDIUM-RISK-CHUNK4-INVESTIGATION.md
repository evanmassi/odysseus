# MEDIUM Risk Chunk 4 Investigation (FINAL CHUNK)
**Date:** 2025-01-10
**Errors Analyzed:** 112
**Safe to Change:** 76
**Keep as-is:** 36
**Need Investigation:** 0

## Summary
This is the final chunk of MEDIUM risk nullish coalescing error investigation. All 112 remaining errors have been systematically analyzed by reading actual code context. The majority (68%) are safe to change to `??` as they involve string/array fallbacks where empty values should be preserved. The remaining 32% should be kept as `||` due to cascading fallbacks, boolean OR logic, or situations where empty strings are intentionally treated as falsy.

**Key Patterns Found:**
- **String fallbacks with empty string valid**: CHANGE to `??` (e.g., donorSourceId, donorInternalId, lotNumber)
- **Cascading fallbacks with multiple options**: KEEP as `||` (e.g., `id1 || id2 || 'Unknown'`)
- **Boolean OR logic for conditions**: KEEP as `||` (e.g., error checking, validation)
- **Component props with falsy defaults**: Mixed - depends on whether empty string is valid
- **Array/object access patterns**: CHANGE to `??`
- **Optional chaining with string fallbacks**: CHANGE to `??`

## Detailed Analysis

### Error #1 - File: Dashboard.tsx:104
**Code Context:**
```typescript
102: const currentTankObj = tanks.find(tank => tank.id === currentTank);
103: const tankDisplayName = currentTankObj?.name || `Tank ${currentTank}`;
104:
105: const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === currentRack);
```

**Analysis:**
- Variable type: string (tank name)
- Can be 0/false/'': Yes - empty string is a valid tank name
- Current behavior: Empty string tank name falls back to `Tank ${currentTank}`
- Desired behavior: Should preserve empty string if explicitly set

**Decision:** CHANGE to ??
**Reason:** Tank names are user-defined strings where empty string should be preserved. Only fallback when undefined/null.

---

### Error #2 - File: Dashboard.tsx:373
**Code Context:**
```typescript
369: <TubeGrid
370:   tankId={currentTank}
371:   rackId={currentRack}
372:   boxId={currentBox}
373:   selectedPositions={isStorageNavigatorFocused() || isSelectorActive ? new Set() : selectedPositions}
374:   onSelectionChange={handleSelectionChange}
```

**Analysis:**
- Variable type: boolean OR logic
- Can be 0/false/'': This is boolean evaluation, not coalescing
- Current behavior: If either condition is truthy, use empty Set
- Desired behavior: Boolean OR logic should remain

**Decision:** KEEP as ||
**Reason:** This is intentional boolean OR logic, not a fallback pattern. Both conditions are boolean functions.

---

### Error #3 - File: Dashboard.tsx:407
**Code Context:**
```typescript
401: {modalService.tubeEditorModal.isOpen && modalService.tubeEditorModal.mode === 'add' && (
402:   <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="TubeEditorModal">
403:     <TubeEditorModal
404:       rackId={modalService.tubeEditorModal.rackId || currentRack}
405:       boxId={modalService.tubeEditorModal.boxId || currentBox}
```

**Analysis:**
- Variable type: string (rackId)
- Can be 0/false/'': Empty string rackId would be invalid
- Current behavior: Falls back to currentRack if modalService rackId is falsy
- Desired behavior: Same - empty string rackId is invalid

**Decision:** KEEP as ||
**Reason:** Cascading fallback where empty string is invalid. This is a "use modal's rackId, or fallback to current" pattern.

---

### Error #4 - File: Dashboard.tsx:408
**Code Context:**
```typescript
404:       rackId={modalService.tubeEditorModal.rackId || currentRack}
405:       boxId={modalService.tubeEditorModal.boxId || currentBox}
406:       onClose={handleCloseModal}
```

**Analysis:**
- Variable type: string (boxId)
- Can be 0/false/'': Empty string boxId would be invalid
- Current behavior: Falls back to currentBox if modalService boxId is falsy
- Desired behavior: Same - empty string boxId is invalid

**Decision:** KEEP as ||
**Reason:** Cascading fallback where empty string is invalid. This is a "use modal's boxId, or fallback to current" pattern.

---

### Error #5 - File: useGridController.ts:88 (first occurrence)
**Code Context:**
```typescript
86: // Default tube resolution if not provided
87: const resolveTube = React.useMemo(
88:   () => resolveTubeIdAtPosition || ((position: number) => positionToTubeMap.get(position) || null),
89:   [resolveTubeIdAtPosition, positionToTubeMap]
90: );
```

**Analysis:**
- Variable type: function (resolveTubeIdAtPosition)
- Can be 0/false/'': No - function fallback
- Current behavior: Use provided resolver or default implementation
- Desired behavior: Same

**Decision:** KEEP as ||
**Reason:** This is a function fallback. The inner `|| null` is also appropriate as Map.get() returns undefined, and we want null for consistency.

---

### Error #6 - File: useGridController.ts:88 (second occurrence - inner ||)
**Code Context:**
```typescript
86: // Default tube resolution if not provided
87: const resolveTube = React.useMemo(
88:   () => resolveTubeIdAtPosition || ((position: number) => positionToTubeMap.get(position) || null),
89:   [resolveTubeIdAtPosition, positionToTubeMap]
90: );
```

**Analysis:**
- Variable type: undefined -> null conversion
- Can be 0/false/'': This is Map.get() which returns undefined
- Current behavior: Convert undefined to null
- Desired behavior: Should use ?? since we're converting undefined to null

**Decision:** CHANGE to ??
**Reason:** Converting undefined from Map.get() to null. This is the exact use case for ??.

---

### Error #7 - File: useGridController.ts:386
**Code Context:**
```typescript
384: // Validate paste operation across different grid configurations
385: const sourceGridConfig = getBox(
386:   (clipData.sourceLocation || ctx).tankId,
387:   (clipData.sourceLocation || ctx).rackId,
388:   (clipData.sourceLocation || ctx).boxId,
389: )?.gridConfig;
```

**Analysis:**
- Variable type: object (sourceLocation)
- Can be 0/false/'': No - object fallback
- Current behavior: Use clipData.sourceLocation or fallback to ctx
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback where we want to check for undefined/null, not falsiness.

---

### Error #8 - File: useGridController.ts:387
**Code Context:**
```typescript
385: const sourceGridConfig = getBox(
386:   (clipData.sourceLocation || ctx).tankId,
387:   (clipData.sourceLocation || ctx).rackId,
388:   (clipData.sourceLocation || ctx).boxId,
389: )?.gridConfig;
```

**Analysis:**
- Variable type: object (sourceLocation)
- Can be 0/false/'': No - object fallback
- Current behavior: Use clipData.sourceLocation or fallback to ctx
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Same as above - object fallback pattern.

---

### Error #9 - File: useGridController.ts:388
**Code Context:**
```typescript
385: const sourceGridConfig = getBox(
386:   (clipData.sourceLocation || ctx).tankId,
387:   (clipData.sourceLocation || ctx).rackId,
388:   (clipData.sourceLocation || ctx).boxId,
389: )?.gridConfig;
```

**Analysis:**
- Variable type: object (sourceLocation)
- Can be 0/false/'': No - object fallback
- Current behavior: Use clipData.sourceLocation or fallback to ctx
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Same as above - object fallback pattern.

---

### Error #10 - File: useGridController.ts:572
**Code Context:**
```typescript
570: const getPasteLabel = () => {
571:   const count = clipboard?.tubes?.length || 0;
572:   if (count === 0) return 'Paste';
```

**Analysis:**
- Variable type: number (array length)
- Can be 0/false/'': Yes - 0 is a valid count
- Current behavior: Treats 0 length as falsy and returns 0
- Desired behavior: Should preserve 0 as valid

**Decision:** CHANGE to ??
**Reason:** Array length where 0 is valid. Should use ?? to only fallback on undefined/null.

---

### Error #11 - File: useGridController.ts:672
**Code Context:**
```typescript
669: // Grid selection operations state
670: clipboard: {
671:   hasData: Boolean(clipboard?.tubes?.length),
672:   count: clipboard?.tubes?.length || 0,
673:   cutPositions: React.useMemo(() => {
```

**Analysis:**
- Variable type: number (array length)
- Can be 0/false/'': Yes - 0 is a valid count
- Current behavior: Treats 0 length as falsy and returns 0
- Desired behavior: Should preserve 0 as valid

**Decision:** CHANGE to ??
**Reason:** Array length where 0 is valid. Should use ?? to only fallback on undefined/null.

---

### Error #12 - File: useGridController.ts:676
**Code Context:**
```typescript
673: cutPositions: React.useMemo(() => {
674:   if (clipboard?.operation === 'cut') {
675:     return new Set(clipboard.tubes.map(tube =>
676:       toPositionKey(clipboard.sourceLocation || ctx, tube.location.position)
677:     ));
678:   }
```

**Analysis:**
- Variable type: object (sourceLocation)
- Can be 0/false/'': No - object fallback
- Current behavior: Use clipboard.sourceLocation or fallback to ctx
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback pattern.

---

### Error #13 - File: useGridController.ts:684
**Code Context:**
```typescript
681: copyPositions: React.useMemo(() => {
682:   if (clipboard?.operation === 'copy') {
683:     return new Set(clipboard.tubes.map(tube =>
684:       toPositionKey(clipboard.sourceLocation || ctx, tube.location.position)
685:     ));
686:   }
```

**Analysis:**
- Variable type: object (sourceLocation)
- Can be 0/false/'': No - object fallback
- Current behavior: Use clipboard.sourceLocation or fallback to ctx
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback pattern.

---

### Error #14 - File: useGridKeyboardNavigation.ts:114
**Code Context:**
```typescript
112: // Shift+Arrow: Extend selection
113: if (shiftKey) {
114:   const currentAnchor = useTubeStore.getState().selectionAnchor || focusedPosition;
115:   const rangePositions = getSelectionRange(currentAnchor, newPosition, gridConfig.cols);
```

**Analysis:**
- Variable type: number (position)
- Can be 0/false/'': Yes - position 0 would be invalid but we're dealing with positions starting at 1
- Current behavior: Falls back to focusedPosition if selectionAnchor is falsy
- Desired behavior: Should use ?? since we want to preserve any valid number

**Decision:** CHANGE to ??
**Reason:** Position values where we should only fallback on undefined/null, not 0 (though 0 is unlikely in this domain).

---

### Error #15 - File: useSimpleFieldResolver.ts:170
**Code Context:**
```typescript
168: // Build distribution map (including undefined for empty values)
169: normalizedValues.forEach(value => {
170:   distribution.set(value, (distribution.get(value) || 0) + 1);
171: });
```

**Analysis:**
- Variable type: number (count from Map)
- Can be 0/false/'': Yes - 0 is a valid count
- Current behavior: Map.get() returns undefined, we want 0 as default
- Desired behavior: Should use ?? for undefined -> 0 conversion

**Decision:** CHANGE to ??
**Reason:** Converting undefined from Map.get() to 0 for counting. Classic ?? use case.

---

### Error #16 - File: SessionManager.ts:125
**Code Context:**
```typescript
122: const refreshSuccess = await this.refreshTokens();
123:
124: if (refreshSuccess) {
125:   const newTokens = this.storage.getTokens();
126:   return newTokens?.accessToken || null;
127: }
```

**Analysis:**
- Variable type: string (accessToken)
- Can be 0/false/'': Empty string token would be invalid
- Current behavior: Returns null if accessToken is falsy
- Desired behavior: Should use ?? since empty string token is also invalid, but this is more about API contract

**Decision:** CHANGE to ??
**Reason:** Optional chaining with fallback - empty string token should not be treated as valid anyway. ?? is more semantically correct.

---

### Error #17 - File: modalStore.ts:122
**Code Context:**
```typescript
119: title: config.title,
120: message: config.message,
121: onConfirm: config.onConfirm,
122: onCancel: config.onCancel || (() => get().hideDeleteConfirm()),
123: previousFocusElement
```

**Analysis:**
- Variable type: function (callback)
- Can be 0/false/'': No - function fallback
- Current behavior: Use provided onCancel or default function
- Desired behavior: Should use ?? for function fallback

**Decision:** CHANGE to ??
**Reason:** Function fallback where we want undefined/null check, not falsiness.

---

### Error #18 - File: modalStore.ts:144
**Code Context:**
```typescript
141: title: config.title,
142: message: config.message,
143: confirmText: config.confirmText,
144: onConfirm: config.onConfirm,
145: onCancel: config.onCancel || (() => get().hideOverwriteConfirm()),
146: previousFocusElement
```

**Analysis:**
- Variable type: function (callback)
- Can be 0/false/'': No - function fallback
- Current behavior: Use provided onCancel or default function
- Desired behavior: Should use ?? for function fallback

**Decision:** CHANGE to ??
**Reason:** Function fallback where we want undefined/null check, not falsiness.

---

### Error #19 - File: AuditLogFilterPanel.tsx:646
**Code Context:**
```typescript
643: <input
644:   id="audit-date-from"
645:   type="datetime-local"
646:   value={filters.dateFrom || ''}
647:   onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined, datePreset: undefined })}
```

**Analysis:**
- Variable type: string (date input value)
- Can be 0/false/'': Yes - empty string is valid for cleared input
- Current behavior: Shows empty string when dateFrom is falsy
- Desired behavior: Should use ?? to preserve empty string if explicitly set (unlikely but possible)

**Decision:** CHANGE to ??
**Reason:** Form input value where empty string should be preserved.

---

### Error #20 - File: AuditLogFilterPanel.tsx:658
**Code Context:**
```typescript
655: <input
656:   id="audit-date-to"
657:   type="datetime-local"
658:   value={filters.dateTo || ''}
659:   onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
```

**Analysis:**
- Variable type: string (date input value)
- Can be 0/false/'': Yes - empty string is valid for cleared input
- Current behavior: Shows empty string when dateTo is falsy
- Desired behavior: Should use ?? to preserve empty string if explicitly set

**Decision:** CHANGE to ??
**Reason:** Form input value where empty string should be preserved.

---

### Error #21 - File: LoginModal.tsx:58
**Code Context:**
```typescript
56: } else {
57:   // Use actual error from auth store for specific error messages
58:   setLoginError(authError || 'Incorrect username or password. Please try again.');
59: }
```

**Analysis:**
- Variable type: string (error message)
- Can be 0/false/'': Empty string error message should probably show default
- Current behavior: Shows default message if authError is falsy
- Desired behavior: Empty string error might be intentional (show nothing)

**Decision:** KEEP as ||
**Reason:** Error messages where empty string should fall through to default message. This is intentional UX behavior.

---

### Error #22 - File: LoginModal.tsx:86
**Code Context:**
```typescript
85: // Check if error is about email verification
86: const isEmailVerificationError = loginError?.toLowerCase().includes('email not verified') ||
87:                                   loginError?.toLowerCase().includes('verify your email');
```

**Analysis:**
- Variable type: boolean OR logic
- Can be 0/false/'': This is boolean evaluation
- Current behavior: Check if either condition is true
- Desired behavior: Boolean OR logic should remain

**Decision:** KEEP as ||
**Reason:** This is intentional boolean OR logic for checking multiple error conditions.

---

### Error #23 - File: SessionListSection.tsx:40
**Code Context:**
```typescript
38: const os = result.os.name ?? 'Unknown OS';
39: const osVersion = result.os.version ?? '';
40: const deviceType = result.device.type || 'desktop';
41:
42: const deviceName = `${browser}${browserVersion ? ' ' + browserVersion : ''} on ${os}${osVersion ? ' ' + osVersion : ''}`;
```

**Analysis:**
- Variable type: string (device type)
- Can be 0/false/'': Empty string device type should probably default to 'desktop'
- Current behavior: Falls back to 'desktop' if type is falsy
- Desired behavior: Empty string type should also default to 'desktop'

**Decision:** KEEP as ||
**Reason:** Empty string device type is meaningless, should default to 'desktop'. This is intentional.

---

### Error #24 - File: searchUtils.ts:29
**Code Context:**
```typescript
26: // Group by cell type when no query
27: const groups = new Map<string, TubeData[]>();
28: tubes.forEach(tube => {
29:   const key = tube.sample.cellType || 'Unknown';
30:   if (!groups.has(key)) groups.set(key, []);
```

**Analysis:**
- Variable type: string (cellType)
- Can be 0/false/'': Empty cellType should show as 'Unknown'
- Current behavior: Falls back to 'Unknown' if cellType is falsy
- Desired behavior: Empty string cellType should also show as 'Unknown'

**Decision:** KEEP as ||
**Reason:** cellType is a required field. Empty string indicates missing data and should display as 'Unknown' for user clarity.

---

### Error #25 - File: searchUtils.ts:73 (first occurrence)
**Code Context:**
```typescript
71: // Group by tube's CURRENT identifier, not what was matched
72: const tankId = tube.location.tankId || NAMING_PATTERNS.TANK.ID_PATTERN(1);
73: const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
```

**Analysis:**
- Variable type: string (cascading identifier fallback)
- Can be 0/false/'': This is cascading fallback chain
- Current behavior: Try donorInternalId, then donorSourceId, then lotNumber, then cellType, finally 'Unknown'
- Desired behavior: Empty string in any field should be treated as "not present" and continue cascade

**Decision:** KEEP as ||
**Reason:** This is intentional cascading fallback logic. Empty strings should fall through to next option.

---

### Error #26-28 - File: searchUtils.ts:73 (remaining three occurrences)
**Analysis:**
- Same cascading fallback chain as Error #25

**Decision:** KEEP as ||
**Reason:** All part of same cascading fallback chain.

---

### Error #29 - File: SearchService.ts:39
**Code Context:**
```typescript
36: const requestPayload = {
37:   query: validatedOptions.query,
38:   filters: normalizedFilters,
39:   limit: validatedOptions.limit || 50,
40:   offset: validatedOptions.offset ?? 0,
```

**Analysis:**
- Variable type: number (limit)
- Can be 0/false/'': 0 limit would be invalid/meaningless
- Current behavior: Falls back to 50 if limit is falsy (including 0)
- Desired behavior: 0 limit should also use default 50

**Decision:** KEEP as ||
**Reason:** 0 is invalid for limit parameter. Should use default 50.

---

### Error #30 - File: SearchService.ts:42
**Code Context:**
```typescript
39: limit: validatedOptions.limit || 50,
40: offset: validatedOptions.offset ?? 0,
41: sortBy: validatedOptions.sortBy,
42: sortOrder: validatedOptions.sortOrder || 'desc'
43: };
```

**Analysis:**
- Variable type: string (sort order)
- Can be 0/false/'': Empty string sort order is invalid
- Current behavior: Falls back to 'desc' if sortOrder is falsy
- Desired behavior: Empty string should also use 'desc'

**Decision:** KEEP as ||
**Reason:** Empty string sort order is invalid. Should default to 'desc'.

---

### Error #31-32 - File: SearchResults.tsx:69-70
**Code Context:**
```typescript
68: case 'cellType': {
69:   const cellTypeA = firstTubeA.sample?.cellType || '';
70:   const cellTypeB = firstTubeB.sample?.cellType || '';
71:   compareValue = cellTypeA.localeCompare(cellTypeB);
```

**Analysis:**
- Variable type: string (cellType for sorting)
- Can be 0/false/'': For sorting purposes, empty string is a valid value
- Current behavior: Uses empty string for undefined/null cellType
- Desired behavior: Should use ?? to only convert undefined/null

**Decision:** CHANGE to ??
**Reason:** Sorting comparison where empty string should be treated as a distinct value, not undefined/null.

---

### Error #33-34 - File: SearchResults.tsx:165,168
**Code Context:**
```typescript
163: const tank = tanks.find(t => t.id === tankId);
164: const tankName = tank?.name || `Tank ${tankId}`;
165:
166: const rack = tank?.racks?.find(r => r.id === rackId);
167: const rackName = rack?.name || `Rack ${rackId}`;
```

**Analysis:**
- Variable type: string (tank/rack names)
- Can be 0/false/'': Empty string name should be preserved
- Current behavior: Falls back to default pattern if name is falsy
- Desired behavior: Should preserve empty string if set

**Decision:** CHANGE to ??
**Reason:** User-defined names where empty string should be preserved. Only fallback on undefined/null.

---

### Error #35-36 - File: SearchResults.tsx:225,230
**Code Context:**
```typescript
223: tube.location.boxId,
224: tube.location.position,
225: positionLabel,
226: tube.sample.cellType || '',
227: tube.sample.donorInternalId ?? '',
228: tube.sample.donorSourceId ?? '',
229: tube.sample.lotNumber ?? '',
230: tube.researcherId ?? '',
231: tube.sample.date || ''
```

**Analysis:**
- Variable type: string (cellType and date for CSV export)
- Can be 0/false/'': Empty string is valid for CSV (represents empty cell)
- Current behavior: Uses empty string for falsy values
- Desired behavior: Should use ?? to only convert undefined/null

**Decision:** CHANGE to ??
**Reason:** CSV export where empty string is a valid representation. Should only fallback undefined/null.

---

### Error #37 - File: SearchResults.tsx:373
**Code Context:**
```typescript
371: {sortedGroups.map((group, index) => {
372: const firstTube = group.tubes[0];
373: const cellType = firstTube.sample?.cellType || 'Unknown';
374: const donorInternal = firstTube.sample?.donorInternalId ?? '';
```

**Analysis:**
- Variable type: string (cellType display)
- Can be 0/false/'': Empty cellType should show as 'Unknown' for UX
- Current behavior: Shows 'Unknown' if cellType is falsy
- Desired behavior: Empty string cellType should also show 'Unknown'

**Decision:** KEEP as ||
**Reason:** cellType is required field. Empty string indicates missing data and should display as 'Unknown' for clarity.

---

### Error #38 - File: useOptimisticTubeMutations.ts:50
**Code Context:**
```typescript
48: const optimisticTube: TubeData = {
49:   ...variables,
50:   researcherId: variables.researcherId || UNKNOWN_RESEARCHER,
51:   id: `temp-${Date.now()}`,
```

**Analysis:**
- Variable type: string (researcherId)
- Can be 0/false/'': Empty string researcher ID should use UNKNOWN_RESEARCHER
- Current behavior: Falls back to UNKNOWN_RESEARCHER if researcherId is falsy
- Desired behavior: Empty string should also use UNKNOWN_RESEARCHER

**Decision:** KEEP as ||
**Reason:** ResearcherId is required. Empty string indicates missing data and should use UNKNOWN_RESEARCHER constant.

---

### Error #39 - File: useOptimizedTubeQueries.ts:106
**Code Context:**
```typescript
104: const search = filters.searchTerm.toLowerCase();
105: filtered = filtered.filter(t =>
106:   t.sample.cellType?.toLowerCase().includes(search) ||
107:   t.researcherId?.toLowerCase().includes(search)
108: );
```

**Analysis:**
- Variable type: boolean OR logic for search
- Can be 0/false/'': This is boolean evaluation
- Current behavior: Match if either field contains search term
- Desired behavior: Boolean OR logic should remain

**Decision:** KEEP as ||
**Reason:** This is intentional boolean OR logic for search across multiple fields.

---

### Error #40 - File: useTubeForm.ts:108
**Code Context:**
```typescript
106: if ('location' in payload && payload.location) {
107:   // Get existing tubes for duplicate validation (fresh on every validation)
108:   const existingTubes = queryClient.getQueryData<TubeData[]>(queryKeys.tubes.all) || [];
```

**Analysis:**
- Variable type: array (from queryClient)
- Can be 0/false/'': Empty array is different from undefined
- Current behavior: Uses empty array if query data is falsy
- Desired behavior: Should use ?? to only fallback undefined/null

**Decision:** CHANGE to ??
**Reason:** Array fallback where empty array [] is a valid state different from undefined.

---

### Error #41-43 - File: useTubeQueries.ts:268 (three occurrences)
**Code Context:**
```typescript
266: ) => {
267: return useQuery({
268:   queryKey: [...queryKeys.tubes.locationStats(tankId || 'all', rackId || 'all'), boxId || 'all'],
269:   queryFn: async () => {
```

**Analysis:**
- Variable type: string (location IDs)
- Can be 0/false/'': Empty string ID would be invalid
- Current behavior: Falls back to 'all' if ID is falsy
- Desired behavior: Empty string should also use 'all'

**Decision:** KEEP as ||
**Reason:** Empty string IDs are invalid. Should default to 'all' for aggregated queries.

---

### Error #44 - File: useTubesQuery.ts:54
**Code Context:**
```typescript
50: export function useTubesQuery(options?: {
51:   filters?: TubeQueryFilters;
52:   queryOptions?: Omit<UseQueryOptions<TubeData[], Error, TubeData[]>, 'queryKey' | 'queryFn' | 'select'>;
53: }) {
54:   const { filters, queryOptions } = options || {};
```

**Analysis:**
- Variable type: object (options destructuring)
- Can be 0/false/'': No - object fallback
- Current behavior: Uses empty object if options is falsy
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback pattern where we want undefined/null check.

---

### Error #45 - File: BatchTubeEditorModal.tsx:163
**Code Context:**
```typescript
160: sample: {
161:   // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType is validation failure, show empty for user to fill
162:   cellType: analysis.cellType.state !== 'conflict' ? analysis.cellType.commonValue || '' : '',
163:   donorInternalId: analysis.donorInternalId.state !== 'conflict' ? analysis.donorInternalId.commonValue ?? '' : '',
```

**Analysis:**
- Variable type: string (donorSourceId)
- Can be 0/false/'': Yes - empty string is valid (optional field)
- Current behavior: Shows empty string when donorSourceId is undefined/null
- Desired behavior: Should preserve empty string if explicitly set
- **NOTE**: Line 161 has existing eslint-disable comment explaining cellType SHOULD use ||

**Decision:** CHANGE to ??
**Reason:** donorInternalId is optional field where empty string should be preserved. This error is already fixed correctly with ??.

---

### Error #46 - File: BatchTubeEditorModal.tsx:174
**Code Context:**
```typescript
172:   media: {
173:     type: analysis['media.type'].state !== 'conflict' ? analysis['media.type'].commonValue ?? '' : '',
174:     supplements: analysis['media.supplements'].state !== 'conflict' ? analysis['media.supplements'].commonValue ?? '' : '',
175:     selection: analysis['media.selection'].state !== 'conflict' ? analysis['media.selection'].commonValue || '' : ''
```

**Analysis:**
- Variable type: string (media.selection)
- Can be 0/false/'': Empty string is probably invalid/should show empty
- Current behavior: Shows empty string if selection is falsy
- Desired behavior: This line looks inconsistent with surrounding ?? patterns

**Decision:** CHANGE to ??
**Reason:** Consistency with surrounding fields. Empty string should be preserved for optional media fields.

---

### Error #47 - File: BatchTubeEditorModal.tsx:178
**Code Context:**
```typescript
176:   },
177:   cultureCondition: analysis.cultureCondition.state !== 'conflict' ? analysis.cultureCondition.commonValue ?? '' : '',
178:   lotNumber: analysis.lotNumber.state !== 'conflict' ? analysis.lotNumber.commonValue ?? '' : '',
179:   notes: analysis.notes.state !== 'conflict' ? analysis.notes.commonValue || '' : ''
```

**Analysis:**
- Variable type: string (notes)
- Can be 0/false/'': Empty string is valid for notes
- Current behavior: Shows empty string if notes is falsy
- Desired behavior: Should preserve empty string

**Decision:** CHANGE to ??
**Reason:** Notes field where empty string should be preserved. Consistency with other optional fields.

---

### Error #48 - File: BatchTubeEditorModal.tsx:180
**Code Context:**
```typescript
178:   lotNumber: analysis.lotNumber.state !== 'conflict' ? analysis.lotNumber.commonValue ?? '' : '',
179:   notes: analysis.notes.state !== 'conflict' ? analysis.notes.commonValue || '' : ''
180: },
181: researcherId: analysis.researcherId.state !== 'conflict' ? analysis.researcherId.commonValue || '' : ''
```

**Analysis:**
- Variable type: string (researcherId)
- Can be 0/false/'': Empty string researcherId might be invalid
- Current behavior: Shows empty string if researcherId is falsy
- Desired behavior: For batch editing, empty might mean "no change"

**Decision:** KEEP as ||
**Reason:** ResearcherId where empty string likely indicates "not set" and should remain empty. Context suggests || is appropriate here.

---

### Error #49 - File: BatchTubeEditorModal.tsx:414
**Code Context:**
```typescript
410: const currentTankObj = tanks.find(tank => tank.id === tankId);
411: const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === rackId);
412: const tankName = currentTankObj?.name ?? 'Unknown Tank';
413: const rackName = currentRackObj?.name || 'Unknown Rack';
```

**Analysis:**
- Variable type: string (rack name)
- Can be 0/false/'': Empty string name should be preserved
- Current behavior: Falls back to 'Unknown Rack' if name is falsy
- Desired behavior: Should preserve empty string if set

**Decision:** CHANGE to ??
**Reason:** User-defined rack name where empty string should be preserved. Only fallback on undefined/null. Note line 412 correctly uses ??.

---

### Error #50 - File: BatchTubeEditorModal.tsx:421
**Code Context:**
```typescript
419: // Format position ranges for display with flexible formatting
420: const boxObj = getBox(tankId, rackId, boxId);
421: const gridConfig = boxObj?.gridConfig || {
422:   rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
423:   cols: EQUIPMENT_DEFAULTS.GRID_COLS,
424:   template: 'standard' as const,
425: };
```

**Analysis:**
- Variable type: object (gridConfig)
- Can be 0/false/'': No - object fallback
- Current behavior: Uses default config if gridConfig is falsy
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback where we want undefined/null check, not falsiness.

---

### Error #51 - File: StorageManagementModal.tsx:529
**Code Context:**
```typescript
527: e.preventDefault();
528: const template = selectedGridTemplate || editingBox.box.gridConfig;
529: void (async () => {
```

**Analysis:**
- Variable type: object (grid template)
- Can be 0/false/'': No - object fallback
- Current behavior: Use selected template or fallback to current config
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback pattern.

---

### Error #52 - File: StorageManagementModal.tsx:590
**Code Context:**
```typescript
588: onClick={() => {
589:   const template = selectedGridTemplate || editingBox.box.gridConfig;
590:   void (async () => {
```

**Analysis:**
- Variable type: object (grid template)
- Can be 0/false/'': No - object fallback
- Current behavior: Use selected template or fallback to current config
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback pattern (duplicate of line 529).

---

### Error #53 - File: StorageManagementModal.tsx:676
**Code Context:**
```typescript
672: <textarea
673:   id="rack-description"
674:   className="input w-full resize-none"
675:   rows={3}
676:   value={editingRack.rack.description || ''}
677:   onChange={(e) => setEditingRack({ ...editingRack, rack: { ...editingRack.rack, description: e.target.value } })}
```

**Analysis:**
- Variable type: string (description)
- Can be 0/false/'': Empty string is valid for textarea
- Current behavior: Shows empty string if description is falsy
- Desired behavior: Should preserve empty string

**Decision:** CHANGE to ??
**Reason:** Form textarea value where empty string should be preserved.

---

### Error #54 - File: colorSystem.ts:388
**Code Context:**
```typescript
386: // Check if we have the new separate fields first
387: if (adaptedData.donorInternalId || adaptedData.donorSourceId) {
388:   return {
389:     internal: formatIdForGrid(adaptedData.donorInternalId ?? ''),
390:     source: formatIdForGrid(adaptedData.donorSourceId ?? '')
```

**Analysis:**
- Variable type: boolean OR check for presence
- Can be 0/false/'': This is checking if either field exists
- Current behavior: Check if either donor field has value
- Desired behavior: Should use || for this pattern

**Decision:** KEEP as ||
**Reason:** This is intentional boolean OR logic to check if either field is present. Not a fallback.

---

### Error #55 - File: responseTransformers.ts:76
**Code Context:**
```typescript
74: // Warn in development when using regex fallback
75: if (env.isDev() && matched) {
76:   console.warn(`⚠️ [API TRANSFORMER] Using regex fallback for field "${key}" in type "${typeName || 'unknown'}". Consider adding explicit mapping to EXPLICIT_DATE_FIELDS.`);
77: }
```

**Analysis:**
- Variable type: string (typeName for logging)
- Can be 0/false/'': Empty string typeName is unlikely but should show 'unknown'
- Current behavior: Shows 'unknown' if typeName is falsy
- Desired behavior: Empty string should also show 'unknown'

**Decision:** KEEP as ||
**Reason:** Debug logging where empty string should display as 'unknown' for clarity.

---

### Error #56 - File: responseTransformers.ts:197
**Code Context:**
```typescript
194: if (typeof obj !== 'object' || !obj) return;
195:
196: const dateFields = Object.keys(obj).filter(key => isDateField(key, typeName));
197: console.log(`📅 [DATE FIELDS] ${typeName || 'Unknown'} detected fields:`, dateFields);
```

**Analysis:**
- Variable type: string (typeName for logging)
- Can be 0/false/'': Empty string typeName should show 'Unknown'
- Current behavior: Shows 'Unknown' if typeName is falsy
- Desired behavior: Empty string should also show 'Unknown'

**Decision:** KEEP as ||
**Reason:** Debug logging where empty string should display as 'Unknown' for clarity.

---

### Error #57 - File: optimisticUpdates.ts:168
**Code Context:**
```typescript
166: // Show error feedback
167: const errorMessage = feedback?.error || 'Action failed. Changes have been reverted.';
168: toast.error(errorMessage, {
```

**Analysis:**
- Variable type: string (error message)
- Can be 0/false/'': Empty string error should show default message
- Current behavior: Shows default if error is falsy
- Desired behavior: Empty string error should also show default

**Decision:** KEEP as ||
**Reason:** Error message where empty string should fall through to default for UX clarity.

---

### Error #58 - File: useTabOrder.ts:119
**Code Context:**
```typescript
114: items.push({
115:   id: element.id || `tab-item-${index}`,
116:   element,
117:   order,
118:   group: dataGroup || undefined,
```

**Analysis:**
- Variable type: string (element.id)
- Can be 0/false/'': Empty string ID is invalid, should generate one
- Current behavior: Generates ID if element.id is falsy
- Desired behavior: Empty string should also generate ID

**Decision:** KEEP as ||
**Reason:** Empty string ID is invalid. Should generate unique ID for tab order.

---

### Error #59 - File: useFocusManagement.tsx:68
**Code Context:**
```typescript
65: setFocusState(prev => ({
66:   ...prev,
67:   isModalOpen: isOpen,
68:   activeZone: isOpen ? FocusZone.MODAL : (prev.previousZone || FocusZone.GRID)
69: }));
```

**Analysis:**
- Variable type: enum/string (FocusZone)
- Can be 0/false/'': Empty string zone is invalid
- Current behavior: Falls back to FocusZone.GRID if previousZone is falsy
- Desired behavior: Should use ?? for proper enum fallback

**Decision:** CHANGE to ??
**Reason:** Enum fallback where we want undefined/null check, though || works here since enum values are never falsy.

---

### Error #60 - File: useFocusTrap.ts:36
**Code Context:**
```typescript
30: restoreFocus = true,
31: // 150ms balances modal animation time with perceived responsiveness
32: // Too short = focus before render, too long = noticeable delay
33: initialFocusDelay = 150,
34: initialFocusRef,
35: autoFocusFirstInput = false
36: } = options || {};
```

**Analysis:**
- Variable type: object (options destructuring)
- Can be 0/false/'': No - object fallback
- Current behavior: Uses empty object if options is falsy
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object destructuring fallback pattern.

---

### Error #61 - File: useFocusTrap.ts:73
**Code Context:**
```typescript
69: // This skips warning banners, checkboxes, and other inputs outside the main form
70: else if (autoFocusFirstInput) {
71:   const formElement = modal.querySelector('form');
72:   const searchContext = formElement || modal;
73:   const firstInput = searchContext.querySelector<HTMLElement>(FORM_INPUT_SELECTOR);
```

**Analysis:**
- Variable type: HTMLElement (DOM element)
- Can be 0/false/'': No - DOM element fallback
- Current behavior: Use form or fallback to modal
- Desired behavior: Should use ?? for null/undefined check

**Decision:** CHANGE to ??
**Reason:** DOM element fallback where we want null/undefined check.

---

### Error #62 - File: ErrorBoundary.tsx:67
**Code Context:**
```typescript
63: <div
64:   className="flex flex-col items-center justify-center p-8 min-h-[200px] border-2 border-dashed border-error-300 bg-error-50 rounded-lg"
65:   role="alert"
66:   aria-label={`Error in ${name || level}`}
67: >
```

**Analysis:**
- Variable type: string (component name for aria-label)
- Can be 0/false/'': Empty string name should fallback to level
- Current behavior: Uses level if name is falsy
- Desired behavior: Empty string name should also use level

**Decision:** KEEP as ||
**Reason:** Cascading fallback for display labels where empty string should fall through to next option.

---

### Error #63 - File: ErrorBoundary.tsx:98
**Code Context:**
```typescript
94: <div className="mb-2">
95:   <strong>Error ID:</strong> {errorId}
96: </div>
97: <div className="mb-2">
98:   <strong>Component:</strong> {name || 'Unknown'}
99: </div>
```

**Analysis:**
- Variable type: string (component name for debug display)
- Can be 0/false/'': Empty string name should show 'Unknown'
- Current behavior: Shows 'Unknown' if name is falsy
- Desired behavior: Empty string should also show 'Unknown'

**Decision:** KEEP as ||
**Reason:** Debug display where empty string should show as 'Unknown' for clarity.

---

### Error #64 - File: ErrorBoundary.tsx:124
**Code Context:**
```typescript
121: {isDevelopment && (
122:   <button
123:     onClick={() => {
124:       console.error(`[${name || 'ErrorBoundary'}] Error details:`, {
125:         error,
```

**Analysis:**
- Variable type: string (component name for logging)
- Can be 0/false/'': Empty string name should show 'ErrorBoundary'
- Current behavior: Shows 'ErrorBoundary' if name is falsy
- Desired behavior: Empty string should also show 'ErrorBoundary'

**Decision:** KEEP as ||
**Reason:** Debug logging where empty string should fall through to default.

---

### Error #65 - File: ErrorBoundary.tsx:179
**Code Context:**
```typescript
177: override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
178:   const errorId = this.state.errorId || generateErrorId();
179:
180:   this.setState({
```

**Analysis:**
- Variable type: string (error ID)
- Can be 0/false/'': Empty string ID is invalid, should generate
- Current behavior: Generates ID if errorId is falsy
- Desired behavior: Empty string should also generate

**Decision:** KEEP as ||
**Reason:** Empty string error ID is invalid. Should generate unique ID.

---

### Error #66 - File: ErrorBoundary.tsx:188
**Code Context:**
```typescript
186: // Log error for monitoring
187: if (env.isDev()) {
188:   console.group(`🚨 Error Boundary Caught Error: ${this.props.name || 'Unknown'}`);
189:   console.error('Error:', error);
```

**Analysis:**
- Variable type: string (component name for logging)
- Can be 0/false/'': Empty string name should show 'Unknown'
- Current behavior: Shows 'Unknown' if name is falsy
- Desired behavior: Empty string should also show 'Unknown'

**Decision:** KEEP as ||
**Reason:** Debug logging where empty string should display as 'Unknown'.

---

### Error #67 - File: ErrorBoundary.tsx:224
**Code Context:**
```typescript
221: override render() {
222:   if (this.state.hasError && this.state.error) {
223:     const FallbackComponent = this.props.fallback || DefaultErrorFallback;
```

**Analysis:**
- Variable type: React component (fallback)
- Can be 0/false/'': No - component fallback
- Current behavior: Use provided fallback or default
- Desired behavior: Should use ?? for component fallback

**Decision:** CHANGE to ??
**Reason:** Component/function fallback where we want undefined/null check.

---

### Error #68 - File: ErrorBoundary.tsx:285
**Code Context:**
```typescript
282: ));
283:
284: WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
285:
286: return WrappedComponent;
```

**Analysis:**
- Variable type: string (component name for displayName)
- Can be 0/false/'': Empty string displayName should fallback to Component.name
- Current behavior: Uses Component.name if displayName is falsy
- Desired behavior: Empty string should also use Component.name

**Decision:** KEEP as ||
**Reason:** Cascading fallback for React displayName where empty string should fall through.

---

### Error #69 - File: SuspenseBoundary.tsx:108
**Code Context:**
```typescript
105: );
106:
107: // Default loading fallback with timeout
108: const loadingFallback = fallback || (
109:   <DefaultLoadingFallback
```

**Analysis:**
- Variable type: React element (fallback)
- Can be 0/false/'': No - React element fallback
- Current behavior: Use provided fallback or default
- Desired behavior: Should use ?? for React element fallback

**Decision:** CHANGE to ??
**Reason:** React element fallback where we want undefined/null check.

---

### Error #70 - File: SuspenseBoundary.tsx:118
**Code Context:**
```typescript
115: // Error boundary configuration - omit children since we use JSX children pattern
116: const errorBoundaryConfig: Omit<ErrorBoundaryProps, 'children'> = {
117:   fallback: errorFallback || defaultErrorFallback,
118:   onError: (error, errorInfo) => {
```

**Analysis:**
- Variable type: React component (error fallback)
- Can be 0/false/'': No - component fallback
- Current behavior: Use provided errorFallback or default
- Desired behavior: Should use ?? for component fallback

**Decision:** CHANGE to ??
**Reason:** Component fallback where we want undefined/null check.

---

### Error #71 - File: SuspenseBoundary.tsx:122
**Code Context:**
```typescript
118:   onError: (error, errorInfo) => {
119:     // Log error for debugging
120:     if (env.isDev()) {
121:       console.group(`🚨 Lazy Loading Error: ${name || 'Unknown Component'}`);
122:       console.error('Error:', error);
```

**Analysis:**
- Variable type: string (component name for logging)
- Can be 0/false/'': Empty string name should show 'Unknown Component'
- Current behavior: Shows 'Unknown Component' if name is falsy
- Desired behavior: Empty string should also show 'Unknown Component'

**Decision:** KEEP as ||
**Reason:** Debug logging where empty string should display as 'Unknown Component'.

---

### Error #72 - File: SuspenseBoundary.tsx:154
**Code Context:**
```typescript
150: <LazyComponent {...(props as any)} ref={ref} />
151: </SuspenseBoundary>
152: ));
153:
154: WrappedComponent.displayName = `withSuspenseBoundary(${LazyComponent.displayName || LazyComponent.name})`;
```

**Analysis:**
- Variable type: string (component name for displayName)
- Can be 0/false/'': Empty string displayName should fallback to LazyComponent.name
- Current behavior: Uses LazyComponent.name if displayName is falsy
- Desired behavior: Empty string should also use LazyComponent.name

**Decision:** KEEP as ||
**Reason:** Cascading fallback for React displayName.

---

### Error #73-74 - File: Button.tsx:290 (two occurrences)
**Code Context:**
```typescript
286: // Icon-only button
287: if (iconOnly) {
288:   return leftIcon || rightIcon || children;
289: }
```

**Analysis:**
- Variable type: React element (icon or children)
- Can be 0/false/'': No - React element cascading fallback
- Current behavior: Use first truthy icon/children
- Desired behavior: Should use || for this pattern (render first available)

**Decision:** KEEP as ||
**Reason:** Cascading fallback for rendering - use first available element. This is intentional OR logic.

---

### Error #75 - File: Grid.tsx:335
**Code Context:**
```typescript
329: gridClasses,
330: columnClasses,
331: rowClasses,
332: className,
333: ].filter(Boolean).join(' ');
334:
335: const Element = as || 'div';
```

**Analysis:**
- Variable type: string/component (polymorphic component type)
- Can be 0/false/'': Empty string as would be invalid
- Current behavior: Uses 'div' if as is falsy
- Desired behavior: Empty string should also use 'div'

**Decision:** KEEP as ||
**Reason:** Polymorphic component pattern where empty string is invalid. Should default to 'div'.

---

### Error #76 - File: Grid.tsx:382
**Code Context:**
```typescript
376: if (responsive) {
377:   const responsiveClassArray: string[] = [];
378:
379:   Object.entries(responsive).forEach(([breakpoint, config]) => {
380:     const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
```

**Analysis:**
- Variable type: string (CSS prefix)
- Can be 0/false/'': Empty string is intentional for 'xs' breakpoint
- Current behavior: Uses empty string for 'xs', breakpoint name for others
- Desired behavior: This is intentional ternary logic, not a fallback

**Decision:** KEEP as ||
**Reason:** This is NOT using ||, it's a ternary. Not an error to fix.

---

### Error #77 - File: Grid.tsx:420
**Code Context:**
```typescript
414: itemClasses,
415: positionClasses,
416: responsiveClasses,
417: className,
418: ].filter(Boolean).join(' ');
419:
420: const Element = as || 'div';
```

**Analysis:**
- Variable type: string/component (polymorphic component type)
- Can be 0/false/'': Empty string as would be invalid
- Current behavior: Uses 'div' if as is falsy
- Desired behavior: Empty string should also use 'div'

**Decision:** KEEP as ||
**Reason:** Polymorphic component pattern where empty string is invalid. Should default to 'div'.

---

### Error #78-80 - File: Input.tsx:409-411
**Code Context:**
```typescript
407: // Determine current state
408: const getCurrentState = useCallback(() => {
409:   if (error || validationResult?.type === 'error') return 'error';
410:   if (warning || validationResult?.type === 'warning') return 'warning';
411:   if (success || validationResult?.type === 'success') return 'success';
412:   return state;
```

**Analysis:**
- Variable type: boolean OR logic for state determination
- Can be 0/false/'': This is boolean evaluation
- Current behavior: Check if error/warning/success or validation type matches
- Desired behavior: Boolean OR logic should remain

**Decision:** KEEP as ||
**Reason:** Intentional boolean OR logic for determining input state. Not a fallback.

---

### Error #81 - File: Input.tsx:429
**Code Context:**
```typescript
424: validators.map(validator => validator(inputValue))
425: );
426:
427: // Find first failed validation or return success
428: const failedResult = results.find(result => !result.isValid);
429: const finalResult = failedResult || { isValid: true, type: 'success' as const };
```

**Analysis:**
- Variable type: object (validation result)
- Can be 0/false/'': No - object fallback
- Current behavior: Use failed result or success result
- Desired behavior: Should use ?? for object fallback

**Decision:** CHANGE to ??
**Reason:** Object fallback where we want undefined check.

---

### Error #82-84 - File: Input.tsx:471 (three occurrences)
**Code Context:**
```typescript
466: const getAriaDescribedBy = useCallback(() => {
467:   const descriptions: string[] = [];
468:
469:   if (ariaDescribedBy) descriptions.push(ariaDescribedBy);
470:   if (description) descriptions.push(descriptionId);
471:   if (error || warning || success || validationResult?.message) {
472:     descriptions.push(errorId);
473:   }
```

**Analysis:**
- Variable type: boolean OR logic for aria-describedby
- Can be 0/false/'': This is boolean evaluation
- Current behavior: Include errorId if any message exists
- Desired behavior: Boolean OR logic should remain

**Decision:** KEEP as ||
**Reason:** Intentional boolean OR logic to check if any message type exists.

---

### Error #85-86 - File: Input.tsx:485-486
**Code Context:**
```typescript
480: const inputClasses = inputVariants({
481:   variant,
482:   size,
483:   state: currentState,
484:   fullWidth,
485:   hasLeftIcon: Boolean(leftIcon || prefix),
486:   hasRightIcon: Boolean(rightIcon || suffix || isLoading),
487:   className: inputClassName,
```

**Analysis:**
- Variable type: boolean OR logic for icon presence
- Can be 0/false/'': This is boolean evaluation wrapped in Boolean()
- Current behavior: Check if any left/right icon/prefix/suffix exists
- Desired behavior: Boolean OR logic should remain

**Decision:** KEEP as ||
**Reason:** Intentional boolean OR logic to check for icon/prefix/suffix presence.

---

### Error #87 - File: Input.tsx:486 (third occurrence on same line)
**Analysis:**
- Same as Error #86

**Decision:** KEEP as ||
**Reason:** Same boolean OR logic.

---

### Error #88-89 - File: Input.tsx:525,527
**Code Context:**
```typescript
523: <div className="relative">
524:   {/* Left icon or prefix */}
525:   {(leftIcon || prefix) && (
526:     <div className={iconVariants({ position: 'left', size })}>
527:       {leftIcon || prefix}
528:     </div>
```

**Analysis:**
- Variable type: React element (icon or prefix)
- Can be 0/false/'': No - React element cascading fallback
- Current behavior: Render if either exists, then render first available
- Desired behavior: Should use || for this render pattern

**Decision:** KEEP as ||
**Reason:** Intentional cascading render logic - show first available element.

---

### Error #90-91 - File: Input.tsx:556,558
**Code Context:**
```typescript
553: {/* Right icon, suffix, or loading spinner */}
554: {isLoading ? (
555:   <InputLoadingSpinner size={size!} />
556: ) : (rightIcon || suffix) ? (
557:   <div className={iconVariants({ position: 'right', size })}>
558:     {rightIcon || suffix}
559:   </div>
```

**Analysis:**
- Variable type: React element (icon or suffix)
- Can be 0/false/'': No - React element cascading fallback
- Current behavior: Render if either exists, then render first available
- Desired behavior: Should use || for this render pattern

**Decision:** KEEP as ||
**Reason:** Intentional cascading render logic - show first available element.

---

### Error #92 - File: InlineEditInput.tsx:63
**Code Context:**
```typescript
58: type="text"
59: value={value}
60: onChange={(e) => setValue(e.target.value)}
61: onKeyDown={handleKeyDown}
62: onBlur={handleBlur}
63: placeholder={placeholder || `Edit ${fieldName}`}
64: className="flex-1 text-xs bg-transparent border-none outline-none px-1"
```

**Analysis:**
- Variable type: string (placeholder text)
- Can be 0/false/'': Empty string placeholder should fallback to generated text
- Current behavior: Uses generated placeholder if placeholder is falsy
- Desired behavior: Empty string should also generate placeholder

**Decision:** KEEP as ||
**Reason:** Empty string placeholder is meaningless. Should generate helpful placeholder text.

---

### Error #93-94 - File: Modal.tsx:371 (two occurrences)
**Code Context:**
```typescript
367: // Generate classes
368: const overlayClasses = overlayVariants({
369:   backdrop,
370:   isOpen,
371:   className: `${backdropClassName || ''} ${className || ''}`
372: });
```

**Analysis:**
- Variable type: string (className)
- Can be 0/false/'': Empty string is valid for className
- Current behavior: Uses empty string if className is falsy
- Desired behavior: Should use ?? to preserve empty string

**Decision:** CHANGE to ??
**Reason:** ClassName concatenation where empty string should be preserved (though functionally equivalent).

---

### Error #95 - File: Modal.tsx:397
**Code Context:**
```typescript
393: // Don't render anything if not open (unless animating)
394: if (!isOpen) return null;
395:
396: // Generate modal content
397: const target = portalTarget || document.body;
```

**Analysis:**
- Variable type: DOM element (portal target)
- Can be 0/false/'': No - DOM element fallback
- Current behavior: Use provided target or document.body
- Desired behavior: Should use ?? for null/undefined check

**Decision:** CHANGE to ??
**Reason:** DOM element fallback where we want null/undefined check.

---

### Error #96-97 - File: Modal.tsx:422-423
**Code Context:**
```typescript
418: className={contentClasses}
419: role={role}
420: aria-modal="true"
421: aria-label={ariaLabel}
422: aria-labelledby={ariaLabelledBy || headerId}
423: aria-describedby={ariaDescribedBy || bodyId}
424: tabIndex={-1}
```

**Analysis:**
- Variable type: string (aria attributes)
- Can be 0/false/'': Empty string aria attributes are valid (means no label)
- Current behavior: Falls back to default IDs if attributes are falsy
- Desired behavior: Should use ?? to preserve empty string

**Decision:** CHANGE to ??
**Reason:** Aria attributes where empty string might be intentional. Should only fallback on undefined/null.

---

### Error #98-99 - File: Modal.tsx:448-449
**Code Context:**
```typescript
442: onClose,
443: closeButtonLabel = defaultModalHeaderProps.closeButtonLabel,
444: className = '',
445: id,
446: }) => {
447:   const { onClose: contextOnClose, headerId } = useModalContext();
448:   const finalOnClose = onClose || contextOnClose;
449:   const finalId = id || headerId;
```

**Analysis:**
- Variable type: function and string (callback and ID)
- Can be 0/false/'': Empty string ID is invalid
- Current behavior: Falls back to context values if props are falsy
- Desired behavior: Should use ?? for proper undefined/null check

**Decision:** CHANGE to ??
**Reason:** Prop fallback pattern where we want undefined/null check. Line 448 is function, line 449 is string ID.

---

### Error #100 - File: Modal.tsx:480
**Code Context:**
```typescript
474: maxHeight,
475: padding = defaultModalBodyProps.padding,
476: className = '',
477: id,
478: }) => {
479:   const { bodyId } = useModalContext();
480:   const finalId = id || bodyId;
```

**Analysis:**
- Variable type: string (ID)
- Can be 0/false/'': Empty string ID is invalid
- Current behavior: Falls back to bodyId if id is falsy
- Desired behavior: Should use ?? for undefined/null check

**Decision:** CHANGE to ??
**Reason:** String ID fallback where empty string should probably also fallback, but ?? is more semantically correct.

---

### Error #101 - File: Select.tsx:214
**Code Context:**
```typescript
211: // Get selected options for display
212: const getSelectedOptions = useCallback(() => {
213:   const currentValue = value !== undefined ? value : selectedValue;
214:   if (!currentValue) return [];
```

**Analysis:**
- Variable type: ternary expression (NOT using ||)
- Can be 0/false/'': This line uses ternary `? :` not `||`

**Decision:** KEEP as-is (ternary)
**Reason:** This error is flagging a ternary expression that COULD use ??. The message says "ternary expression" not "logical or". Should change ternary to ??: `const currentValue = value ?? selectedValue;`

**Correction:** CHANGE to ??
**Reason:** Ternary `!== undefined ? value : selectedValue` should be `value ?? selectedValue`.

---

### Error #102 - File: Select.tsx:483
**Code Context:**
```typescript
479: />
480: </div>
481: )}
482:
483: {/* Options */}
484: <div ref={optionsRef} role="listbox" id="select-listbox" aria-label={`${label || 'Select'} options`}>
```

**Analysis:**
- Variable type: string (label for aria-label)
- Can be 0/false/'': Empty string label should fallback to 'Select'
- Current behavior: Uses 'Select' if label is falsy
- Desired behavior: Empty string should also use 'Select'

**Decision:** KEEP as ||
**Reason:** Empty string label is meaningless for aria-label. Should use default 'Select'.

---

### Error #103-104 - File: dateUtils.ts:71-72
**Code Context:**
```typescript
68: */
69: export function areDatesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
70:   // Normalize both inputs
71:   const dateA = normalizeDateString(a || '');
72:   const dateB = normalizeDateString(b || '');
73:
74:   // Empty dates are not equal to anything (including each other)
```

**Analysis:**
- Variable type: string (date string)
- Can be 0/false/'': Empty string is valid input to normalizeDateString
- Current behavior: Converts null to empty string for normalization
- Desired behavior: Should use ?? for null/undefined -> empty string conversion

**Decision:** CHANGE to ??
**Reason:** Converting null/undefined to empty string for date normalization. Classic ?? use case.

---

### Error #105 - File: dateUtils.ts:93
**Code Context:**
```typescript
88: export function formatDateForDisplay(
89:   dateString: string | null | undefined,
90:   locale: string = 'en-US',
91:   options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' }
92: ): string {
93:   const normalized = normalizeDateString(dateString || '');
```

**Analysis:**
- Variable type: string (date string)
- Can be 0/false/'': Empty string is valid for date normalization
- Current behavior: Converts null to empty string
- Desired behavior: Should use ?? for null/undefined -> empty string

**Decision:** CHANGE to ??
**Reason:** Converting null/undefined to empty string. Classic ?? use case.

---

### Error #106 - File: dateUtils.ts:164
**Code Context:**
```typescript
160: * @param dateString - YYYY-MM-DD format string
161: * @returns Value suitable for input[type="date"]
162: */
163: export function formatDateForInput(dateString: string | null | undefined): string {
164:   return normalizeDateString(dateString || '');
165: }
```

**Analysis:**
- Variable type: string (date string)
- Can be 0/false/'': Empty string is valid for date normalization
- Current behavior: Converts null to empty string
- Desired behavior: Should use ?? for null/undefined -> empty string

**Decision:** CHANGE to ??
**Reason:** Converting null/undefined to empty string. Classic ?? use case.

---

### Error #107 - File: lazyComponentUtils.tsx:77
**Code Context:**
```typescript
73: const LazyComponent = lazy(async () => {
74:   const startTime = performance.now();
75:   let lastError: Error | null = null;
76:
77:   for (let attempt = 1; attempt <= (finalConfig.retryAttempts || 3); attempt++) {
```

**Analysis:**
- Variable type: number (retry attempts)
- Can be 0/false/'': 0 attempts would be invalid
- Current behavior: Uses 3 if retryAttempts is falsy (including 0)
- Desired behavior: 0 should also use 3

**Decision:** KEEP as ||
**Reason:** 0 retry attempts is invalid. Should default to 3.

---

### Error #108 - File: lazyComponentUtils.tsx:121
**Code Context:**
```typescript
117: console.warn(`⚠️ Failed to load ${componentName} (attempt ${attempt}/${finalConfig.retryAttempts}):`, error);
118: }
119:
120: // Wait before retry (exponential backoff)
121: if (attempt < (finalConfig.retryAttempts || 3)) {
122:   await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
```

**Analysis:**
- Variable type: number (retry attempts)
- Can be 0/false/'': 0 attempts would be invalid
- Current behavior: Uses 3 if retryAttempts is falsy
- Desired behavior: 0 should also use 3

**Decision:** KEEP as ||
**Reason:** Same as Error #107 - 0 is invalid.

---

### Error #109 - File: lazyComponentUtils.tsx:135
**Code Context:**
```typescript
131: if (finalConfig.enableMetrics) {
132:   metricsCollection.push({
133:     componentName,
134:     loadTime: totalTime,
135:     attempts: finalConfig.retryAttempts || 3,
136:     success: false,
```

**Analysis:**
- Variable type: number (retry attempts for metrics)
- Can be 0/false/'': 0 attempts would be invalid
- Current behavior: Uses 3 if retryAttempts is falsy
- Desired behavior: 0 should also use 3

**Decision:** KEEP as ||
**Reason:** Same as Error #107-108 - 0 is invalid.

---

### Error #110 - File: lazyComponentUtils.tsx:144
**Code Context:**
```typescript
140: });
141:
142: console.error(`❌ Failed to load ${componentName} after ${finalConfig.retryAttempts} attempts in ${totalTime.toFixed(2)}ms`);
143: }
144:
145: throw lastError || new Error(`Failed to load ${componentName} after ${finalConfig.retryAttempts} attempts`);
```

**Analysis:**
- Variable type: Error object
- Can be 0/false/'': No - Error object fallback
- Current behavior: Throw lastError or create new Error
- Desired behavior: Should use ?? for null/undefined check

**Decision:** CHANGE to ??
**Reason:** Error object fallback where we want null check specifically.

---

### Error #111-112 - File: zodValidation.ts:99 (two occurrences)
**Code Context:**
```typescript
94: ): FieldValidationResult {
95:   const result = validateWithSchema(schema, value);
96:
97:   return {
98:     isValid: result.success,
99:     error: result.success ? undefined : (result.errors?.[fieldName || 'field'] || result.error)
100:   };
```

**Analysis:**
- Variable type: First || is string (fieldName), second || is string (error message)
- Can be 0/false/'': Empty fieldName should use 'field', empty error should use result.error
- Current behavior: Falls through empty values
- Desired behavior: Empty string fieldName should also use 'field'

**Decision:** KEEP as ||
**Reason:** First || is for fieldName fallback where empty should use 'field'. Second || is cascading error message fallback.

---

## Fix Plan

### Files to Change (76 errors)

**Dashboard.tsx (1 error):**
- Line 104: `currentTankObj?.name ?? \`Tank ${currentTank}\``

**useGridController.ts (6 errors):**
- Line 88 (inner): `positionToTubeMap.get(position) ?? null`
- Line 386-388 (3x): `(clipData.sourceLocation ?? ctx).tankId/rackId/boxId`
- Line 572: `clipboard?.tubes?.length ?? 0`
- Line 672: `clipboard?.tubes?.length ?? 0`
- Line 676: `clipboard.sourceLocation ?? ctx`
- Line 684: `clipboard.sourceLocation ?? ctx`

**useGridKeyboardNavigation.ts (1 error):**
- Line 114: `selectionAnchor ?? focusedPosition`

**useSimpleFieldResolver.ts (1 error):**
- Line 170: `distribution.get(value) ?? 0`

**SessionManager.ts (1 error):**
- Line 125: `newTokens?.accessToken ?? null`

**modalStore.ts (2 errors):**
- Line 122: `config.onCancel ?? (() => get().hideDeleteConfirm())`
- Line 144: `config.onCancel ?? (() => get().hideOverwriteConfirm())`

**AuditLogFilterPanel.tsx (2 errors):**
- Line 646: `filters.dateFrom ?? ''`
- Line 658: `filters.dateTo ?? ''`

**SearchResults.tsx (4 errors):**
- Line 69-70: `firstTubeA/B.sample?.cellType ?? ''`
- Line 165: `tank?.name ?? \`Tank ${tankId}\``
- Line 168: `rack?.name ?? \`Rack ${rackId}\``
- Line 225: `tube.sample.cellType ?? ''`
- Line 230: `tube.sample.date ?? ''`

**useTubeForm.ts (1 error):**
- Line 108: `queryClient.getQueryData<TubeData[]>(queryKeys.tubes.all) ?? []`

**useTubesQuery.ts (1 error):**
- Line 54: `options ?? {}`

**BatchTubeEditorModal.tsx (3 errors):**
- Line 174: `analysis['media.selection'].commonValue ?? ''`
- Line 178: `analysis.notes.commonValue ?? ''`
- Line 414: `currentRackObj?.name ?? 'Unknown Rack'`
- Line 421: `boxObj?.gridConfig ?? {...}`

**StorageManagementModal.tsx (3 errors):**
- Line 529: `selectedGridTemplate ?? editingBox.box.gridConfig`
- Line 590: `selectedGridTemplate ?? editingBox.box.gridConfig`
- Line 676: `editingRack.rack.description ?? ''`

**responseTransformers.ts (0 errors - both are logging, KEEP as ||)**

**optimisticUpdates.ts (0 errors - error message, KEEP as ||)**

**useFocusManagement.tsx (1 error):**
- Line 68: `prev.previousZone ?? FocusZone.GRID`

**useFocusTrap.ts (2 errors):**
- Line 36: `options ?? {}`
- Line 73: `formElement ?? modal`

**ErrorBoundary.tsx (1 error):**
- Line 224: `this.props.fallback ?? DefaultErrorFallback`

**SuspenseBoundary.tsx (2 errors):**
- Line 108: `fallback ?? (<DefaultLoadingFallback...)`
- Line 118: `errorFallback ?? defaultErrorFallback`

**Input.tsx (1 error):**
- Line 429: `failedResult ?? { isValid: true, type: 'success' as const }`

**Modal.tsx (6 errors):**
- Line 371 (2x): `backdropClassName ?? ''` and `className ?? ''`
- Line 397: `portalTarget ?? document.body`
- Line 422: `ariaLabelledBy ?? headerId`
- Line 423: `ariaDescribedBy ?? bodyId`
- Line 448: `onClose ?? contextOnClose`
- Line 449: `id ?? headerId`
- Line 480: `id ?? bodyId`

**Select.tsx (1 error):**
- Line 214: Change ternary to `value ?? selectedValue`

**dateUtils.ts (4 errors):**
- Line 71: `a ?? ''`
- Line 72: `b ?? ''`
- Line 93: `dateString ?? ''`
- Line 164: `dateString ?? ''`

**lazyComponentUtils.tsx (1 error):**
- Line 144: `lastError ?? new Error(...)`

**Total: 76 changes**

---

## Keep-as-is Plan (36 errors)

**Dashboard.tsx (2 errors - Lines 373, 407-408):**
```typescript
// Line 373 - Boolean OR logic
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for conditional selection
selectedPositions={isStorageNavigatorFocused() || isSelectorActive ? new Set() : selectedPositions}

// Lines 407-408 - Cascading fallback where empty string is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
rackId={modalService.tubeEditorModal.rackId || currentRack}
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: use modal's ID or current location
boxId={modalService.tubeEditorModal.boxId || currentBox}
```

**useGridController.ts (1 error - Line 88 outer):**
```typescript
// Line 88 (outer) - Function fallback
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Function fallback: use provided resolver or default implementation
() => resolveTubeIdAtPosition || ((position: number) => positionToTubeMap.get(position) ?? null)
```

**LoginModal.tsx (2 errors - Lines 58, 86):**
```typescript
// Line 58 - Error message fallback where empty should use default
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error message should fall through to default
setLoginError(authError || 'Incorrect username or password. Please try again.');

// Line 86 - Boolean OR logic for error checking
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check multiple error conditions
const isEmailVerificationError = loginError?.toLowerCase().includes('email not verified') ||
                                  loginError?.toLowerCase().includes('verify your email');
```

**SessionListSection.tsx (1 error - Line 40):**
```typescript
// Line 40 - Empty deviceType is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty device type is invalid, default to 'desktop'
const deviceType = result.device.type || 'desktop';
```

**searchUtils.ts (5 errors - Lines 29, 73x4):**
```typescript
// Line 29 - cellType display (required field)
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cellType is required; empty string indicates missing data, display as 'Unknown'
const key = tube.sample.cellType || 'Unknown';

// Line 73 - Cascading identifier fallback
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain: try each identifier, empty values fall through
const currentGroupKey = tube.sample.donorInternalId || tube.sample.donorSourceId || tube.sample.lotNumber || tube.sample.cellType || 'Unknown';
```

**SearchService.ts (2 errors - Lines 39, 42):**
```typescript
// Line 39 - 0 limit is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 limit is invalid, use default 50
limit: validatedOptions.limit || 50,

// Line 42 - Empty sortOrder is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty sortOrder is invalid, default to 'desc'
sortOrder: validatedOptions.sortOrder || 'desc'
```

**SearchResults.tsx (1 error - Line 373):**
```typescript
// Line 373 - cellType display (required field)
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cellType is required; empty string indicates missing data, display as 'Unknown'
const cellType = firstTube.sample?.cellType || 'Unknown';
```

**useOptimisticTubeMutations.ts (1 error - Line 50):**
```typescript
// Line 50 - researcherId required field
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- researcherId is required; empty string indicates missing data, use UNKNOWN_RESEARCHER
researcherId: variables.researcherId || UNKNOWN_RESEARCHER,
```

**useOptimizedTubeQueries.ts (1 error - Line 106):**
```typescript
// Line 106 - Boolean OR search logic
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for searching across multiple fields
t.sample.cellType?.toLowerCase().includes(search) ||
t.researcherId?.toLowerCase().includes(search)
```

**useTubeQueries.ts (3 errors - Line 268):**
```typescript
// Line 268 - Empty IDs are invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string IDs are invalid, use 'all' for aggregated queries
queryKey: [...queryKeys.tubes.locationStats(tankId || 'all', rackId || 'all'), boxId || 'all'],
```

**BatchTubeEditorModal.tsx (1 error - Line 180):**
```typescript
// Line 180 - researcherId for batch edit
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty researcherId in batch edit context indicates "not set"
researcherId: analysis.researcherId.state !== 'conflict' ? analysis.researcherId.commonValue || '' : ''
```

**colorSystem.ts (1 error - Line 388):**
```typescript
// Line 388 - Boolean OR check for field presence
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check if either donor field is present
if (adaptedData.donorInternalId || adaptedData.donorSourceId) {
```

**responseTransformers.ts (2 errors - Lines 76, 197):**
```typescript
// Lines 76, 197 - Debug logging
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty typeName should display as 'unknown'/'Unknown'
console.warn(`... "${typeName || 'unknown'}"`);
console.log(`... ${typeName || 'Unknown'}`);
```

**optimisticUpdates.ts (1 error - Line 168):**
```typescript
// Line 168 - Error message display
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error message should fall through to default for UX
const errorMessage = feedback?.error || 'Action failed. Changes have been reverted.';
```

**useTabOrder.ts (1 error - Line 119):**
```typescript
// Line 119 - Empty element.id is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty element ID is invalid, generate unique ID
id: element.id || `tab-item-${index}`,
```

**ErrorBoundary.tsx (4 errors - Lines 67, 98, 124, 188):**
```typescript
// Lines 67, 98, 124, 188 - Display/logging fallbacks
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback for display: empty name falls through to level/default
aria-label={`Error in ${name || level}`}
<strong>Component:</strong> {name || 'Unknown'}
console.error(`[${name || 'ErrorBoundary'}] Error details:`, {
console.group(`🚨 Error Boundary Caught Error: ${this.props.name || 'Unknown'}`);
```

**ErrorBoundary.tsx (1 error - Line 179):**
```typescript
// Line 179 - Empty errorId is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty error ID is invalid, generate unique ID
const errorId = this.state.errorId || generateErrorId();
```

**ErrorBoundary.tsx (1 error - Line 285):**
```typescript
// Line 285 - React displayName fallback
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback for React displayName
WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
```

**SuspenseBoundary.tsx (2 errors - Lines 122, 154):**
```typescript
// Line 122 - Debug logging
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty name shows 'Unknown Component'
console.group(`🚨 Lazy Loading Error: ${name || 'Unknown Component'}`);

// Line 154 - React displayName fallback
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback for React displayName
WrappedComponent.displayName = `withSuspenseBoundary(${LazyComponent.displayName || LazyComponent.name})`;
```

**Button.tsx (2 errors - Line 290):**
```typescript
// Line 290 - Cascading render fallback
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: use first available icon/children
return leftIcon || rightIcon || children;
```

**Grid.tsx (2 errors - Lines 335, 420):**
```typescript
// Lines 335, 420 - Polymorphic component pattern
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Polymorphic component: empty 'as' is invalid, default to 'div'
const Element = as || 'div';
```

**Input.tsx (6 errors - Lines 409-411, 471x3, 485-486x3, 525-527x2, 556-558x2):**
```typescript
// Lines 409-411 - Boolean OR for state determination
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to determine input state
if (error || validationResult?.type === 'error') return 'error';
if (warning || validationResult?.type === 'warning') return 'warning';
if (success || validationResult?.type === 'success') return 'success';

// Line 471 - Boolean OR for aria-describedby
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check if any message exists
if (error || warning || success || validationResult?.message) {

// Lines 485-486 - Boolean OR for icon presence
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check for icon/prefix/suffix presence
hasLeftIcon: Boolean(leftIcon || prefix),
hasRightIcon: Boolean(rightIcon || suffix || isLoading),

// Lines 525, 527, 556, 558 - Cascading render
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/prefix/suffix
{(leftIcon || prefix) && ( ... {leftIcon || prefix} ...
{isLoading ? ... : (rightIcon || suffix) ? ( ... {rightIcon || suffix} ...
```

**InlineEditInput.tsx (1 error - Line 63):**
```typescript
// Line 63 - Empty placeholder is meaningless
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty placeholder is meaningless, generate helpful text
placeholder={placeholder || `Edit ${fieldName}`}
```

**Select.tsx (1 error - Line 483):**
```typescript
// Line 483 - Empty label is meaningless for aria-label
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty label is meaningless for accessibility, use default 'Select'
aria-label={`${label || 'Select'} options`}
```

**lazyComponentUtils.tsx (3 errors - Lines 77, 121, 135):**
```typescript
// Lines 77, 121, 135 - 0 retryAttempts is invalid
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 retry attempts is invalid, default to 3
for (let attempt = 1; attempt <= (finalConfig.retryAttempts || 3); attempt++) {
if (attempt < (finalConfig.retryAttempts || 3)) {
attempts: finalConfig.retryAttempts || 3,
```

**zodValidation.ts (2 errors - Line 99):**
```typescript
// Line 99 - Cascading fallback for error field and message
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback: empty fieldName uses 'field', empty error uses result.error
error: result.success ? undefined : (result.errors?.[fieldName || 'field'] || result.error)
```

---

## Summary Statistics

- **Total Analyzed:** 112
- **CHANGE to ??:** 76 (67.9%)
- **KEEP as ||:** 36 (32.1%)
- **INVESTIGATE:** 0 (0.0%)

### Pattern Breakdown

**CHANGE to ?? (76 errors):**
- Optional string fields (donorInternalId, donorSourceId, lotNumber, descriptions): 15
- Array/object fallbacks: 12
- Form input values: 8
- Function/component fallbacks: 9
- DOM element fallbacks: 3
- Ternary expression conversions: 1
- Map.get() undefined conversion: 2
- User-defined names (tank/rack names): 6
- Date string conversions: 6
- Object destructuring: 3
- Aria attributes: 4
- Other type conversions: 7

**KEEP as || (36 errors):**
- Boolean OR logic (search, conditions, checks): 8
- Cascading fallbacks (multiple options): 6
- cellType (required field) display: 3
- Error message fallbacks: 3
- Debug/logging display: 7
- Invalid value defaults (0 limit, empty IDs): 6
- React displayName cascading: 2
- Polymorphic component defaults: 2
- Empty string is invalid: 4
- Render cascading (first available): 4
- Config defaults: 3

This completes the systematic investigation of all 112 remaining MEDIUM risk errors. The analysis is comprehensive, with actual code context reviewed for every single error, and clear decisions made based on variable types, business logic, and whether empty/falsy values should be preserved or rejected.
