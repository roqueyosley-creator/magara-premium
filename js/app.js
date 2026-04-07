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

    // Fetch products
    fetch('products.json')
        .then(res => res.json())
        .then(data => {
            appData = data;
            init();
        })
        .catch(err => {
            console.error('Error loading catalog:', err);
            container.innerHTML = '<p style="color:red; text-align:center;">Error al cargar el catálogo.</p>';
        });

    function init() {
        const savedRate = localStorage.getItem('magara_exchange_rate');
        if (savedRate) {
            appData.exchangeRate = parseFloat(savedRate);
        }
        rateDisplay.textContent = appData.exchangeRate;
        renderProducts('Todos');

        // Navigation setup
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                renderProducts(link.dataset.category);
            });
        });
    }

    function renderProducts(category) {
        container.innerHTML = '';
        
        const filtered = category === 'Todos' 
            ? appData.products 
            : appData.products.filter(p => p.category === category);

        if (filtered.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No hay productos en esta categoría.</p>';
            return;
        }

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const priceCUP = (product.priceUSD * appData.exchangeRate).toLocaleString();
            
            // Random stars for aesthetics (3-5)
            const stars = Math.floor(Math.random() * 3) + 3;
            const starHtml = '<i class="fas fa-star" style="color: gold;"></i>'.repeat(stars) + 
                             '<i class="far fa-star"></i>'.repeat(5 - stars);

            card.innerHTML = `
                <img src="${product.img}" alt="${product.category}" class="product-image" loading="lazy">
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title">${product.category} - Ref# ${Math.random().toString(36).substr(2, 5).toUpperCase()}</h3>
                    <div class="product-reviews" style="margin-bottom: 0.5rem; font-size: 0.8rem;">
                        ${starHtml}
                    </div>
                    <div class="product-price">
                        <span class="price-usd">$${product.priceUSD} USD</span>
                        <span class="price-cup">${priceCUP} CUP</span>
                    </div>
                    <button class="btn add-to-cart" data-img="${product.img}" data-price="${product.priceUSD}">
                        Solicitar Pedido
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const img = btn.dataset.img;
                const price = btn.dataset.price;
                sendWhatsAppOrder(img, price);
            });
        });
    }

    function sendWhatsAppOrder(img, price) {
        const ref = Math.random().toString(36).substr(2, 5).toUpperCase();
        const message = encodeURIComponent(
            `Hola MAGARA Premium, me gustaría realizar un pedido:\n\n` +
            `*Producto:* Referencia #${ref}\n` +
            `*Precio:* $${price} USD (${(price * appData.exchangeRate).toLocaleString()} CUP)\n\n` +
            `Quedo a la espera de su confirmación.`
        );
        
        const whatsappUrl = `https://wa.me/${appData.whatsappNumber.replace('+', '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    }
});
