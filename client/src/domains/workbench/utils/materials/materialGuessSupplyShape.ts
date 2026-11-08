export type PickTable = readonly (readonly [RegExp, string])[];

interface SupplyShape {
  type: string;
  match: string;
  values: Record<string, string | undefined>;
}

export const pickFirst = (text: string, table: PickTable): string | undefined =>
  table.find(([pattern]) => pattern.test(text))?.[1];

const NON_STERILE = /non[-\s]?sterile/;
const STERILE = /\bsterile\b/;
const VOLUME = /(\d+(?:\.\d+)?)\s*(ml|µl|ul|μl)\b/;

const GEL_WORD = /\bgel\b/;
const GEL_LOOKALIKES = /gel ?doc|gel ?box|gel ?imager|gel ?stain|loading|geltrex|gelred|gelgreen/;
const GEL_FORMAT =
  /%|precast|bis-?tris|tris-?glycine|tris-?acetate|tricine|polyacrylamide|sds-?page|agarose gel|criterion|nupage|tgx/;
const GEL_PERCENTAGE = /(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+)?)\s*%/;
const GEL_WELLS = /(\d+)[-\s]?wells?/;
const GEL_CHEMISTRIES: PickTable = [
  [/bis-?tris/, 'Bis-Tris'],
  [/tris-?glycine|tgx/, 'Tris-glycine'],
  [/tris-?acetate/, 'Tris-acetate'],
  [/tricine/, 'Tricine'],
  [/agarose/, 'Agarose'],
];

const TIP_WORD = /\btips?\b/;
const TIP_BOX_RACK = /tip ?box ?rack/;
const FILTERED_TIP = /filter|barrier/;
const LOW_RETENTION = /low[-\s]?retention/;

const PLATE_WELLS = /\b(6|12|24|48|96|384|1536)[-\s]?well\b/;
const PLATE_WORD =
  /\b(plates?|microplates?|maxisorp)\b(?!\s*(reader|washer|seal|sealer|shaker|centrifuge|handler|imager|rotor))/;
const HEATING_PLATE = /\b(hot|stir|heating)\s+plate/;
const PLATE_SURFACES: PickTable = [
  [/tc[-\s]?treated|tissue[-\s]culture[-\s]treated|cell culture[-\s]treated/, 'TC-treated'],
  [/high[-\s]?binding|maxisorp|medisorp|immuno ?plate|elisa plate|immulon/, 'High-binding'],
  [/low[-\s]?(binding|attachment)|ultra[-\s]?low|\bula\b|nunclon sphera|lobind/, 'Low-binding'],
  [/non[-\s]?treated|untreated|non[-\s]?tc/, 'Untreated'],
];
const PLATE_COLORS: PickTable = [
  [/\bwhite\b/, 'White'],
  [/\bblack\b/, 'Black'],
  [/\bclear\b|transparent/, 'Clear'],
];
const PLATE_BOTTOMS: PickTable = [
  [/\bv[-\s]?bottom/, 'V'],
  [/\b(u|round)[-\s]?bottom/, 'Round'],
  [/\bflat[-\s]?bottom|\bflat\b/, 'Flat'],
];

const FLASK_SIZE = /\bt-?(25|75|150|162|175|182|225)\b/;
const FLASK_WORD = /\bflasks?\b(?!.*erlenmeyer)/;
const NON_CULTURE_FLASK = /erlenmeyer|spinner/;
const DISH_WORD = /\b(dish|dishes|petri)\b/;
const GLASS_BOTTOM = /glass[-\s]bottom/;
const DISH_SIZE = /(\d+)\s*(cm|mm)\b/i;
const FLASK_OR_DISH_MATCH = /flask|dish|petri/;
const FLASK_SURFACES: PickTable = [
  [/tc[-\s]?treated|tissue[-\s]culture/, 'TC-treated'],
  [/ultra[-\s]?low|low[-\s]?attachment/, 'Ultra-low attachment'],
  [/suspension/, 'Suspension'],
];
const VENTED = /vent(ed)?|filter[-\s]?cap/;
const NOT_VENTED = /plug[-\s]?seal|non[-\s]?vented/;

const TUBE_WORD =
  /\b(tubes?|conicals?|cryovials?|cryotubes?|microtubes?|eppendorfs?|falcons?|vials?)\b(?!\s*(rotator|rack|roller|holder|opener))/;
const NON_SUPPLY_TUBE = /vacutainer|blood collection|edta tube|heparin tube|lysis tube|bead/;
const TUBE_MATCH = /tubes?|conicals?|cryovials?|cryotubes?|microtubes?|eppendorfs?|falcons?|vials?/;
const TUBE_MATERIALS: PickTable = [
  [/polypropylene|\bpp\b/, 'Polypropylene'],
  [/polystyrene|\bps\b/, 'Polystyrene'],
  [/glass/, 'Glass'],
];
const LOW_BINDING = /low[-\s]?(binding|bind|retention)|lobind/;

const FILTER_WORD =
  /strainer|syringe filter|filter unit|steriflip|steritop|bottle[-\s]top filter|vacuum filter|\bfilters?\b/;
const FILTER_PART = /filter[-\s]?(tips?|cap|paper)/;
const CENTRIFUGAL_FILTER = /centrifugal filter|amicon/;
const FILTER_MATCH = /strainer|steriflip|steritop|filter/;
const FILTER_PORE = /(\d+(?:\.\d+)?)\s*(µm|um|μm|micron)/i;
const FILTER_MEMBRANES: PickTable = [
  [/\bpes\b|polyethersulfone/, 'PES'],
  [/\bpvdf\b/, 'PVDF'],
  [/nylon/, 'Nylon'],
  [/cellulose acetate|\bsfca\b/, 'Cellulose acetate'],
  [/\bptfe\b/, 'PTFE'],
];
const FILTER_FORMATS: PickTable = [
  [/strainer/, 'Cell strainer'],
  [/syringe/, 'Syringe filter'],
  [/steriflip|steritop|bottle[-\s]top|vacuum/, 'Vacuum filter unit'],
];

const SLIDE_WORD = /\b(slides?|coverslips?|cover ?slips?|cover ?glass)\b/;
const NON_SUPPLY_SLIDE = /countess slides|chamber slide|lab-?tek|µ-slide|ibidi/;
const SLIDE_MATCH = /coverslips?|cover ?slips?|cover ?glass|slides?/;
const SLIDE_SIZE = /(\d+)\s*(mm|x\s*\d+\s*mm)/i;
const SLIDE_COATINGS: PickTable = [
  [/poly-?l-?lysine|\bpll\b/, 'Poly-L-lysine'],
  [/superfrost|charged|plus/, 'Charged (Superfrost Plus)'],
  [/gelatin/, 'Gelatin'],
];
const THICKNESS_ONE_AND_HALF = /#\s*1\.5|no\.?\s*1\.5|0\.17/;
const THICKNESS_ONE = /#\s*1\b|no\.?\s*1\b/;

const MEMBRANE_WORD = /\b(pvdf|nitrocellulose)\b/;
const MEMBRANE_MATCH = /pvdf|nitrocellulose/;
const MEMBRANE_PORE = /(\d+(?:\.\d+)?)\s*(µm|um|μm)/i;
const FILTER_ANYWHERE = /filter/;
const PVDF = /pvdf/;

const COLUMN_WORD = /\b(columns?|cartridges?)\b/;
const NON_SUPPLY_COLUMN = /desalting|zeba|spin column|chromatography system/;
const COLUMN_MATCH = /columns?|cartridges?/;
const COLUMN_CHEMISTRIES: PickTable = [
  [/\bls\b|\bms\b|\bld\b|macs/, 'MACS magnetic'],
  [/ni-?nta|his/, 'Ni-NTA'],
  [/c18/, 'C18'],
  [/size exclusion|superdex|superose/, 'Size exclusion'],
  [/ion exchange|q sepharose|sp sepharose|mono ?q|mono ?s/, 'Ion exchange'],
  [/protein a|protein g/, 'Protein A/G'],
];

const firstMatch = (text: string, pattern: RegExp, fallback: string): string =>
  text.match(pattern)?.[0] ?? fallback;

const sterilityOf = (lower: string): string | undefined => {
  if (NON_STERILE.test(lower)) return 'No';
  return STERILE.test(lower) ? 'Yes' : undefined;
};

const volumeOf = (lower: string): string | undefined => {
  const volume = lower.match(VOLUME);
  if (!volume) return undefined;
  return `${volume[1]} ${volume[2].startsWith('m') ? 'mL' : 'µL'}`;
};

const yesWhen = (isTrue: boolean): string | undefined => (isTrue ? 'Yes' : undefined);

const isGel = (lower: string): boolean =>
  GEL_WORD.test(lower) && !GEL_LOOKALIKES.test(lower) && GEL_FORMAT.test(lower);

const gelShape = (raw: string, lower: string): SupplyShape => {
  const percentage = raw.match(GEL_PERCENTAGE);
  return {
    type: 'Gel',
    match: 'gel',
    values: {
      percentage: percentage ? `${percentage[1].replace(/\s/g, '')}%` : undefined,
      wells: lower.match(GEL_WELLS)?.[1],
      chemistry: pickFirst(lower, GEL_CHEMISTRIES),
    },
  };
};

const tipShape = (lower: string): SupplyShape => ({
  type: 'Tips',
  match: 'tips',
  values: {
    volume: volumeOf(lower),
    filtered: yesWhen(FILTERED_TIP.test(lower)),
    'low-retention': yesWhen(LOW_RETENTION.test(lower)),
  },
});

const plateShape = (lower: string, wells: RegExpMatchArray | undefined): SupplyShape => ({
  type: 'Plate',
  match: wells ? wells[0] : 'plate',
  values: {
    format: wells ? `${wells[1]}-well` : undefined,
    surface: pickFirst(lower, PLATE_SURFACES),
    color: pickFirst(lower, PLATE_COLORS),
    bottom: pickFirst(lower, PLATE_BOTTOMS),
    sterile: sterilityOf(lower),
  },
});

const isFlaskOrDish = (lower: string): boolean =>
  FLASK_SIZE.test(lower) ||
  (FLASK_WORD.test(lower) && !NON_CULTURE_FLASK.test(lower)) ||
  (DISH_WORD.test(lower) && !GLASS_BOTTOM.test(lower));

const flaskSizeOf = (raw: string, flask: RegExpMatchArray | undefined): string | undefined => {
  if (flask) return `T${flask[1]}`;
  const dish = raw.match(DISH_SIZE);
  return dish ? `${dish[1]} ${dish[2].toLowerCase()}` : undefined;
};

const ventingOf = (lower: string): string | undefined => {
  if (VENTED.test(lower)) return 'Yes';
  return NOT_VENTED.test(lower) ? 'No' : undefined;
};

const flaskOrDishShape = (raw: string, lower: string): SupplyShape => {
  const flask = lower.match(FLASK_SIZE) ?? undefined;
  return {
    type: 'Flask or dish',
    match: flask ? flask[0] : firstMatch(lower, FLASK_OR_DISH_MATCH, 'flask'),
    values: {
      size: flaskSizeOf(raw, flask),
      surface: pickFirst(lower, FLASK_SURFACES),
      vented: ventingOf(lower),
    },
  };
};

const tubeShape = (lower: string): SupplyShape => ({
  type: 'Tube',
  match: firstMatch(lower, TUBE_MATCH, 'tube'),
  values: {
    volume: volumeOf(lower),
    material: pickFirst(lower, TUBE_MATERIALS),
    'low-binding': yesWhen(LOW_BINDING.test(lower)),
    sterile: sterilityOf(lower),
  },
});

const isFilter = (lower: string): boolean =>
  FILTER_WORD.test(lower) && !FILTER_PART.test(lower) && !CENTRIFUGAL_FILTER.test(lower);

const poreSizeOf = (raw: string, pattern: RegExp): string | undefined => {
  const pore = raw.match(pattern);
  return pore ? `${pore[1]} µm` : undefined;
};

const filterShape = (raw: string, lower: string): SupplyShape => ({
  type: 'Filter',
  match: firstMatch(lower, FILTER_MATCH, 'filter'),
  values: {
    'pore-size': poreSizeOf(raw, FILTER_PORE),
    membrane: pickFirst(lower, FILTER_MEMBRANES),
    format: pickFirst(lower, FILTER_FORMATS),
  },
});

const thicknessOf = (lower: string): string | undefined => {
  if (THICKNESS_ONE_AND_HALF.test(lower)) return '#1.5';
  return THICKNESS_ONE.test(lower) ? '#1' : undefined;
};

const slideShape = (raw: string, lower: string): SupplyShape => ({
  type: 'Slide or coverslip',
  match: firstMatch(lower, SLIDE_MATCH, 'slide'),
  values: {
    size: raw.match(SLIDE_SIZE)?.[0],
    coating: pickFirst(lower, SLIDE_COATINGS),
    thickness: thicknessOf(lower),
  },
});

const membraneShape = (raw: string, lower: string): SupplyShape => ({
  type: 'Membrane',
  match: firstMatch(lower, MEMBRANE_MATCH, ''),
  values: {
    'membrane-type': PVDF.test(lower) ? 'PVDF' : 'Nitrocellulose',
    'pore-size': poreSizeOf(raw, MEMBRANE_PORE),
  },
});

const columnShape = (lower: string): SupplyShape => ({
  type: 'Column or cartridge',
  match: firstMatch(lower, COLUMN_MATCH, ''),
  values: { chemistry: pickFirst(lower, COLUMN_CHEMISTRIES) },
});

export function guessSupplyShape(raw: string): SupplyShape | undefined {
  const lower = raw.toLowerCase();
  if (isGel(lower)) return gelShape(raw, lower);
  if (TIP_WORD.test(lower) && !TIP_BOX_RACK.test(lower)) return tipShape(lower);
  const wells = lower.match(PLATE_WELLS) ?? undefined;
  if (wells !== undefined || (PLATE_WORD.test(lower) && !HEATING_PLATE.test(lower))) {
    return plateShape(lower, wells);
  }
  if (isFlaskOrDish(lower)) return flaskOrDishShape(raw, lower);
  if (TUBE_WORD.test(lower) && !NON_SUPPLY_TUBE.test(lower)) return tubeShape(lower);
  if (isFilter(lower)) return filterShape(raw, lower);
  if (SLIDE_WORD.test(lower) && !NON_SUPPLY_SLIDE.test(lower)) return slideShape(raw, lower);
  if (MEMBRANE_WORD.test(lower) && !FILTER_ANYWHERE.test(lower)) return membraneShape(raw, lower);
  if (COLUMN_WORD.test(lower) && !NON_SUPPLY_COLUMN.test(lower)) return columnShape(lower);
  return undefined;
}
