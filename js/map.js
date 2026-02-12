document.addEventListener('DOMContentLoaded', () => {
    const mapSection = document.getElementById('map-section');
    let mapInitialized = false;

    const initMap = () => {
        if (mapInitialized) return;
        mapInitialized = true;

        const map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [106.7009, 10.7769],
            zoom: 8,
            maxTileCacheSize: 50,
            preserveDrawingBuffer: false,
            refreshExpiredTiles: false
        });

        const geojsonCache = {};

        const preloadGeoJSON = async (filename) => {
            if (!geojsonCache[filename]) {
                try {
                    const response = await fetch(filename);
                    geojsonCache[filename] = await response.json();
                } catch (error) {
                    console.error(`Error preloading ${filename}:`, error);
                }
            }
        };

        function removeMapLayers(layerIds) {
            layerIds.forEach(id => {
                if (map.getLayer(id)) map.removeLayer(id);
            });
        }

        function removeMapSources(sourceIds) {
            sourceIds.forEach(id => {
                if (map.getSource(id)) map.removeSource(id);
            });
        }

        map.on('load', () => {
            map.addSource('hcmcOverlay', {
                type: 'geojson',
                data: 'hcmc.geojson'
            });

            map.addLayer({
                id: 'greenFill',
                type: 'fill',
                source: 'hcmcOverlay',
                paint: { 'fill-color': 'green', 'fill-opacity': 0.1 }
            });

            map.addLayer({
                id: 'greenLine',
                type: 'line',
                source: 'hcmcOverlay',
                paint: { 'line-color': 'green', 'line-width': 1.5 }
            });

            const regions = [
                { name: "Thủ Dầu Một", coords: [106.6519, 10.9804], zoom: 11, file: "thudaumot.geojson" },
                { name: "Sài Gòn", coords: [106.7009, 10.7769], zoom: 11, file: "saigon.geojson" },
                { name: "Vũng Tàu", coords: [107.1362, 10.4114], zoom: 11, file: "vungtau.geojson" }
            ];

            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => regions.forEach(region => preloadGeoJSON(region.file)));
            } else {
                setTimeout(() => regions.forEach(region => preloadGeoJSON(region.file)), 1000);
            }

            const cityMarkers = [];
            let cityPopups = [];
            const backButton = document.getElementById('backButton');
            let activeInfoPopup = null;

            regions.forEach(region => {
                const popup = new maplibregl.Popup({
                    offset: 30,
                    closeButton: false,
                    closeOnClick: false,
                    anchor: 'bottom',
                    className: 'city-popup'
                }).setHTML(`<div class="textp">${region.name}</div>`);

                cityPopups.push(popup);

                const cityMarker = new maplibregl.Marker({ color: "#3FB1CE" })
                    .setLngLat(region.coords)
                    .setPopup(popup)
                    .addTo(map);

                cityMarker.togglePopup();

                cityMarker.getElement().addEventListener('click', async () => {
                    map.flyTo({ center: region.coords, zoom: region.zoom });

                    cityMarkers.forEach(m => m.getElement().style.display = 'none');
                    const mapLegend = document.getElementById('mapLegend');
                    backButton.style.display = 'block';
                    if (mapLegend) mapLegend.style.display = 'block';

                    cityPopups.forEach(p => p.remove());
                    cityPopups = [];
                    cityMarker.setPopup(null);

                    if (map.getLayer('points-layer')) map.removeLayer('points-layer');
                    if (map.getSource('points')) map.removeSource('points');

                    try {
                        const geojsonData = geojsonCache[region.file] || await (async () => {
                            const response = await fetch(region.file);
                            const data = await response.json();
                            geojsonCache[region.file] = data;
                            return data;
                        })();

                        map.addSource('points', {
                            type: 'geojson',
                            data: geojsonData,
                            cluster: geojsonData.features.length > 50,
                            clusterMaxZoom: 14,
                            clusterRadius: 50
                        });

                        map.addLayer({
                            id: 'points-layer',
                            type: 'circle',
                            source: 'points',
                            filter: ['!', ['has', 'point_count']],
                            paint: {
                                'circle-radius': 10,
                                'circle-color': [
                                    'match',
                                    ['get', 'type'],
                                    '2', '#E53935', // Gallery (Red)
                                    '5', '#FB8C00', // Art Space (Orange)
                                    '3', '#43A047', // Museum (Green)
                                    '1', '#03A9F4', // Publisher (Light Blue)
                                    '6', '#3F51B5', // F&B (Indigo)
                                    '7', '#9C27B0', // Art Class (Purple)
                                    '8', '#009688', // Art Studio (Teal)
                                    '4', '#FBC02D', // Art Shop (Gold)
                                    '9', '#6D4C41', // Public Display (Brown)
                                    '#ccc'
                                ],
                                'circle-stroke-color': '#fff',
                                'circle-stroke-width': 3
                            }
                        });

                        if (geojsonData.features.length > 50) {
                            map.addLayer({
                                id: 'clusters',
                                type: 'circle',
                                source: 'points',
                                filter: ['has', 'point_count'],
                                paint: {
                                    'circle-color': '#51bbd6',
                                    'circle-radius': [
                                        'step',
                                        ['get', 'point_count'],
                                        20, 10,
                                        30, 30,
                                        40
                                    ]
                                }
                            });

                            map.addLayer({
                                id: 'cluster-count',
                                type: 'symbol',
                                source: 'points',
                                filter: ['has', 'point_count'],
                                layout: {
                                    'text-field': '{point_count_abbreviated}',
                                    'text-size': 12
                                }
                            });

                            map.on('click', 'clusters', (e) => {
                                const features = map.queryRenderedFeatures(e.point, {
                                    layers: ['clusters']
                                });
                                const clusterId = features[0].properties.cluster_id;
                                map.getSource('points').getClusterExpansionZoom(
                                    clusterId,
                                    (err, zoom) => {
                                        if (err) return;
                                        map.easeTo({
                                            center: features[0].geometry.coordinates,
                                            zoom: zoom
                                        });
                                    }
                                );
                            });
                        }

                        map.on('click', 'points-layer', (e) => {
                            const feature = e.features[0];
                            const props = feature.properties;

                            if (activeInfoPopup) activeInfoPopup.remove();

                            const popupDiv = document.createElement('div');
                            popupDiv.className = 'markerPopup textp';

                            const eventListeners = new Map();

                            popupDiv.innerHTML = `
                    <button class="popupClose">×</button>
                    <h3>${props.name || ''}</h3>
                    ${props.description || ''}<br>
                    ${props.address || ''}<br>
                    ${props.phone ? '📞 ' + props.phone + '<br>' : ''}
                    ${props.email ? '✉️ <a id="email" href="mailto:' + props.email + '">' + props.email + '</a><br>' : ''}
                    ${props.website ? '<a href="' + props.website + '" target="_blank">Visit Website</a>' : ''}
                  `;

                            document.getElementById('mapContainer').appendChild(popupDiv);

                            popupDiv.querySelector('.popupClose').addEventListener('click', () => {
                                popupDiv.remove();
                                activeInfoPopup = null;
                            });

                            activeInfoPopup = {
                                remove: () => popupDiv.remove()
                            };
                        });

                        map.on('mouseenter', 'points-layer', () => {
                            map.getCanvas().style.cursor = 'pointer';
                        });

                        map.on('mouseleave', 'points-layer', () => {
                            map.getCanvas().style.cursor = '';
                        });

                    } catch (error) {
                        console.error('Error loading GeoJSON:', error);
                    }
                });
                cityMarkers.push(cityMarker);
            });

            function removeAllPopups() {
                cityPopups.forEach(p => p.remove());
                cityPopups = [];
            }

            backButton.addEventListener('click', () => {
                removeMapLayers(['points-layer', 'clusters', 'cluster-count']);
                removeMapSources(['points']);

                map.getCanvas().style.cursor = '';
                removeAllPopups();

                if (activeInfoPopup) {
                    activeInfoPopup.remove();
                    activeInfoPopup = null;
                }

                cityMarkers.forEach(marker => marker.getElement().style.display = 'block');
                map.flyTo({ center: [106.7009, 10.7769], zoom: 8 });
                const mapLegend = document.getElementById('mapLegend');
                backButton.style.display = 'none';
                if (mapLegend) mapLegend.style.display = 'none';

                regions.forEach((region, index) => {
                    const popup = new maplibregl.Popup({
                        offset: 30,
                        closeButton: false,
                        closeOnClick: false,
                        anchor: 'bottom'
                    }).setHTML(`<div class="textp">${region.name}</div>`);

                    cityPopups.push(popup);
                    cityMarkers[index].setPopup(popup).togglePopup();
                });
            });

            const toggle3DButton = document.getElementById('toggle3DButton');
            let is3D = false;

            toggle3DButton.addEventListener('click', () => {
                if (!is3D) {
                    map.easeTo({
                        pitch: 60,
                        bearing: 0,
                        duration: 1500
                    });
                    toggle3DButton.textContent = '2D View';
                    is3D = true;

                    if (!map.getLayer('3d-buildings')) {
                        map.addLayer({
                            'id': '3d-buildings',
                            'source': 'openmaptiles',
                            'source-layer': 'building',
                            'type': 'fill-extrusion',
                            'minzoom': 14,
                            'paint': {
                                'fill-extrusion-color': '#aaa',
                                'fill-extrusion-height': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    15,
                                    0,
                                    15.05,
                                    ['get', 'render_height']
                                ],
                                'fill-extrusion-base': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    15,
                                    0,
                                    15.05,
                                    ['get', 'render_min_height']
                                ],
                                'fill-extrusion-opacity': 0.6
                            }
                        });
                    }

                } else {
                    map.easeTo({
                        pitch: 0,
                        bearing: 0,
                        duration: 1000
                    });
                    toggle3DButton.textContent = '3D View';
                    is3D = false;
                }
            });
        });
    };

    const observer = new IntersectionObserver((entries) => {
        const isIntersecting = entries.some(entry => entry.isIntersecting);
        if (isIntersecting) {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    initMap();
                    observer.disconnect();
                });
            } else {
                requestAnimationFrame(() => {
                    initMap();
                    observer.disconnect();
                });
            }
        }
    }, {
        rootMargin: '200px'
    });

    if (mapSection) {
        observer.observe(mapSection);
    } else {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initMap);
        } else {
            setTimeout(initMap, 100);
        }
    }
});
