let currentProducts = [];
let fullAppData = null;

document.addEventListener('DOMContentLoaded', () => {
    const rateInput = document.getElementById('rate-input');
    const saveBtn = document.getElementById('save-rate');
    const statsTable = document.getElementById('inventory-stats');
    const productList = document.getElementById('product-list');
    const addProductForm = document.getElementById('add-product-form');
    const downloadJsonBtn = document.getElementById('download-json');
    const imgPickerBtn = document.getElementById('img-picker-btn');
    const prodFileInput = document.getElementById('prod-file-input');

    let selectedBase64Img = null;

    const supabaseClient = window.supabase ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

    // Load current settings
    const savedRate = localStorage.getItem('magara_exchange_rate');

    async function initAdmin() {
        // Obtenemos los datos base (tasa de cambio, num whatsapp)
        try {
            const res = await fetch('products.json');
            fullAppData = await res.json();
            if (savedRate) {
                rateInput.value = savedRate;
            } else {
                rateInput.value = fullAppData.exchangeRate;
            }
        } catch(e) {
            console.error("Error al leer JSON base", e);
        }

        // Cargar productos desde Supabase
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                currentProducts = data.map(p => ({
                    id: p.id,
                    created_at: p.created_at,
                    category: p.category,
                    priceUSD: p.priceusd || p.priceUSD,
                    img: p.images && p.images.length > 0 ? p.images[0] : p.img // Soporte dual
                }));
            } else {
                console.warn("No se conectó a Supabase. Cayendo a caché.");
                loadFallbackProducts();
            }
        } else {
            loadFallbackProducts();
        }

        renderStats(currentProducts);
        renderProductList(currentProducts);
    }

    function loadFallbackProducts() {
        const savedProducts = localStorage.getItem('magara_products');
        if (savedProducts) {
            currentProducts = JSON.parse(savedProducts);
        } else if (fullAppData && fullAppData.products) {
            currentProducts = fullAppData.products;
        }
    }

    initAdmin();

    saveBtn.addEventListener('click', () => {
        localStorage.setItem('magara_exchange_rate', rateInput.value);
        if (fullAppData) fullAppData.exchangeRate = parseFloat(rateInput.value);
        alert('Tasa de cambio actualizada correctamente.');
    });

    imgPickerBtn.addEventListener('click', () => {
        prodFileInput.click();
    });

    prodFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Compresión en Canvas para evitar excesivo tamaño en Base64
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Guardar como JPEG con calidad del 80% (mantiene el peso bajo)
                selectedBase64Img = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('img-name-display').innerText = file.name;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('prod-category').value.trim();
        const priceUSD = parseFloat(document.getElementById('prod-price').value);

        if (!selectedBase64Img) {
            alert('Por favor selecciona una imagen para el producto.');
            return;
        }

        const img = selectedBase64Img;
        let newProduct = { category, img, priceUSD };

        // Guardar en Supabase
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('products').insert([
                { category: category, priceusd: priceUSD, images: [img] }
            ]).select();

            if (error) {
                console.error(error);
                alert('Hubo un error subiendo el producto a la Base de Datos.');
                return;
            } else if (data && data.length > 0) {
                newProduct.id = data[0].id;
                newProduct.created_at = data[0].created_at;
            }
        }

        currentProducts.unshift(newProduct);
        saveProducts();
        
        addProductForm.reset();
        selectedBase64Img = null;
        prodFileInput.value = '';
        document.getElementById('img-name-display').innerText = 'Subir Foto o Imagen...';
        alert('Producto agregado y guardado.');
    });

    downloadJsonBtn.addEventListener('click', () => {
        if (!fullAppData) return;
        
        const dataToExport = {
            exchangeRate: parseFloat(rateInput.value),
            whatsappNumber: fullAppData.whatsappNumber,
            products: currentProducts
        };

        const jsonString = JSON.stringify(dataToExport, null, 4);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products.json';
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    window.deleteProduct = async function(index) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            const prod = currentProducts[index];
            if (supabaseClient && prod.id) {
                const { error } = await supabaseClient.from('products').delete().eq('id', prod.id);
                if (error) {
                    alert('Error borrando en Base de Datos: ' + error.message);
                    return;
                }
            }
            currentProducts.splice(index, 1);
            saveProducts();
        }
    };

    window.moveProductUp = async function(index) {
        if (index === 0) return; // Ya está arriba del todo
        
        const p1 = currentProducts[index];
        const p2 = currentProducts[index - 1];

        // Intercambiar en local
        currentProducts[index] = p2;
        currentProducts[index - 1] = p1;

        // Intercambiar en Supabase
        if (supabaseClient && p1.id && p2.id && p1.created_at && p2.created_at) {
            const tempTime = p1.created_at;
            p1.created_at = p2.created_at;
            p2.created_at = tempTime;

            await Promise.all([
                supabaseClient.from('products').update({ created_at: p1.created_at }).eq('id', p1.id),
                supabaseClient.from('products').update({ created_at: p2.created_at }).eq('id', p2.id)
            ]);
        }
        saveProducts();
    };

    window.moveProductDown = async function(index) {
        if (index === currentProducts.length - 1) return; // Ya está abajo del todo
        
        const p1 = currentProducts[index];
        const p2 = currentProducts[index + 1];

        // Intercambiar en local
        currentProducts[index] = p2;
        currentProducts[index + 1] = p1;

        // Intercambiar en Supabase
        if (supabaseClient && p1.id && p2.id && p1.created_at && p2.created_at) {
            const tempTime = p1.created_at;
            p1.created_at = p2.created_at;
            p2.created_at = tempTime;

            await Promise.all([
                supabaseClient.from('products').update({ created_at: p1.created_at }).eq('id', p1.id),
                supabaseClient.from('products').update({ created_at: p2.created_at }).eq('id', p2.id)
            ]);
        }
        saveProducts();
    };

    function saveProducts() {
        localStorage.setItem('magara_products', JSON.stringify(currentProducts));
        renderStats(currentProducts);
        renderProductList(currentProducts);
    }

    function renderProductList(products) {
        if (!productList) return;
        productList.innerHTML = '';
        products.forEach((p, index) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #222';
            row.innerHTML = `
                <td style="padding: 0.5rem 0;">
                    <div style="width: 50px; height: 50px; background: #333; overflow: hidden; border-radius: 4px;">
                        <img src="${p.img}" alt="${p.category}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/50 text=Img'">
                    </div>
                </td>
                <td>${p.category}</td>
                <td>$${p.priceUSD}</td>
                <td style="text-align: right; display: flex; gap: 0.3rem; justify-content: flex-end;">
                    <button class="btn" style="background: #333; color: white; width: auto; padding: 0.4rem 0.6rem; margin: 0; font-size: 0.8rem;" onclick="moveProductUp(${index})" title="Mover Arriba" ${index === 0 ? 'disabled style="opacity: 0.5;"' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn" style="background: #333; color: white; width: auto; padding: 0.4rem 0.6rem; margin: 0; font-size: 0.8rem;" onclick="moveProductDown(${index})" title="Mover Abajo" ${index === products.length - 1 ? 'disabled style="opacity: 0.5;"' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="btn" style="background: #ff4757; color: white; width: auto; padding: 0.4rem 0.8rem; margin: 0; font-size: 0.8rem;" onclick="deleteProduct(${index})" title="Eliminar Producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            productList.appendChild(row);
        });
    }

    function renderStats(products) {
        const stats = products.reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = { count: 0, totalUSD: 0 };
            acc[p.category].count++;
            acc[p.category].totalUSD += p.priceUSD;
            return acc;
        }, {});

        statsTable.innerHTML = '';
        for (const [cat, data] of Object.entries(stats)) {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #222';
            row.innerHTML = `
                <td style="padding: 1rem 0;">${cat}</td>
                <td>${data.count}</td>
                <td>$${(data.totalUSD / data.count).toFixed(2)} USD</td>
            `;
            statsTable.appendChild(row);
        }
    }
});
