document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const loadSVG = () => {
        console.log('Loading SVG...');
        fetch('roads.svg')
            .then(res => res.text())
            .then(svgText => {
                const container = document.getElementById('roads');
                container.innerHTML = svgText;

                const svg = container.querySelector('svg');
                if (!svg) {
                    console.error('SVG not found in response');
                    return;
                }
                svg.setAttribute('preserveAspectRatio', 'xMaxYMax meet');
                svg.style.display = 'block';
                svg.style.overflow = 'hidden';

                const elements = Array.from(svg.querySelectorAll('path, rect, polygon, ellipse, circle'));
                console.log(`Found ${elements.length} elements to animate`);

                const svgWidth = svg.viewBox.baseVal.width || svg.clientWidth;
                const svgHeight = svg.viewBox.baseVal.height || svg.clientHeight;

                const distanceFromBottomRight = (el) => {
                    const bbox = el.getBBox();
                    const cx = bbox.x + bbox.width;
                    const cy = bbox.y + bbox.height;
                    const dx = svgWidth - cx;
                    const dy = svgHeight - cy;
                    return Math.sqrt(dx * dx + dy * dy);
                };

                const elementsWithData = elements.map(el => {
                    const distance = distanceFromBottomRight(el);
                    let length = 0;
                    if (el.tagName === 'path') {
                        length = el.getTotalLength();
                    }
                    return { el, distance, length };
                });

                elementsWithData.sort((a, b) => a.distance - b.distance);

                requestAnimationFrame(() => {
                    elementsWithData.forEach(({ el, length }) => {
                        const origStroke = el.getAttribute('stroke');
                        const strokeColor = origStroke && origStroke !== 'none' ? origStroke : '#333';

                        el.style.stroke = strokeColor;
                        el.style.strokeWidth = '2px';
                        el.style.transition = 'none';

                        el.style.fillOpacity = '0';

                        if (el.tagName === 'path') {
                            el.style.strokeDasharray = length;
                            el.style.strokeDashoffset = length;
                            el.style.strokeOpacity = '1';
                        } else {
                            el.style.strokeOpacity = '0';
                        }
                    });

                    requestAnimationFrame(() => {
                        elementsWithData.forEach(({ el, length }, index) => {
                            const delay = isMobile ? index * 0.05 : index * 0.1;

                            if (el.tagName === 'path') {

                                el.animate(
                                    { strokeDashoffset: [length, 0] },
                                    { duration: 700, delay: delay * 1000, fill: 'forwards', easing: 'linear' }
                                );

                                el.animate(
                                    { fillOpacity: [0, 1] },
                                    { duration: 500, delay: (delay + 0.5) * 1000, fill: 'forwards', easing: 'ease-out' }
                                );

                                const fadeDelay = (delay + 0.7 + (isMobile ? 0.5 : 0.7)) * 1000;

                                el.animate(
                                    { strokeOpacity: [1, 0] },
                                    { duration: 400, delay: fadeDelay, fill: 'forwards', easing: 'ease' }
                                );

                            } else {
                                const duration = (isMobile ? 1 : 0.7) * 1000;
                                const hold = (isMobile ? 500 : 700);

                                el.animate(
                                    { strokeOpacity: [0, 1] },
                                    { duration: duration, delay: delay * 1000, fill: 'forwards', easing: 'ease' }
                                );
                                el.animate(
                                    { fillOpacity: [0, 1] },
                                    { duration: duration, delay: delay * 1000, fill: 'forwards', easing: 'ease' }
                                );

                                const fadeOutDelay = (delay * 1000) + hold;
                                el.animate(
                                    { strokeOpacity: [1, 0] },
                                    { duration: duration, delay: fadeOutDelay, fill: 'forwards', easing: 'ease' }
                                );
                            }
                        });
                    });
                });
            })
            .catch(err => console.error('Error loading SVG:', err));
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadSVG, { timeout: 2000 });
    } else {
        setTimeout(loadSVG, 100);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('artForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const status = document.getElementById('form-status');
        status.textContent = 'Submitting...';
        status.className = 'status-message show';

        const token = window.turnstile.getResponse();
        if (!token) {
            status.textContent = 'Please complete the CAPTCHA.';
            return;
        }

        const data = {
            gname: form.gname.value,
            address: form.address.value,
            govname: form.govname.value,
            email: form.email.value,
            phonenum: form.phonenum.value,
            website: form.website.value,
            typeofplace: form['typeofplace'].value,
            details: form.details.value,
            'cf-turnstile-response': token
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
                window.turnstile.reset();
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
