/**
 * Odysseus Spinner
 *
 * Branded loader built from the Odysseus mark — the O ring and the inner snowflake
 * counter-rotate about one shared center. Inherits the host's text color via currentColor.
 */

import { useEffect, useState, type CSSProperties } from 'react';

// Mark paths lifted from the lockup (odysseus-logo-thick.svg). The inner <g> reproduces
// the source transform so these raw coordinates land in the cropped viewBox unchanged.
const RING_OUTER =
  'M2273 5970 c-176 -27 -300 -55 -437 -101 -139 -46 -339 -130 -409 -171 -26 -15 -50 -28 -52 -28 -13 0 -145 -88 -233 -155 -116 -88 -343 -308 -424 -410 -263 -335 -422 -704 -485 -1124 -24 -163 -24 -534 1 -681 82 -489 260 -868 570 -1215 165 -184 262 -266 506 -427 235 -155 548 -277 855 -334 224 -41 544 -45 765 -8 512 84 1032 367 1366 741 279 314 444 631 544 1048 80 334 84 749 9 1050 -22 90 -69 238 -74 233 -2 -2 12 -70 30 -151 45 -199 59 -330 59 -527 -1 -364 -72 -658 -238 -988 -88 -175 -282 -441 -405 -555 -327 -303 -679 -484 -1070 -554 -116 -20 -506 -29 -625 -14 -167 22 -305 55 -461 113 -110 41 -299 129 -365 171 -83 52 -191 129 -187 133 2 2 46 -16 98 -40 96 -45 268 -101 394 -130 166 -37 285 -49 450 -42 189 7 296 26 470 83 84 27 261 111 252 119 -3 3 -27 -1 -53 -9 -168 -51 -252 -61 -489 -62 -205 0 -242 3 -335 23 -527 117 -932 401 -1234 864 -31 47 -73 124 -95 170 -152 327 -195 519 -195 873 0 230 14 347 66 545 130 497 456 927 903 1192 473 281 1093 352 1614 186 247 -79 395 -155 676 -348 l60 -41 -49 46 c-64 60 -254 201 -331 246 -56 33 -209 106 -300 144 -143 60 -372 117 -578 145 -124 16 -423 11 -564 -10z';
const RING_CREST =
  'M2690 5527 c-3 -3 -48 -10 -100 -16 -266 -30 -560 -151 -759 -312 -67 -54 -94 -96 -39 -60 125 82 338 162 518 194 309 55 690 2 961 -133 337 -169 570 -384 751 -695 291 -499 316 -1143 63 -1646 -85 -168 -152 -267 -283 -416 -35 -40 -61 -73 -57 -73 4 0 46 26 93 57 128 84 309 270 404 413 177 267 262 511 289 826 40 463 -121 932 -446 1298 -58 66 -266 241 -345 291 -197 125 -467 223 -695 255 -94 12 -348 25 -355 17z';
const SNOWFLAKE =
  'M2470 4979 c0 -138 -3 -170 -13 -166 -8 3 -75 46 -151 97 -75 50 -143 93 -151 97 -12 4 -15 -10 -17 -81 -1 -47 -2 -93 -2 -102 -1 -10 59 -52 167 -117 l167 -101 0 -98 c0 -54 -4 -98 -9 -98 -10 0 -159 84 -281 159 l-85 52 -3 -96 -3 -95 -47 26 c-26 15 -56 36 -68 46 -11 10 -23 18 -27 18 -4 0 -7 -94 -7 -210 0 -115 -2 -210 -4 -210 -3 0 -43 23 -90 51 l-86 52 0 187 c0 166 -2 189 -17 202 -16 13 -147 88 -155 88 -1 0 -2 -83 0 -185 2 -102 -1 -185 -6 -185 -4 0 -29 14 -55 30 -26 17 -50 30 -53 30 -3 0 -18 8 -32 18 -52 36 -164 93 -170 87 -4 -3 -18 -40 -33 -81 l-27 -75 22 -14 c11 -7 72 -44 134 -82 62 -37 113 -72 114 -78 0 -5 -62 -46 -138 -92 -77 -45 -146 -87 -154 -92 -13 -9 -11 -13 10 -30 14 -11 51 -34 83 -52 l58 -31 72 42 c40 24 114 67 165 97 l93 54 86 -47 86 -47 -24 -18 c-13 -10 -83 -51 -156 -91 -197 -108 -189 -97 -108 -144 38 -21 70 -44 72 -51 3 -7 -24 -26 -61 -43 -91 -44 -97 -54 -46 -80 56 -29 101 -54 149 -84 22 -15 43 -26 45 -26 11 0 126 -73 126 -80 0 -4 -15 -14 -32 -21 -18 -7 -51 -25 -73 -40 -65 -43 -75 -43 -141 -1 -32 21 -105 64 -162 96 l-102 58 -75 -48 c-41 -27 -75 -51 -75 -54 0 -7 100 -69 207 -129 51 -29 95 -56 98 -61 3 -5 -36 -32 -87 -61 -51 -28 -116 -66 -144 -84 l-51 -33 39 -80 40 -79 122 70 c66 38 132 78 145 88 13 11 28 19 32 19 5 0 9 -88 9 -195 0 -222 -11 -207 102 -142 l68 38 2 201 3 200 80 49 c44 27 83 49 87 49 4 0 9 -95 10 -210 l3 -211 73 46 c41 25 77 45 82 45 4 0 7 -40 6 -90 -1 -49 0 -90 2 -90 9 0 323 187 336 200 22 22 26 6 26 -92 l0 -103 -42 -25 c-24 -14 -63 -37 -88 -51 -25 -14 -81 -49 -125 -76 l-80 -50 -3 -97 c-2 -81 0 -96 13 -96 8 0 53 24 99 54 85 56 207 126 219 126 4 0 7 -74 7 -165 l0 -165 85 0 85 0 0 170 c0 94 2 170 5 170 3 0 80 -43 171 -95 91 -52 167 -95 170 -95 2 0 3 44 2 97 l-3 98 -60 37 c-33 20 -89 54 -125 74 -36 21 -78 47 -95 59 -16 12 -38 25 -47 28 -16 5 -18 20 -18 101 0 52 3 97 8 99 4 3 85 -42 180 -99 95 -57 175 -104 177 -104 3 0 5 41 5 90 0 50 4 90 9 90 4 0 19 -8 32 -18 13 -10 50 -33 82 -51 l58 -33 -3 212 -3 211 23 -6 c13 -3 55 -26 93 -52 l69 -46 0 -196 c0 -181 1 -197 19 -206 10 -6 45 -24 78 -42 34 -18 63 -29 67 -26 3 3 3 91 0 195 l-7 188 44 -24 c24 -13 89 -48 145 -80 55 -31 105 -56 110 -56 10 0 84 120 84 136 0 10 -68 54 -197 128 -46 27 -83 51 -83 54 0 4 44 31 98 61 111 62 202 120 202 129 0 4 -34 28 -75 54 -88 57 -67 61 -269 -59 l-139 -83 -41 25 c-22 13 -62 35 -88 47 -26 13 -48 25 -48 28 0 3 30 21 68 40 37 19 87 46 112 60 149 87 190 113 190 119 0 3 -19 16 -42 29 -24 12 -56 33 -72 45 l-29 24 61 37 c34 21 62 41 62 45 0 10 -53 46 -133 90 -32 17 -79 45 -105 61 -26 16 -62 37 -79 47 l-33 17 80 43 c44 24 87 43 96 43 16 0 84 -36 238 -127 50 -29 95 -53 101 -53 13 0 155 92 155 100 0 8 -266 173 -295 184 -19 7 -19 8 7 29 14 12 76 51 137 87 61 35 111 69 111 76 0 6 -11 36 -23 65 -13 30 -27 62 -30 72 -6 17 -9 17 -45 -2 -48 -24 -186 -108 -230 -140 -18 -13 -36 -21 -38 -18 -3 3 -5 91 -4 196 0 105 -1 191 -4 191 -8 0 -130 -72 -148 -88 -16 -13 -18 -37 -18 -208 l0 -193 -47 -27 c-27 -15 -65 -37 -85 -51 -34 -21 -38 -22 -39 -6 -1 10 -1 107 0 216 0 108 -3 197 -7 197 -4 0 -39 -20 -76 -45 -38 -25 -71 -45 -72 -45 -2 0 -4 41 -4 90 0 50 -3 90 -7 90 -5 0 -24 -10 -44 -23 -155 -94 -328 -197 -334 -197 -3 0 -4 46 -3 101 l3 102 170 101 c154 92 170 104 169 129 -4 191 -2 179 -25 165 -12 -7 -29 -18 -38 -23 -9 -6 -43 -26 -76 -46 -33 -19 -87 -54 -120 -77 -33 -23 -65 -42 -72 -42 -9 0 -12 43 -11 168 l2 167 -87 3 -87 3 0 -172z m530 -783 l0 -193 -92 -56 c-158 -94 -253 -145 -260 -140 -5 2 -8 87 -8 187 l0 184 68 41 c37 22 114 70 172 105 58 36 108 65 113 65 4 1 7 -86 7 -193z m-791 143 c42 -23 118 -67 168 -98 l93 -56 0 -193 0 -192 -67 35 c-72 37 -96 51 -208 119 l-70 43 -3 191 c-1 106 1 192 4 192 4 0 41 -19 83 -41z m-74 -565 c61 -35 138 -79 173 -96 34 -18 62 -35 62 -38 0 -6 -4 -8 -201 -122 l-146 -84 -34 23 c-19 13 -80 50 -137 81 -196 109 -189 103 -144 121 15 6 90 49 167 96 77 46 142 84 145 84 3 0 55 -29 115 -65z m1049 18 c45 -27 123 -73 175 -102 79 -46 91 -56 76 -65 -9 -5 -36 -22 -59 -36 -79 -50 -279 -160 -286 -157 -4 2 -31 18 -61 36 -30 18 -105 63 -166 99 -99 57 -132 83 -105 83 10 0 303 167 317 181 15 15 24 12 109 -39z m-714 -516 l0 -194 -37 -23 c-21 -12 -95 -58 -165 -101 -70 -43 -132 -78 -138 -78 -6 0 -10 69 -10 200 l0 200 48 24 c26 13 101 56 167 95 66 39 123 71 128 71 4 0 7 -87 7 -194z m247 157 c36 -21 91 -52 122 -69 31 -17 79 -44 106 -61 l50 -29 3 -193 2 -193 -23 6 c-26 6 -59 25 -222 125 l-110 67 -3 192 c-1 106 0 192 4 192 3 0 35 -17 71 -37z';

// Mark center (O ring centroid). Both groups pivot here so the spin shares one point.
const CX = 255.9;
const CY = 265.2;
// A 500-square viewBox centered on the mark leaves room for the breathe glow without clipping.
const VIEW_BOX = '5.9 15.2 500 500';
// Reproduces the lockup's path-space transform so the raw coordinates above render in place.
const MARK_TRANSFORM = 'translate(0 630) scale(0.1 -0.1)';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

// Named sizes mirror the px footprint of the prior ring spinner so swaps stay 1:1.
const SIZE_PX: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 40, xl: 56 };

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface OdysseusSpinnerProps {
  /** A named size token (sm/md/lg/xl) or an explicit pixel size (square). */
  size?: SpinnerSize | number;
  /** Seconds per full revolution of the O ring (clockwise). */
  ringDuration?: number;
  /** Seconds per full revolution of the snowflake (counter-clockwise). */
  flakeDuration?: number;
  /** Overlay the phosphor breathe (opacity pulse) used on the boot splash. */
  breathe?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function OdysseusSpinner({
  size = 'md',
  ringDuration = 15,
  flakeDuration = 10,
  breathe = false,
  className = '',
  'aria-label': ariaLabel = 'Loading',
}: OdysseusSpinnerProps) {
  const reduced = usePrefersReducedMotion();
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const style: CSSProperties = { display: 'inline-block', width: px, height: px };

  return (
    <svg
      viewBox={VIEW_BOX}
      role="status"
      aria-label={ariaLabel}
      className={`${breathe ? 'phosphor-breathe ' : ''}${className}`}
      style={style}
      fill="currentColor"
    >
      <g>
        <g transform={MARK_TRANSFORM}>
          <path d={RING_OUTER} />
          <path d={RING_CREST} />
        </g>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from={`0 ${CX} ${CY}`}
            to={`360 ${CX} ${CY}`}
            dur={`${ringDuration}s`}
            repeatCount="indefinite"
          />
        )}
      </g>
      <g>
        <g transform={MARK_TRANSFORM}>
          <path d={SNOWFLAKE} />
        </g>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from={`0 ${CX} ${CY}`}
            to={`-360 ${CX} ${CY}`}
            dur={`${flakeDuration}s`}
            repeatCount="indefinite"
          />
        )}
      </g>
    </svg>
  );
}
