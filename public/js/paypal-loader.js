// PayPal SDK Lazy Loader
// Lädt PayPal SDK nur wenn der Donate-Button sichtbar wird
(function() {
    'use strict';

    let paypalLoaded = false;
    const container = document.getElementById('donate-button-container');

    if (!container) {
        console.warn('PayPal donate container not found');
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !paypalLoaded) {
                paypalLoaded = true;
                loadPayPalSDK();
                observer.disconnect();
            }
        });
    }, { rootMargin: '100px' });

    observer.observe(container);

    function loadPayPalSDK() {
        const script = document.createElement('script');
        script.src = 'https://www.paypalobjects.com/donate/sdk/donate-sdk.js';
        script.charset = 'UTF-8';
        script.onload = initializePayPalButton;
        script.onerror = () => {
            console.error('Fehler beim Laden des PayPal SDK');
        };
        document.body.appendChild(script);
    }

    function initializePayPalButton() {
        if (typeof PayPal === 'undefined' || !PayPal.Donation) {
            console.error('PayPal SDK nicht verfügbar');
            return;
        }

        PayPal.Donation.Button({
            env: 'production',
            hosted_button_id: 'DRTBYRML7NHSA',
            image: {
                src: 'https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donate_SM.gif',
                alt: 'Spenden mit dem PayPal-Button',
                title: 'PayPal - The safer, easier way to pay online!',
            }
        }).render('#donate-button');
    }
})();
