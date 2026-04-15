document.addEventListener('DOMContentLoaded', () => {
    let appData = {
        products: [],
        exchangeRate: 520,
        whatsappNumber: "+79778095292",
        cart: []
    };

    const container = document.getElementById('product-container');
    const rateDisplay = document.getElementById('current-rate');
    const navLinks = document.querySelectorAll('.nav-link');
    const preloader = document.getElementById('preloader');

    function renderSkeletons() {
        if (!container) return;
        let skeletonsHTML = '';
        for (let i = 0; i < 4; i++) {
            skeletonsHTML += `
                <div class="skeleton-card">
                    <div class="skeleton-img"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-text short"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text short" style="margin-top:0.5rem;"></div>
                        <div class="skeleton-btn"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = skeletonsHTML;
    }

    function initAgeVerification() {
        const modal = document.getElementById('age-modal');
        const btnYes = document.getElementById('btn-age-yes');
        const btnNo = document.getElementById('btn-age-no');
        
        if (!modal) return;

        if (!localStorage.getItem('age_verified')) {
            modal.classList.add('active');
            
            // disable scroll
            document.body.style.overflow = 'hidden';
            
            btnYes.addEventListener('click', () => {
                localStorage.setItem('age_verified', 'true');
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
            
            btnNo.addEventListener('click', () => {
                window.location.href = "https://www.google.com";
            });
        }
    }

    initAgeVerification();
    renderSkeletons();

    // Initialize Supabase Client
    const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Fetch products
    async function loadData() {
        try {
            // Intentar cargar desde Supabase
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.warn('Error accediendo a Supabase (quizás falta ejecutar el SQL). Cayendo a products.json...', error);
                throw error;
            }

            // Mapear supabase a interfaz esperada si es necesario
            // Si la db está vacía, tal vez quieran cargar el json inicial
            if (data && data.length > 0) {
                appData.products = data.map(p => ({
                    ...p,
                    priceUSD: p.priceusd || p.priceUSD
                }));
            } else {
                throw new Error("No products in Supabase");
            }
        } catch (e) {
            // Fallback a products.json
            try {
                const res = await fetch('products.json');
                const pdata = await res.json();
                appData.products = pdata.products || pdata;
                appData.whatsappNumber = pdata.whatsappNumber || appData.whatsappNumber;
                appData.exchangeRate = pdata.exchangeRate || appData.exchangeRate;
            } catch (errFallback) {
                console.error('Error fallback:', errFallback);
                container.innerHTML = '<p style="color:red; text-align:center;">Error general al cargar el catálogo.</p>';
            }
        } finally {
            init();
            setTimeout(() => {
                if (preloader) {
                    preloader.style.opacity = '0';
                    setTimeout(() => preloader.style.display = 'none', 500);
                }
            }, 1000);
        }
    }

    loadData();

    function init() {
        const savedRate = localStorage.getItem('magara_exchange_rate');
        if (savedRate) {
            appData.exchangeRate = parseFloat(savedRate);
        }
        
        const savedProducts = localStorage.getItem('magara_products');
        if (savedProducts) {
            appData.products = JSON.parse(savedProducts);
        }

        if (rateDisplay) rateDisplay.textContent = appData.exchangeRate;
        renderProducts('Todos');
        initHeroSlider();
        initModal();

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

    // --- HERO SLIDER ---
    function initHeroSlider() {
        const sliderImages = document.getElementById('slider-images');
        if (!sliderImages) return;

        // Filter out adult products for safety
        const safeProducts = appData.products.filter(p => p.category !== 'Jugetes para Adultos');
        
        // Pick 5 random safe product images
        const shuffled = [...safeProducts].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);

        selected.forEach((product, index) => {
            const img = document.createElement('img');
            img.src = product.images[0];
            img.className = index === 0 ? 'slider-img active' : 'slider-img';
            sliderImages.appendChild(img);
        });

        // Auto slide
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slider-img');
        if (slides.length > 0) {
            setInterval(() => {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }, 5000);
        }
    }

    // --- PRODUCT RENDERING ---
    function renderProducts(category) {
        if (!container) return;
        container.innerHTML = '';
        
        const filtered = category === 'Todos' 
            ? appData.products 
            : appData.products.filter(p => p.category === category);

        if (filtered.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No hay productos en esta categoría.</p>';
            return;
        }

        filtered.forEach((product, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const priceCUP = (product.priceUSD * appData.exchangeRate).toLocaleString();
            const ref = `MAG-${product.category.substring(0,3).toUpperCase()}-${index + 101}`;

            card.innerHTML = `
                <img src="${product.images[0]}" alt="${product.category}" class="product-image" loading="lazy">
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title">${product.category} | ${ref}</h3>
                    <div class="product-price">
                        <span class="price-usd">$${product.priceUSD} USD</span>
                        <span class="price-cup">${priceCUP} CUP</span>
                    </div>
                    <button class="btn view-details">
                        Ver Detalle
                    </button>
                    <button class="btn-fast-order" style="width:100%; margin-top:0.5rem; text-align:center; padding: 0.5rem; background: transparent; border: 1px solid #25d366; color: #25d366; border-radius:4px; font-size:0.75rem; cursor:pointer;">
                         Pedir Rápido
                    </button>
                </div>
            `;

            card.querySelector('.view-details').addEventListener('click', () => {
                openModal(product, ref);
            });

            card.querySelector('.btn-fast-order').addEventListener('click', (e) => {
                e.stopPropagation();
                sendWhatsAppOrder(product.images[0], product.priceUSD, ref);
            });

            container.appendChild(card);
        });
    }

    // --- MODAL HANDLING ---
    function initModal() {
        const modal = document.getElementById('product-modal');
        const closeBtn = document.querySelector('.close-modal');
        if (!modal || !closeBtn) return;

        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = "none";
        };
    }

    function openModal(product, ref) {
        const modal = document.getElementById('product-modal');
        const mainImg = document.getElementById('modal-main-img');
        const thumbs = document.getElementById('modal-thumbs');
        const title = document.getElementById('modal-title');
        const cat = document.getElementById('modal-category');
        const desc = document.getElementById('modal-description');
        const features = document.getElementById('modal-features');
        const priceUSD = document.getElementById('modal-price-usd');
        const priceCUP = document.getElementById('modal-price-cup');
        const buyBtn = document.getElementById('modal-buy-btn');

        if (!modal) return;

        title.textContent = `${product.category} - ${ref}`;
        cat.textContent = product.category;
        desc.textContent = product.description;
        priceUSD.textContent = `$${product.priceUSD} USD`;
        priceCUP.textContent = `${(product.priceUSD * appData.exchangeRate).toLocaleString()} CUP`;
        
        // Features
        features.innerHTML = '';
        if (product.features) {
            product.features.forEach(f => {
                const li = document.createElement('li');
                li.textContent = f;
                features.appendChild(li);
            });
        }

        // Gallery
        mainImg.src = product.images[0];
        thumbs.innerHTML = '';
        if (product.images && product.images.length > 0) {
            product.images.forEach((imgSrc, i) => {
                const thumb = document.createElement('img');
                thumb.src = imgSrc;
                thumb.className = i === 0 ? 'thumb-img active' : 'thumb-img';
                thumb.onclick = () => {
                    mainImg.src = imgSrc;
                    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                };
                thumbs.appendChild(thumb);
            });
        }

        // Buy button logic with Telegram
        buyBtn.onclick = () => {
            sendTelegramNotification(product, ref, priceCUP, priceUSD);
        };

        modal.style.display = "block";
    }

    async function sendTelegramNotification(product, ref, priceCUP, priceUSD) {
        const text = `🚀 *NUEVO PEDIDO INICIADO* 🚀\n\n` +
                     `📦 *Producto:* ${product.category} - ${ref}\n` +
                     `💵 *Precio:* $${product.priceUSD} USD / ${priceCUP} CUP\n\n` +
                     `El cliente está siendo redirigido a WhatsApp para concretar.`;
        
        try {
            await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.TELEGRAM_CHAT_ID,
                    text: text,
                    parse_mode: 'Markdown'
                })
            });
        } catch (err) {
            console.error('Error enviando a telegram:', err);
        }
        
        sendWhatsAppOrder(product.images[0] || product.img, product.priceUSD, ref);
    }

    function sendWhatsAppOrder(img, price, ref) {
        const message = encodeURIComponent(
            `Hola MAGARA Premium, me gustaría finalizar mi pedido:\n\n` +
            `*Producto:* ${ref}\n` +
            `*Precio:* $${price} USD (${(price * appData.exchangeRate).toLocaleString()} CUP)\n\n` +
            `Quedo a la espera de su confirmación para el pago y envío discreto.`
        );
        
        const whatsappUrl = `https://wa.me/${appData.whatsappNumber.replace('+', '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    }
});
