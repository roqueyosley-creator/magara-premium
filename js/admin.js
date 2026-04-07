document.addEventListener('DOMContentLoaded', () => {
    const rateInput = document.getElementById('rate-input');
    const saveBtn = document.getElementById('save-rate');
    const statsTable = document.getElementById('inventory-stats');

    // Load current settings
    const savedRate = localStorage.getItem('magara_exchange_rate') || 520;
    rateInput.value = savedRate;

    fetch('products.json')
        .then(res => res.json())
        .then(data => {
            renderStats(data.products);
        });

    saveBtn.addEventListener('click', () => {
        localStorage.setItem('magara_exchange_rate', rateInput.value);
        alert('Tasa de cambio actualizada correctamente. Los cambios se verán en la tienda.');
    });

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
