// resumen.js - Resumen mensual con gráficos

class ResumenManager {
    constructor() {
        this.charts = {};
        this.currentYear = new Date().getFullYear();
    }

    init() {
        this.loadYears();
        this.loadResumen();
        this.setupEventListeners();
    }

    loadYears() {
        const data = this.getData();
        const years = new Set();
        
        data.history.forEach(entry => {
            if (entry.date) {
                const year = entry.date.split('-')[0];
                years.add(parseInt(year));
            }
        });
        
        const yearSelect = document.getElementById('yearSelect');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === this.currentYear) option.selected = true;
            yearSelect.appendChild(option);
        });
    }

    getData() {
        return JSON.parse(localStorage.getItem('horasExtrasData') || '{"history": []}');
    }

    loadResumen() {
        const year = parseInt(document.getElementById('yearSelect').value) || this.currentYear;
        const data = this.getData();
        
        // Filtrar por año
        const yearData = (data.history || []).filter(item => {
            if (!item.date) return false;
            return item.date.startsWith(year.toString());
        });
        
        // Agrupar por mes
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            const monthKey = `${year}-${String(i).padStart(2, '0')}`;
            monthlyData[monthKey] = {
                totalHours: 0,
                extraHours: 0,
                nightHours: 0,
                amount: 0,
                count: 0,
                days: new Set()
            };
        }
        
        yearData.forEach(item => {
            const date = new Date(item.date);
            const month = date.getMonth() + 1;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].totalHours += item.total_hours || item.totalHours || 0;
                monthlyData[monthKey].extraHours += item.extra_hours || item.extraHours || 0;
                monthlyData[monthKey].nightHours += item.night_hours || item.nightHours || 0;
                monthlyData[monthKey].amount += item.amount || 0;
                monthlyData[monthKey].count += 1;
                monthlyData[monthKey].days.add(item.date);
            }
        });
        
        // Calcular promedios
        Object.keys(monthlyData).forEach(month => {
            const data = monthlyData[month];
            data.avgPerDay = data.days.size > 0 ? data.amount / data.days.size : 0;
            data.avgHoursPerDay = data.days.size > 0 ? data.totalHours / data.days.size : 0;
        });
        
        // Mostrar resumen
        this.displayResumen(monthlyData, year);
        
        // Mostrar gráficos
        this.displayCharts(monthlyData);
        
        // Calcular totales anuales
        this.calculateTotalesAnuales(monthlyData);
    }

    displayResumen(monthlyData, year) {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        let html = `
            <table class="resumen-table">
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>Días trabajados</th>
                        <th>Horas totales</th>
                        <th>Horas extras</th>
                        <th>Horas noct.</th>
                        <th>Importe total</th>
                        <th>Promedio/día</th>
                        <th>Detalles</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        months.forEach((monthName, index) => {
            const monthNum = index + 1;
            const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
            const data = monthlyData[monthKey] || {
                totalHours: 0, extraHours: 0, nightHours: 0,
                amount: 0, count: 0, days: new Set(), avgPerDay: 0, avgHoursPerDay: 0
            };
            
            const daysWorked = data.days.size;
            
            html += `
                <tr>
                    <td><strong>${monthName}</strong></td>
                    <td>${daysWorked}</td>
                    <td>${data.totalHours.toFixed(1)}h</td>
                    <td>${data.extraHours.toFixed(1)}h</td>
                    <td>${data.nightHours.toFixed(1)}h</td>
                    <td><strong>${data.amount.toFixed(2)} €</strong></td>
                    <td>${data.avgPerDay.toFixed(2)} €</td>
                    <td>
                        <button class="btn-small" onclick="resumenManager.viewMonthDetails(${year}, ${monthNum})">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        document.getElementById('resumenTable').innerHTML = html;
    }

    displayCharts(monthlyData) {
        const months = Object.keys(monthlyData).sort();
        const monthNames = months.map(m => {
            const [year, month] = m.split('-');
            return `${this.getMonthName(parseInt(month))}`;
        });
        
        // Datos para gráficos
        const importes = months.map(m => monthlyData[m].amount);
        const horasExtras = months.map(m => monthlyData[m].extraHours);
        const horasNocturnas = months.map(m => monthlyData[m].nightHours);
        const diasTrabajados = months.map(m => monthlyData[m].days.size);
        
        // Gráfico 1: Importe mensual
        this.createChart('chartImporte', {
            labels: monthNames,
            datasets: [{
                label: 'Importe (€)',
                data: importes,
                backgroundColor: 'rgba(52, 152, 219, 0.5)',
                borderColor: '#3498db',
                borderWidth: 2
            }]
        }, 'bar', 'Importe Mensual (€)');
        
        // Gráfico 2: Horas extras vs nocturnas
        this.createChart('chartHoras', {
            labels: monthNames,
            datasets: [
                {
                    label: 'Horas Extras',
                    data: horasExtras,
                    backgroundColor: 'rgba(46, 204, 113, 0.5)',
                    borderColor: '#2ecc71',
                    borderWidth: 2
                },
                {
                    label: 'Horas Nocturnas',
                    data: horasNocturnas,
                    backgroundColor: 'rgba(155, 89, 182, 0.5)',
                    borderColor: '#9b59b6',
                    borderWidth: 2
                }
            ]
        }, 'bar', 'Horas Extras vs Nocturnas');
        
        // Gráfico 3: Días trabajados
        this.createChart('chartDias', {
            labels: monthNames,
            datasets: [{
                label: 'Días trabajados',
                data: diasTrabajados,
                backgroundColor: 'rgba(241, 196, 15, 0.5)',
                borderColor: '#f1c40f',
                borderWidth: 2
            }]
        }, 'line', 'Días Trabajados por Mes');
        
        // Gráfico 4: Distribución anual
        const totalImporte = importes.reduce((a, b) => a + b, 0);
        if (totalImporte > 0) {
            const percentages = importes.map(val => ((val / totalImporte) * 100).toFixed(1));
            
            this.createChart('chartDistribucion', {
                labels: monthNames,
                datasets: [{
                    data: percentages,
                    backgroundColor: [
                        '#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6',
                        '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60',
                        '#8e44ad', '#c0392b'
                    ]
                }]
            }, 'pie', 'Distribución Anual (%)');
        }
    }

    createChart(canvasId, data, type = 'bar', title = '') {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Destruir gráfico anterior si existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: type,
            data: data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: !!title,
                        text: title
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: type === 'bar' || type === 'line' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return type === 'pie' ? value + '%' : value;
                            }
                        }
                    }
                } : {}
            }
        });
    }

    getMonthName(month) {
        const months = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        return months[month - 1] || '';
    }

    calculateTotalesAnuales(monthlyData) {
        let total = {
            amount: 0,
            totalHours: 0,
            extraHours: 0,
            nightHours: 0,
            daysWorked: 0,
            calculations: 0
        };
        
        Object.values(monthlyData).forEach(data => {
            total.amount += data.amount;
            total.totalHours += data.totalHours;
            total.extraHours += data.extraHours;
            total.nightHours += data.nightHours;
            total.daysWorked += data.days.size;
            total.calculations += data.count;
        });
        
        const avgPerDay = total.daysWorked > 0 ? total.amount / total.daysWorked : 0;
        const avgPerCalculation = total.calculations > 0 ? total.amount / total.calculations : 0;
        
        const html = `
            <div class="annual-stats-grid">
                <div class="stat-card annual">
                    <div class="stat-value">${total.amount.toFixed(2)}€</div>
                    <div class="stat-label">Importe anual</div>
                </div>
                <div class="stat-card annual">
                    <div class="stat-value">${total.daysWorked}</div>
                    <div class="stat-label">Días trabajados</div>
                </div>
                <div class="stat-card annual">
                    <div class="stat-value">${total.calculations}</div>
                    <div class="stat-label">Cálculos realizados</div>
                </div>
                <div class="stat-card annual">
                    <div class="stat-value">${avgPerDay.toFixed(2)}€</div>
                    <div class="stat-label">Promedio por día</div>
                </div>
                <div class="stat-card annual">
                    <div class="stat-value">${avgPerCalculation.toFixed(2)}€</div>
                    <div class="stat-label">Promedio por cálculo</div>
                </div>
            </div>
        `;
        
        document.getElementById('annualTotals').innerHTML = html;
    }

    viewMonthDetails(year, month) {
        const data = this.getData();
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        // Filtrar datos del mes
        const monthData = (data.history || []).filter(item => 
            item.date && item.date.startsWith(monthKey)
        );
        
        if (monthData.length === 0) {
            alert('No hay datos para este mes');
            return;
        }
        
        // Agrupar por día
        const dailyData = {};
        monthData.forEach(item => {
            if (!dailyData[item.date]) {
                dailyData[item.date] = {
                    totalHours: 0,
                    extraHours: 0,
                    nightHours: 0,
                    amount: 0,
                    entries: []
                };
            }
            
            dailyData[item.date].totalHours += item.total_hours || item.totalHours || 0;
            dailyData[item.date].extraHours += item.extra_hours || item.extraHours || 0;
            dailyData[item.date].nightHours += item.night_hours || item.nightHours || 0;
            dailyData[item.date].amount += item.amount || 0;
            dailyData[item.date].entries.push(item);
        });
        
        // Crear HTML de detalles
        const monthName = this.getMonthName(month);
        let detailsHTML = `
            <h3><i class="fas fa-calendar"></i> Detalles de ${monthName} ${year}</h3>
            <table class="month-details-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Horas</th>
                        <th>Extras</th>
                        <th>Noct.</th>
                        <th>Importe</th>
                        <th>Detalles</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        Object.keys(dailyData).sort().forEach(date => {
            const dayData = dailyData[date];
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
            
            detailsHTML += `
                <tr>
                    <td><strong>${dateObj.getDate()} ${dayName}</strong></td>
                    <td>${dayData.totalHours.toFixed(1)}h</td>
                    <td>${dayData.extraHours.toFixed(1)}h</td>
                    <td>${dayData.nightHours.toFixed(1)}h</td>
                    <td><strong>${dayData.amount.toFixed(2)} €</strong></td>
                    <td>
                        <button class="btn-small" onclick="resumenManager.viewDayDetails('${date}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        detailsHTML += `
                </tbody>
            </table>
        `;
        
        // Mostrar en modal
        document.getElementById('monthDetailsContent').innerHTML = detailsHTML;
        document.getElementById('monthDetailsModal').style.display = 'block';
    }

    viewDayDetails(date) {
        const data = this.getData();
        const dayData = (data.history || []).filter(item => item.date === date);
        
        if (dayData.length === 0) {
            alert('No hay datos para este día');
            return;
        }
        
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let detailsHTML = `
            <h4><i class="fas fa-calendar-day"></i> ${formattedDate}</h4>
            <div class="day-entries">
        `;
        
        dayData.forEach((item, index) => {
            detailsHTML += `
                <div class="day-entry">
                    <h5>Turno ${index + 1}</h5>
                    <p><strong>Horario:</strong> ${item.start_time || item.startTime || '--:--'} a ${item.end_time || item.endTime || '--:--'}</p>
                    <p><strong>Horas totales:</strong> ${parseFloat(item.total_hours || item.totalHours || 0).toFixed(2)}h</p>
                    <p><strong>Horas extras:</strong> ${parseFloat(item.extra_hours || item.extraHours || 0).toFixed(2)}h</p>
                    <p><strong>Horas nocturnas:</strong> ${parseFloat(item.night_hours || item.nightHours || 0).toFixed(2)}h</p>
                    <p><strong>Importe:</strong> ${parseFloat(item.amount || 0).toFixed(2)} €</p>
                </div>
            `;
        });
        
        // Totales del día
        const totalHours = dayData.reduce((sum, item) => sum + (item.total_hours || item.totalHours || 0), 0);
        const totalExtra = dayData.reduce((sum, item) => sum + (item.extra_hours || item.extraHours || 0), 0);
        const totalNight = dayData.reduce((sum, item) => sum + (item.night_hours || item.nightHours || 0), 0);
        const totalAmount = dayData.reduce((sum, item) => sum + (item.amount || 0), 0);
        
        detailsHTML += `
                <div class="day-totals">
                    <h5>Totales del día</h5>
                    <p><strong>Horas totales:</strong> ${totalHours.toFixed(2)}h</p>
                    <p><strong>Horas extras:</strong> ${totalExtra.toFixed(2)}h</p>
                    <p><strong>Horas nocturnas:</strong> ${totalNight.toFixed(2)}h</p>
                    <p><strong>Importe total:</strong> <strong>${totalAmount.toFixed(2)} €</strong></p>
                </div>
            </div>
        `;
        
        // Mostrar en modal
        document.getElementById('dayDetailsContent').innerHTML = detailsHTML;
        document.getElementById('dayDetailsModal').style.display = 'block';
    }

    setupEventListeners() {
        // Cambiar año
        document.getElementById('yearSelect').addEventListener('change', () => {
            this.loadResumen();
        });
        
        // Exportar resumen
        document.getElementById('exportResumen').addEventListener('click', () => {
            this.exportResumen();
        });
        
        // Imprimir resumen
        document.getElementById('printResumen').addEventListener('click', () => {
            window.print();
        });
    }

    exportResumen() {
        const year = document.getElementById('yearSelect').value;
        const data = this.getData();
        
        // Filtrar por año
        const yearData = (data.history || []).filter(item => 
            item.date && item.date.startsWith(year)
        );
        
        if (yearData.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        // Crear CSV del resumen
        let csv = 'Mes,Días Trabajados,Horas Totales,Horas Extras,Horas Nocturnas,Importe Total,Promedio por Día\n';
        
        // Agrupar por mes
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            const monthKey = `${year}-${String(i).padStart(2, '0')}`;
            monthlyData[monthKey] = {
                days: new Set(),
                totalHours: 0,
                extraHours: 0,
                nightHours: 0,
                amount: 0
            };
        }
        
        yearData.forEach(item => {
            const date = new Date(item.date);
            const month = date.getMonth() + 1;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].days.add(item.date);
                monthlyData[monthKey].totalHours += item.total_hours || item.totalHours || 0;
                monthlyData[monthKey].extraHours += item.extra_hours || item.extraHours || 0;
                monthlyData[monthKey].nightHours += item.night_hours || item.nightHours || 0;
                monthlyData[monthKey].amount += item.amount || 0;
            }
        });
        
        // Añadir filas al CSV
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        months.forEach((monthName, index) => {
            const monthNum = index + 1;
            const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
            const data = monthlyData[monthKey] || {
                days: new Set(), totalHours: 0, extraHours: 0, 
                nightHours: 0, amount: 0
            };
            
            const daysWorked = data.days.size;
            const avgPerDay = daysWorked > 0 ? data.amount / daysWorked : 0;
            
            csv += `"${monthName}",${daysWorked},${data.totalHours.toFixed(2)},`;
            csv += `${data.extraHours.toFixed(2)},${data.nightHours.toFixed(2)},`;
            csv += `${data.amount.toFixed(2)},${avgPerDay.toFixed(2)}\n`;
        });
        
        // Descargar archivo
        this.downloadFile(csv, `resumen_${year}.csv`, 'text/csv');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        alert(`Archivo ${filename} descargado`);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    
    resumenManager = new ResumenManager();
    resumenManager.init();
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            auth.logout();
        }
    });
    
    // Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});

let resumenManager;