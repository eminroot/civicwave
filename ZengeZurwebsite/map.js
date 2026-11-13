/* ==================================================================
   The dashboard's map: a real street map, MapLibre GL drawing
   OpenFreeMap's OpenStreetMap tiles (free, no key). Reports sit on top
   as a clustered layer: dots close together merge into a count and
   split as you zoom in. Hover a dot for its title, click it to pick it.

   Also the place lookups: which of Baku's districts, or which economic
   region, a point falls in, from the outlines in map-regions.js.
   ================================================================== */
(function () {
  'use strict';

  const DATA = window.AZ_MAP;
  const P = DATA.projection;
  const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  // The camera leans back and turns a little so the buildings stand up.
  const TILT = { pitch: 55, bearing: -17 };
  const BLUE = '#1b55b8';
  const STOP = '#a4433a';

  /* ------------------------------------------------- places */

  // map-regions.js stores outlines projected for SVG; these convert both ways.
  const project = (lng, lat) => [P.PAD + (lng - P.LON_MIN) * P.KX * P.SCALE, P.PAD + (P.LAT_MAX - lat) * P.SCALE];
  const unproject = (x, y) => [(x - P.PAD) / (P.KX * P.SCALE) + P.LON_MIN, P.LAT_MAX - (y - P.PAD) / P.SCALE];

  function parseRings(d) {
    const rings = [];
    let ring = null;
    const re = /([MLZ])([^MLZ]*)/g;
    let m;
    while ((m = re.exec(d))) {
      if (m[1] === 'Z') {
        if (ring && ring.length) rings.push(ring);
        ring = null;
        continue;
      }
      const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (m[1] === 'M' && i === 0) {
          if (ring && ring.length) rings.push(ring);
          ring = [];
        }
        ring.push([nums[i], nums[i + 1]]);
      }
    }
    if (ring && ring.length) rings.push(ring);
    return rings;
  }

  function inside(x, y, rings) {
    let hit = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  }

  function segmentDist2(px, py, [ax, ay], [bx, by]) {
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    const qx = ax + t * dx - px;
    const qy = ay + t * dy - py;
    return qx * qx + qy * qy;
  }

  const REGIONS = DATA.regions.map((r) => ({ kind: 'region', key: r.key, name: r.name, rings: parseRings(r.d) }));
  const DISTRICTS = (DATA.districts || []).map((r) => ({ kind: 'district', key: r.key, name: r.name, rings: parseRings(r.d) }));

  /** Nearest area whose edge is within `limit` (in projected units, 1 ≈ 500 m). */
  function nearest(list, x, y, limit) {
    let best = null;
    let bestD = limit * limit;
    for (const a of list) {
      for (const ring of a.rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
          const d = segmentDist2(x, y, ring[j], ring[i]);
          if (d < bestD) {
            bestD = d;
            best = a.key;
          }
        }
      }
    }
    return best;
  }

  /** The economic region a point falls in; a point just off the simplified coast
   *  goes to the nearest region within ~10 km. */
  function regionAt(lng, lat) {
    const [x, y] = project(lng, lat);
    for (const a of REGIONS) if (inside(x, y, a.rings)) return a.key;
    return nearest(REGIONS, x, y, 20);
  }

  /** The Baku district a point falls in, or null outside the city. Districts were
   *  simplified one by one, so a point on a shared street can land in a hairline
   *  gap between two of them: it goes to the nearest within ~250 m. */
  function districtAt(lng, lat) {
    const [x, y] = project(lng, lat);
    for (const a of DISTRICTS) if (inside(x, y, a.rings)) return a.key;
    return nearest(DISTRICTS, x, y, 0.5);
  }

  /** Rings to GeoJSON polygons in longitude and latitude, holes kept as holes. */
  function polygonsOf(rings) {
    const outers = [];
    const holes = [];
    rings.forEach((r, i) => {
      const depth = rings.filter((o, j) => j !== i && inside(r[0][0], r[0][1], [o])).length;
      (depth % 2 ? holes : outers).push(r);
    });
    const polys = outers.map((o) => [o]);
    for (const h of holes) {
      const host = polys.find((p) => inside(h[0][0], h[0][1], [p[0]]));
      if (host) host.push(h);
    }
    return polys.map((poly) =>
      poly.map((ring) => {
        const pts = ring.map(([x, y]) => unproject(x, y));
        pts.push(pts[0]);
        return pts;
      }),
    );
  }

  const AREAS = {
    type: 'FeatureCollection',
    features: [...REGIONS, ...DISTRICTS].map((a) => ({
      type: 'Feature',
      properties: { id: `${a.kind}:${a.key}`, name: a.name },
      geometry: { type: 'MultiPolygon', coordinates: polygonsOf(a.rings) },
    })),
  };

  function areaBounds(kind, key) {
    const a = (kind === 'district' ? DISTRICTS : REGIONS).find((x) => x.key === key);
    if (!a) return null;
    let w = 180;
    let s = 90;
    let e = -180;
    let n = -90;
    for (const ring of a.rings) {
      for (const [x, y] of ring) {
        const [lng, lat] = unproject(x, y);
        w = Math.min(w, lng);
        e = Math.max(e, lng);
        s = Math.min(s, lat);
        n = Math.max(n, lat);
      }
    }
    return [[w, s], [e, n]];
  }

  /* --------------------------------------------------- the map */

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>',
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const is3d = (map) => map.getPitch() > 5;

  const toFeatures = (reports) => ({
    type: 'FeatureCollection',
    features: reports.map((r) => ({
      type: 'Feature',
      properties: { id: r.id, title: r.title, sub: r.sub || '', w: r.w || 2, state: r.state || 'open' },
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
    })),
  });

  /**
   * Draws a street map into `host`.
   *   compact    a small fixed map without controls (a report's page)
   *   onPick(id) a report dot was clicked
   *   ariaLabel
   */
  function create(host, options = {}) {
    const o = { compact: false, onPick: null, ariaLabel: 'Xəritə', ...options };
    const wrap = document.createElement('div');
    wrap.className = `cmap${o.compact ? ' cmap--compact' : ''}`;
    const canvas = document.createElement('div');
    canvas.className = 'cmap__canvas';
    canvas.setAttribute('role', 'region');
    canvas.setAttribute('aria-label', o.ariaLabel);
    wrap.append(canvas);
    host.append(wrap);

    let reports = [];
    let selected = null;
    let area = null;
    let ready = false;
    let destroyed = false;
    let firstFit = true;

    const offline = () => {
      wrap.classList.add('is-off');
      canvas.innerHTML = '<p class="cmap__off">Xəritə yüklənmədi. İnternet bağlantısını yoxlayın.</p>';
    };

    const stub = {
      setReports() { return stub; },
      select() { return stub; },
      showArea() { return stub; },
      fitReports() { return stub; },
      destroy() { wrap.remove(); },
    };
    if (!window.maplibregl) {
      offline();
      return stub;
    }

    const map = new maplibregl.Map({
      container: canvas,
      style: STYLE,
      center: [49.88, 40.385],
      zoom: 12,
      minZoom: 6,
      maxZoom: 18.5,
      maxPitch: 70,
      ...TILT,
      attributionControl: false,
      interactive: !o.compact,
      fadeDuration: 150,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    if (!o.compact) {
      const ctrl = document.createElement('div');
      ctrl.className = 'cmap__ctrl';
      ctrl.setAttribute('role', 'group');
      ctrl.setAttribute('aria-label', 'Miqyas');
      ctrl.innerHTML = `<button type="button" data-z="in" aria-label="Yaxınlaşdır">${ICON.plus}</button><button type="button" data-z="out" aria-label="Uzaqlaşdır">${ICON.minus}</button><button type="button" data-z="fit" aria-label="Bütün müraciətləri göstər">${ICON.fit}</button><button type="button" data-z="tilt" class="cmap__tilt" aria-label="Düz xəritə">2D</button>`;
      const tiltBtn = ctrl.querySelector('[data-z="tilt"]');
      // The button names the view it switches to.
      const syncTilt = () => {
        const flat = !is3d(map);
        tiltBtn.textContent = flat ? '3D' : '2D';
        tiltBtn.setAttribute('aria-label', flat ? 'Üçölçülü xəritə' : 'Düz xəritə');
      };
      map.on('pitchend', syncTilt);
      ctrl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-z]');
        if (!b) return;
        if (b.dataset.z === 'in') map.zoomIn();
        if (b.dataset.z === 'out') map.zoomOut();
        if (b.dataset.z === 'fit') api.fitReports();
        if (b.dataset.z === 'tilt') map.easeTo({ ...(is3d(map) ? { pitch: 0, bearing: 0 } : TILT), duration: 600 });
      });
      wrap.append(ctrl);
    }

    const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'cmap__tip', maxWidth: '260px' });

    const areaFilter = () => ['==', ['get', 'id'], area || ''];
    const selFilter = () => ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selected || '']];

    function sync() {
      if (!ready) return;
      map.getSource('reports').setData(toFeatures(reports));
      map.setFilter('report-halo', selFilter());
    }

    map.on('load', () => {
      if (destroyed) return;
      ready = true;
      // The style prefers English names; the dashboard is Azerbaijani, so labels use
      // the Azerbaijani name, then the local name in Latin letters.
      for (const layer of map.getStyle().layers) {
        if (layer.type !== 'symbol') continue;
        const field = map.getLayoutProperty(layer.id, 'text-field');
        if (field && JSON.stringify(field).includes('"name')) {
          map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:az'], ['get', 'name:latin'], ['get', 'name']]);
        }
      }
      // Buildings rise one zoom level earlier than the style has them, so the district
      // overview already looks 3D; the flat footprints they replace are hidden.
      if (map.getLayer('building-3d')) {
        map.setLayerZoomRange('building-3d', 13, 24);
        map.setPaintProperty('building-3d', 'fill-extrusion-color', '#d6d2cb');
        map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.9);
        if (map.getLayer('building')) map.setLayoutProperty('building', 'visibility', 'none');
      }

      // The district outlines are simplified and cut across the bay on a real map, so
      // they only frame the view (showArea) and are not drawn.

      map.addSource('reports', { type: 'geojson', data: EMPTY, cluster: !o.compact, clusterRadius: 42, clusterMaxZoom: 15 });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': BLUE,
          'circle-radius': ['step', ['get', 'point_count'], 15, 5, 19, 20, 24],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-opacity': 0.95,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12.5, 'text-allow-overlap': true },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'report-halo',
        type: 'circle',
        source: 'reports',
        filter: selFilter(),
        paint: { 'circle-color': BLUE, 'circle-opacity': 0.22, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 13, 16, 20] },
      });
      map.addLayer({
        id: 'report-dot',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['+', 4, ['get', 'w']], 16, ['+', 6, ['*', 1.5, ['get', 'w']]]],
          'circle-color': ['match', ['get', 'state'], 'over', STOP, 'done', '#ffffff', BLUE],
          'circle-stroke-color': ['match', ['get', 'state'], 'done', '#242426', '#ffffff'],
          'circle-stroke-width': ['match', ['get', 'state'], 'done', 1.5, 2.5],
        },
      });
      sync();
      if (firstFit && !o.compact) api.fitReports(false);
    });

    map.on('error', (e) => {
      // A style that cannot load leaves an empty canvas; say so instead.
      if (!ready && e && e.error && /style|Failed to fetch/i.test(String(e.error.message || ''))) offline();
    });

    map.on('mouseenter', 'report-dot', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      tip
        .setLngLat(f.geometry.coordinates)
        .setHTML(`<b>${esc(f.properties.title)}</b>${f.properties.sub ? `<span>${esc(f.properties.sub)}</span>` : ''}${o.onPick ? '<em>Seçmək üçün klikləyin</em>' : ''}`)
        .addTo(map);
    });
    map.on('mouseleave', 'report-dot', () => {
      map.getCanvas().style.cursor = '';
      tip.remove();
    });
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('click', 'report-dot', (e) => {
      if (o.onPick) o.onPick(String(e.features[0].properties.id));
    });
    map.on('click', 'clusters', async (e) => {
      const f = e.features[0];
      try {
        const zoom = await map.getSource('reports').getClusterExpansionZoom(f.properties.cluster_id);
        map.easeTo({ center: f.geometry.coordinates, zoom: zoom + 0.3 });
      } catch {
        map.easeTo({ center: f.geometry.coordinates, zoom: map.getZoom() + 2 });
      }
    });

    const api = {
      /** reports: [{ id, lng, lat, title, sub, w (1 to 4), state: open | over | done }] */
      setReports(list) {
        reports = list || [];
        sync();
        return api;
      },
      /** Rings one report and, with `fly`, moves to it. */
      select(id, { fly = true, zoom = 16 } = {}) {
        selected = id || null;
        sync();
        const r = reports.find((x) => x.id === selected);
        if (r && fly) map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), zoom), duration: 700, essential: true });
        return api;
      },
      /** Outlines a district or region (or none) and fits it in view. */
      showArea(kind, key, { fit = true } = {}) {
        area = kind && key ? `${kind}:${key}` : null;
        sync();
        const b = area ? areaBounds(kind, key) : null;
        if (b && fit) map.fitBounds(b, { padding: 40, duration: 700, maxZoom: 15 });
        else if (!area && fit) api.fitReports();
        return api;
      },
      /** Every report in view, or Xətai when there are none. */
      fitReports(animate = true) {
        firstFit = false;
        const pts = reports.map((r) => [r.lng, r.lat]);
        const opts = { padding: 60, maxZoom: 15, duration: animate ? 700 : 0 };
        if (!pts.length) {
          map.fitBounds(areaBounds('district', 'khatai') || [[49.84, 40.35], [49.98, 40.41]], opts);
        } else if (pts.length === 1) {
          map.jumpTo({ center: pts[0], zoom: 15 });
        } else {
          const lngs = pts.map((p) => p[0]);
          const lats = pts.map((p) => p[1]);
          map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], opts);
        }
        return api;
      },
      /** Jumps to a point without animating (a report's own small map). */
      center(lng, lat, zoom = 15.5) {
        firstFit = false;
        map.jumpTo({ center: [lng, lat], zoom });
        return api;
      },
      destroy() {
        destroyed = true;
        tip.remove();
        map.remove();
        wrap.remove();
      },
    };
    // The container may get its final size after this call.
    setTimeout(() => !destroyed && map.resize(), 60);
    return api;
  }

  window.CivicGeo = {
    regionAt,
    districtAt,
    regions: REGIONS.map(({ key, name }) => ({ key, name })),
    districts: DISTRICTS.map(({ key, name }) => ({ key, name })),
  };
  window.CivicMap = { create };
})();
