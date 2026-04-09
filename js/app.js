document.addEventListener('DOMContentLoaded', () => {
    let appData = {
        products: [],
        exchangeRate: 520,
        whatsappNumber: "+79918818456",
        cart: []
    };

    const container = document.getElementById('product-container');
    const rateDisplay = document.getElementById('current-rate');
    const navLinks = document.querySelectorAll('.nav-link');

    // ---------- Cargar productos ----------
    fetch('products.json')
        .then(res => res.json())
        .then(data => {
            appData = data;

            // Sobreescribir con datos del admin si existen
            const savedRate = localStorage.getItem('magara_exchange_rate');
            if (savedRate) appData.exchangeRate = parseFloat(savedRate);

            const savedProducts = localStorage.getItem('magara_products');
            if (savedProducts) {
                try {
                    appData.products = JSON.parse(savedProducts);
                } catch (e) {
                    console.warn('magara_products en localStorage no es JSON válido, usando products.json');
                }
            }

            if (rateDisplay) rateDisplay.textContent = appData.exchangeRate;
            renderProducts('Todos');

            // Navegación
            navLinks.forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    renderProducts(link.dataset.category);
                    // scroll suave al grid
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });
        })
        .catch(err => {
            console.error('Error al cargar el catálogo:', err);
            if (container) {
                container.innerHTML = '<p class="no-products-msg" style="color:#ff6b6b;">Error al cargar el catálogo. Intenta recargar la página.</p>';
            }
        });

    // ---------- Helper: obtener primera imagen ----------
    function getFirstImage(product) {
        if (product.images && product.images.length > 0) return product.images[0];
        if (product.img) return product.img;
        return '';
    }

    // ---------- Renderizar tarjetas ----------
    function renderProducts(category) {
        if (!container) return;
        container.innerHTML = '';

        const filtered = category === 'Todos'
            ? appData.products
            : appData.products.filter(p => p.category === category);

        if (filtered.length === 0) {
            container.innerHTML = '<p class="no-products-msg">No hay productos en esta categoría.</p>';
            return;
        }

        filtered.forEach((product, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgSrc = getFirstImage(product);
            const priceCUP = (product.priceUSD * appData.exchangeRate).toLocaleString('es-CU');
            const ref = `MAG-${(product.category || 'PRO').substring(0, 3).toUpperCase()}-${String(index + 101).padStart(3, '0')}`;

            // Estrellas aleatorias (4 o 5)
            const stars = Math.random() > 0.4 ? 5 : 4;
            const starHtml =
                '<i class="fas fa-star"></i>'.repeat(stars) +
                '<i class="far fa-star"></i>'.repeat(5 - stars);

            card.innerHTML = `
                <img src="${imgSrc}"
                     alt="${product.category}"
                     class="product-image"
                     loading="lazy"
                     onerror="this.style.background='#2a2a2a'; this.style.minHeight='160px'">
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <div class="product-reviews">${starHtml}</div>
                    <div class="product-price">
                        <span class="price-usd">$${product.priceUSD} USD</span>
                        <span class="price-cup">${priceCUP} CUP</span>
                    </div>
                    <button class="btn add-to-cart"
                            data-img="${imgSrc}"
                            data-price="${product.priceUSD}"
                            data-ref="${ref}"
                            aria-label="Solicitar pedido de ${product.category}">
                        Solicitar Pedido
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

        // Botones de pedido
        container.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                sendWhatsAppOrder(btn.dataset.img, btn.dataset.price, btn.dataset.ref);
            });
        });
    }

    // ---------- WhatsApp ----------
    function sendWhatsAppOrder(img, price, ref) {
        const cup = (parseFloat(price) * appData.exchangeRate).toLocaleString('es-CU');
        const message = encodeURIComponent(
            `Hola MAGARA Premium 👋, me gustaría realizar un pedido:\n\n` +
            `*Producto:* Referencia ${ref}\n` +
            `*Precio:* $${price} USD (${cup} CUP)\n\n` +
            `Quedo a la espera de su confirmación. ✅`
        );

        const number = (appData.whatsappNumber || '+79918818456').replace('+', '');
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
    }
});
