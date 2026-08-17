// ============================================================================
// metrics.ts — plain-language explanations for every planning parameter and
// dashboard/analytics metric. These are surfaced via the InfoTip ("i") buttons
// so a non-domain user can understand what each value means and how to use it.
// ============================================================================

export const metric = {
  // ---- Mission Planner parameters -------------------------------------------
  site_name: {
    title: "Survey Site",
    body:
      "A human-readable label for the physical location being surveyed (for example “Q3 Solar Farm” or “North Warehouse Lot”). " +
      "It is used to identify the mission in reports and on the live monitor, and has no effect on the generated flight path.",
  },
  drone_id: {
    title: "Assigned Aircraft",
    body:
      "The drone that will carry out this mission. Only aircraft marked “Available” can be picked — an in-mission, charging, " +
      "or maintenance unit is greyed out. If you leave this on “Auto-assign”, SkyGrid picks the first available aircraft when " +
      "you launch the mission.",
  },
  pattern_grid: {
    title: "Grid Pattern",
    body:
      "Flies parallel back-and-forth passes across the survey area in a single direction, like mowing a lawn. " +
      "It is the most time- and battery-efficient pattern and is ideal for flat, open sites such as fields, solar farms, or parking lots.",
  },
  pattern_crosshatch: {
    title: "Crosshatch Pattern",
    body:
      "Runs the grid twice — once horizontally and once at 90° — producing an X-shaped web of passes. " +
      "The second sweep captures the site from a perpendicular angle, giving photogrammetry software far more overlap to work with. " +
      "Use it for detailed 3D reconstruction or when the site has vertical features that a single direction would miss.",
  },
  pattern_perimeter: {
    title: "Perimeter Pattern",
    body:
      "Traces the boundary of the survey area instead of covering its interior, including an inset ring offset from the edge. " +
      "It is the right choice for fence-line inspection, security patrols, and checking the edges of a facility for damage or intrusion.",
  },
  altitude: {
    title: "Flight Altitude",
    body:
      "How high the drone flies while surveying (meters above ground). Altitude drives two things at once: " +
      "the ground footprint of the camera (higher = wider swath = fewer passes) and the level of detail captured " +
      "(higher = coarser images). For typical site mapping, 60–100 m balances coverage and detail. Clamp: 20–120 m.",
  },
  speed: {
    title: "Cruise Speed",
    body:
      "The forward speed of the drone between waypoints, in meters per second. Higher speed finishes the mission sooner " +
      "and uses less battery, but introduces motion blur and can reduce image sharpness. Clamp: 4–25 m/s.",
  },
  overlap: {
    title: "Pass Overlap",
    body:
      "The percentage of sideways overlap between neighbouring flight passes. Photogrammetry and orthomosaic stitching " +
      "need overlapping images to align. Higher overlap = more redundancy and better 3D reconstruction, at the cost of " +
      "more flight time and images. Typical survey missions use 60–80%. Clamp: 0–95%.",
  },
  cadence: {
    title: "Sensor Cadence",
    body:
      "How often the sensor captures a frame, in seconds. A shorter cadence (e.g. every 1s) captures more images for a " +
      "given flight, which increases detail but also the data volume to process. A longer cadence suits quick progress checks. " +
      "Clamp: 1–30 s.",
  },
  swath: {
    title: "Swath Factor",
    body:
      "The width of the ground strip each pass covers, expressed as a multiple of altitude. With the default factor of 2.0, " +
      "a drone at 80 m covers a ~160 m-wide strip. A larger swath covers more ground per pass (fewer passes, faster mission); " +
      "a smaller one captures finer detail. Clamp: 1×–6×.",
  },

  // ---- Overview dashboard metrics -------------------------------------------
  ov_fleet: {
    title: "Fleet",
    body:
      "Total aircraft registered to your organization. The sub-line splits the fleet into those available for new missions, " +
      "those currently deployed, and grounded units (charging, maintenance, or offline).",
  },
  ov_active: {
    title: "Active Missions",
    body:
      "Surveys currently in flight — including missions that are launching, in progress, or paused by an operator. " +
      "Completed and aborted missions are not counted here.",
  },
  ov_flight_time: {
    title: "Flight Time",
    body:
      "Cumulative airborne hours across the fleet. For finished missions this is the actual flight duration; for planned " +
      "ones it uses the engine’s estimate. It is a proxy for how much surveying capacity your organization has actually used.",
  },
  ov_coverage: {
    title: "Org Coverage",
    body:
      "The average survey coverage across all completed missions. Coverage represents how much of the planned area was " +
      "actually captured by the drone — 100% means the whole site was flown as planned.",
  },

  // ---- Analytics metrics ----------------------------------------------------
  an_total: {
    title: "Total Surveys",
    body:
      "Every mission created in this organization, in any status. The sub-line breaks them into completed and aborted so " +
      "you can quickly see success rate.",
  },
  an_flight_hours: {
    title: "Flight Hours",
    body:
      "Accumulated airborne time across the fleet (actual for completed/aborted missions, estimated for planned ones). " +
      "This is the same figure shown on the Overview — it measures operational throughput over time.",
  },
  an_distance: {
    title: "Distance Flown",
    body:
      "The cumulative route length surveyed in kilometers — actual for finished missions, planned for those not yet flown. " +
      "Combined with area, it tells you how much ground the fleet has covered.",
  },
  an_frames: {
    title: "Frames Captured",
    body:
      "The number of images the sensor has captured (or is estimated to capture) across all missions. Frames are the raw " +
      "material for orthomosaic maps and 3D models — more frames typically means higher-resolution deliverables.",
  },

  // ---- Analytics charts ------------------------------------------------------
  ch_throughput: {
    title: "Survey Throughput",
    body:
      "Missions created and distance flown per day over the last two weeks. A rising trend shows the team shipping more " +
      "survey capacity; flat or falling numbers can flag capacity or fleet-availability issues.",
  },
  ch_status: {
    title: "Mission Status Mix",
    body:
      "The share of missions in each state. A large “Aborted” slice suggests battery, weather, or planning problems worth " +
      "investigating; a healthy mix is dominated by Completed.",
  },
  ch_coverage: {
    title: "Coverage per Mission",
    body:
      "What percentage of the planned area each recent mission actually captured. Bars below 100% indicate an aborted or " +
      "partially completed flight — the site may need a re-fly.",
  },
  ch_patterns: {
    title: "Pattern Utilization",
    body:
      "How often each survey pattern (grid, crosshatch, perimeter) is used across your missions. It reveals team habits — " +
      "for example, if everything is crosshatch, simple open sites could be flown faster with a plain grid.",
  },
} as const;

export type MetricKey = keyof typeof metric;