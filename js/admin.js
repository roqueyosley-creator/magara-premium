let currentProducts = [];
let fullAppData = null;

document.addEventListener('DOMContentLoaded', () => {
    const rateInput = document.getElementById('rate-input');
    const saveBtn = document.getElementById('save-rate');
    const statsTable = document.getElementById('inventory-stats');
    const productList = document.getElementById('product-list');
    const addProductForm = document.getElementById('add-product-form');
    const downloadJsonBtn = document.getElementById('download-json');

    // Load current settings
    const savedRate = localStorage.getItem('magara_exchange_rate');

    fetch('products.json')
        .then(res => res.json())
        .then(data => {
            fullAppData = data;
            
            if (savedRate) {
                rateInput.value = savedRate;
            } else {
                rateInput.value = data.exchangeRate;
            }

            const savedProducts = localStorage.getItem('magara_products');
            if (savedProducts) {
                currentProducts = JSON.parse(savedProducts);
            } else {
                currentProducts = data.products;
            }
            
            renderStats(currentProducts);
            renderProductList(currentProducts);
        });

    saveBtn.addEventListener('click', () => {
        localStorage.setItem('magara_exchange_rate', rateInput.value);
        if (fullAppData) fullAppData.exchangeRate = parseFloat(rateInput.value);
        alert('Tasa de cambio actualizada correctamente.');
    });

    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('prod-category').value.trim();
        const img = document.getElementById('prod-img').value.trim();
        const priceUSD = parseFloat(document.getElementById('prod-price').value);

        currentProducts.push({ category, img, priceUSD });
        saveProducts();
        
        addProductForm.reset();
        alert('Producto agregado. Recuerde "Descargar products.json" para actualizar el repositorio.');
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

    window.deleteProduct = function(index) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            currentProducts.splice(index, 1);
            saveProducts();
        }
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
                <td style="text-align: right;">
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
