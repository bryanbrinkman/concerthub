import { cn } from "@/lib/utils";

/**
 * Stylized dot-matrix world map (equirectangular, 6°/cell) with show
 * markers. The land mask is hand-drawn and intentionally low-fi — it
 * reads as continents at a glance, matching the mono-dark UI. Pure SVG,
 * no client JS.
 */

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  label: string;
}

/** Per-row inclusive [startCol, endCol] land ranges. 60 cols × 25 rows;
 * col 0 = 180°W, row 0 = 90°N, 6° per cell. Antarctica omitted. */
const LAND: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  /* 84–90N */ [],
  /* 78–84N */ [[13, 17], [20, 26], [33, 33]],
  /* 72–78N */ [[8, 17], [19, 25], [40, 58]],
  /* 66–72N */ [[2, 17], [20, 24], [27, 27], [32, 59]],
  /* 60–66N */ [[2, 17], [21, 23], [27, 27], [31, 59]],
  /* 54–60N */ [[2, 4], [7, 17], [28, 29], [31, 57]],
  /* 48–54N */ [[9, 18], [28, 54]],
  /* 42–48N */ [[9, 19], [28, 37], [39, 53]],
  /* 36–42N */ [[9, 19], [28, 29], [34, 53]],
  /* 30–36N */ [[10, 19], [27, 49], [52, 52]],
  /* 24–30N */ [[10, 14], [18, 18], [27, 39], [41, 44], [46, 50]],
  /* 18–24N */ [[11, 17], [27, 39], [41, 43], [45, 48], [50, 51]],
  /* 12–18N */ [[13, 16], [27, 38], [41, 42], [45, 47], [50, 50]],
  /* 6–12N */ [[15, 20], [28, 38], [43, 43], [46, 49]],
  /* 0–6N */ [[16, 22], [30, 37], [45, 50], [52, 55]],
  /* 6S–0 */ [[16, 24], [30, 37], [47, 49], [52, 56]],
  /* 12–6S */ [[16, 24], [30, 37], [50, 52]],
  /* 18–12S */ [[18, 24], [30, 36], [37, 38], [48, 55]],
  /* 24–18S */ [[17, 23], [30, 35], [38, 38], [48, 56]],
  /* 30–24S */ [[18, 22], [31, 35], [48, 56]],
  /* 36–30S */ [[18, 21], [32, 34], [49, 55], [58, 59]],
  /* 42–36S */ [[18, 20], [54, 54], [58, 59]],
  /* 48–42S */ [[18, 19], [57, 58]],
  /* 54–48S */ [[18, 19]],
  /* 60–54S */ [],
];

const CELL = 10; // svg units per 6° cell
const WIDTH = 60 * CELL;
const HEIGHT = LAND.length * CELL;

const project = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * WIDTH,
  y: ((90 - lat) / 180) * (30 * CELL),
});

export function WorldMap({
  markers,
  className,
}: {
  markers: MapMarker[];
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="World map of recently archived shows"
      className={cn("h-auto w-full", className)}
    >
      {LAND.map((ranges, row) =>
        ranges.map(([start, end]) => {
          const dots = [];
          for (let col = start; col <= end; col++) {
            dots.push(
              <circle
                key={`${row}-${col}`}
                cx={col * CELL + CELL / 2}
                cy={row * CELL + CELL / 2}
                r={1.7}
                className="fill-white/15"
              />,
            );
          }
          return dots;
        }),
      )}
      {markers.map((marker) => {
        const { x, y } = project(marker.lat, marker.lon);
        if (y > HEIGHT) return null;
        return (
          <g key={marker.id}>
            <circle cx={x} cy={y} r={7} className="fill-primary/25" />
            <circle cx={x} cy={y} r={3} className="fill-primary" />
            <title>{marker.label}</title>
          </g>
        );
      })}
    </svg>
  );
}
