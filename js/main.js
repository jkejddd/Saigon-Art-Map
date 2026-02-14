document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const loadSVG = () => {
        fetch('roads.svg')
            .then(res => res.text())
            .then(svgText => {
                const container = document.getElementById('roads');
                const template = document.createElement('template');
                template.innerHTML = svgText.trim();
                const svg = template.content.querySelector('svg');

                if (!svg) {
                    console.error('SVG not found in response');
                    return;
                }

                svg.setAttribute('preserveAspectRatio', 'xMaxYMax slice');
                svg.style.display = 'block';
                svg.style.overflow = 'hidden';

                container.innerHTML = '';
                container.appendChild(svg);

                const elements = Array.from(svg.querySelectorAll('path, rect, polygon, ellipse, circle'));
                console.log(`Found ${elements.length} elements to animate`);

                const svgWidth = svg.viewBox.baseVal.width || svg.clientWidth;
                const svgHeight = svg.viewBox.baseVal.height || svg.clientHeight;

                const chunkSize = 50;
                let currentIndex = 0;
                const elementsWithData = [];

                const processChunk = () => {
                    const end = Math.min(currentIndex + chunkSize, elements.length);

                    for (let i = currentIndex; i < end; i++) {
                        const el = elements[i];
                        const bbox = el.getBBox();
                        const cx = bbox.x + bbox.width;
                        const cy = bbox.y + bbox.height;
                        const dx = svgWidth - cx;
                        const dy = svgHeight - cy;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        let length = 0;
                        if (el.tagName === 'path') {
                            length = el.getTotalLength();
                        }
                        elementsWithData.push({ el, distance, length });
                    }

                    currentIndex = end;

                    if (currentIndex < elements.length) {
                        if ('requestIdleCallback' in window) {
                            requestIdleCallback(processChunk);
                        } else {
                            setTimeout(processChunk, 0);
                        }
                    } else {
                        setupAnimations(elementsWithData);
                    }
                };

                const setupAnimations = (data) => {
                    data.sort((a, b) => a.distance - b.distance);

                    const animationChunkSize = 50;
                    let animationIndex = 0;

                    const processAnimationChunk = () => {
                        const end = Math.min(animationIndex + animationChunkSize, data.length);

                        requestAnimationFrame(() => {
                            for (let i = animationIndex; i < end; i++) {
                                const { el, length } = data[i];
                                const strokeColor = '#E76F51';
                                const fillColor = '#EEE';

                                el.style.stroke = strokeColor;
                                el.style.fill = fillColor;
                                el.style.strokeWidth = '2px';

                                if (el.tagName === 'path') {
                                    el.style.setProperty('--length', length + 'px');
                                }

                                const delay = isMobile ? i * 0.05 : i * 0.1;
                                el.style.setProperty('--delay', delay + 's');
                            }

                            animationIndex = end;

                            if (animationIndex < data.length) {
                                if ('requestIdleCallback' in window) {
                                    requestIdleCallback(processAnimationChunk);
                                } else {
                                    setTimeout(processAnimationChunk, 0);
                                }
                            } else {
                                requestAnimationFrame(() => {
                                    document.body.classList.add('animate-roads');
                                });
                            }
                        });
                    };

                    processAnimationChunk();
                };

                processChunk();

            })
            .catch(err => console.error('Error loading SVG:', err));
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadSVG, { timeout: 2000 });
    } else {
        setTimeout(loadSVG, 100);
    }

    const roadsContainer = document.getElementById('roads');
    const scrollHint = document.querySelector('.scroll-hint');


});

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('artForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const status = document.getElementById('form-status');
        status.textContent = 'Submitting...';
        status.className = 'status-message show';



        const data = {
            gname: form.gname.value,
            address: form.address.value,
            govname: form.govname.value,
            email: form.email.value,
            phonenum: form.phonenum.value,
            website: form.website.value,
            typeofplace: form['typeofplace'].value,
            details: form.details.value
        };

        const params = new URLSearchParams();
        for (const key in data) {
            params.append(key, data[key]);
        }

        try {
            const response = await fetch('https://cors-proxy.qs5q9nxh8d.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            const responseText = await response.text();

            if (response.ok) {
                status.textContent = '✅ Submitted successfully!';
                status.classList.add('success');
                form.reset();
            } else {
                status.textContent = '❌ Error: ' + responseText;
                status.classList.add('error');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            status.textContent = '❌ Network error: ' + err.message;
            status.classList.add('error');
        }
    });
});
