document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const loadSVG = () => {
        fetch('roads.svg')
            .then(res => res.text())
            .then(svgText => {
                const container = document.getElementById('roads');
                container.innerHTML = svgText;

                const svg = container.querySelector('svg');
                svg.setAttribute('preserveAspectRatio', 'xMaxYMax meet');
                svg.style.display = 'block';
                svg.style.overflow = 'hidden';

                const elements = Array.from(svg.querySelectorAll('path, rect, polygon, ellipse, circle'));

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

                const elementsWithDistance = elements.map(el => ({
                    el,
                    distance: distanceFromBottomRight(el)
                }));

                elementsWithDistance.sort((a, b) => a.distance - b.distance);

                requestAnimationFrame(() => {
                    elementsWithDistance.forEach(({ el }, index) => {
                        const origStroke = el.getAttribute('stroke');
                        const strokeColor = origStroke && origStroke !== 'none' ? origStroke : '#333';
                        el.setAttribute('stroke', strokeColor);
                        el.setAttribute('stroke-width', 2);
                        el.classList.add('fill-animate');

                        const delay = isMobile ? index * 50 : index * 100;
                        el.style.animationDelay = `${isMobile ? index * 0.05 : index * 0.1}s`;

                        if (el.tagName === 'path') {
                            const length = el.getTotalLength();
                            el.style.strokeDasharray = length;
                            el.style.strokeDashoffset = length;
                            el.style.strokeOpacity = 1;

                            setTimeout(() => {
                                requestAnimationFrame(() => {
                                    el.style.transition = 'stroke-dashoffset 0.7s linear, stroke-opacity 0.4s ease';
                                    el.style.strokeDashoffset = 0;
                                    setTimeout(() => el.style.strokeOpacity = 0, isMobile ? 500 : 700);
                                });
                            }, delay);
                        } else {
                            el.style.strokeOpacity = 0;
                            setTimeout(() => {
                                requestAnimationFrame(() => {
                                    el.style.transition = `stroke-opacity ${isMobile ? '1s' : '0.7s'} ease`;
                                    el.style.strokeOpacity = 1;
                                    setTimeout(() => el.style.strokeOpacity = 0, isMobile ? 500 : 700);
                                });
                            }, delay);
                        }
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
