// historial.js - Gestión del historial con filtros avanzados

class HistorialManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {};
        this.selectedItems = new Set();
        this.chart = null;
    }

    init() {
        this.loadYears();
        this.applyFilters();
        this.setupEventListeners();
    }

    loadYears() {
        const data = this.getData();
        const years = new Set();
        
        data.history.forEach(entry => {
            if (entry.date) {
                const year = entry.date.split('-')[0];
                years.add(year);
            }
        });
        
        const yearSelect = document.getElementById('yearFilter');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    getData() {
        return JSON.parse(localStorage.getItem('horasExtrasData') || '{"history": []}');
    }

    applyFilters() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const month = document.getElementById('monthFilter').value;
        const year = document.getElementById('yearFilter').value;
        const type = document.getElementById('typeFilter').value;
        
        this.currentFilters = { startDate, endDate, month, year, type };
        this.currentPage = 1;
        this.selectedItems.clear();
        document.getElementById('selectAll').checked = false;
        
        this.displayResults();
    }

    filterHistory(history) {
        let filtered = [...history];
        
        // Filtrar por rango de fechas
        if (this.currentFilters.startDate) {
            filtered = filtered.filter(item => 
                item.date >= this.currentFilters.startDate
            );
        }
        
        if (this.currentFilters.endDate) {
            filtered = filtered.filter(item => 
                item.date <= this.currentFilters.endDate
            );
        }
        
        // Filtrar por mes
        if (this.currentFilters.month) {
            filtered = filtered.filter(item => 
                item.date.startsWith(this.currentFilters.month)
            );
        }
        
        // Filtrar por año
        if (this.currentFilters.year) {
            filtered = filtered.filter(item => 
                item.date.startsWith(this.currentFilters.year)
            );
        }
        
        // Filtrar por tipo (esto requiere calcular el tipo de cada entrada)
        if (this.currentFilters.type) {
            filtered = filtered.filter(item => {
                const date = new Date(item.date);
                const dayOfWeek = date.getDay();
                const isFestive = this.isFestiveDay(date);
                
                if (this.currentFilters.type === 'weekday' && dayOfWeek >= 1 && dayOfWeek <= 5 && !isFestive) return true;
                if (this.currentFilters.type === 'saturday' && dayOfWeek === 6 && !isFestive) return true;
                if (this.currentFilters.type === 'sunday' && dayOfWeek === 0 && !isFestive) return true;
                if (this.currentFilters.type === 'festive' && isFestive) return true;
                return false;
            });
        }
        
        return filtered;
    }

    isFestiveDay(date) {
        const data = this.getData();
        const dateStr = date.toISOString().split('T')[0];
        return data.festiveDays?.some(festive => festive.date === dateStr) || false;
    }

    displayResults() {
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        
        // Ordenar por fecha descendente
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calcular estadísticas
        this.updateStats(filtered);
        
        // Paginación
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + this.itemsPerPage);
        
        // Mostrar resultados
        this.renderResults(paginated);
        
        // Mostrar paginación
        this.renderPagination(totalPages);
        
        // Actualizar contador
        document.getElementById('resultCount').innerHTML = 
            `<i class="fas fa-database"></i> ${filtered.length} registros encontrados`;
        
        // Actualizar gráfico
        this.updateChart(filtered);
    }

    updateStats(history) {
        const stats = {
            total: history.length,
            totalHours: 0,
            totalExtraHours: 0,
            totalNightHours: 0,
            totalAmount: 0,
            avgPerDay: 0
        };
        
        history.forEach(item => {
            stats.totalHours += item.total_hours || 0;
            stats.totalExtraHours += item.extra_hours || 0;
            stats.totalNightHours += item.night_hours || 0;
            stats.totalAmount += item.amount || 0;
        });
        
        if (history.length > 0) {
            stats.avgPerDay = stats.totalAmount / history.length;
        }
        
        const statsHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total registros</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalHours.toFixed(1)}</div>
                <div class="stat-label">Horas totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalExtraHours.toFixed(1)}</div>
                <div class="stat-label">Horas extras</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalAmount.toFixed(2)}€</div>
                <div class="stat-label">Importe total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.avgPerDay.toFixed(2)}€</div>
                <div class="stat-label">Promedio por día</div>
            </div>
        `;
        
        document.getElementById('filterStats').innerHTML = statsHTML;
    }

    renderResults(results) {
        const container = document.getElementById('historyResults');
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta con otros criterios de búsqueda</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th style="width: 30px;">
                            <input type="checkbox" id="selectAllVisible">
                        </th>
                        <th>Fecha</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Horas</th>
                        <th>Extras</th>
                        <th>Noct.</th>
                        <th>Importe</th>
                        <th>Tipo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        results.forEach((item, index) => {
            const globalIndex = ((this.currentPage - 1) * this.itemsPerPage) + index;
            const isSelected = this.selectedItems.has(globalIndex);
            const date = new Date(item.date);
            const dayType = this.getDayType(date);
            
            html += `
                <tr>
                    <td>
                        <input type="checkbox" class="select-item" data-index="${globalIndex}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td>${this.formatDate(date)}</td>
                    <td>${item.start_time || item.startTime || '--:--'}</td>
                    <td>${item.end_time || item.endTime || '--:--'}</td>
                    <td>${parseFloat(item.total_hours || item.totalHours || 0).toFixed(2)}h</td>
                    <td>${parseFloat(item.extra_hours || item.extraHours || 0).toFixed(2)}h</td>
                    <td>${parseFloat(item.night_hours || item.nightHours || 0).toFixed(2)}h</td>
                    <td><strong>${parseFloat(item.amount || 0).toFixed(2)} €</strong></td>
                    <td>
                        <span class="badge badge-${this.getDayTypeClass(dayType)}">
                            ${this.getDayTypeName(dayType)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-small" onclick="historialManager.viewDetails(${globalIndex})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-small" onclick="historialManager.editItem(${globalIndex})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small btn-danger" onclick="historialManager.deleteItem(${globalIndex})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        
        // Event listeners para checkboxes
        document.querySelectorAll('.select-item').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    this.selectedItems.add(index);
                } else {
                    this.selectedItems.delete(index);
                }
                this.updateSelectAll();
            });
        });
        
        document.getElementById('selectAllVisible').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.select-item');
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            
            checkboxes.forEach((checkbox, i) => {
                const globalIndex = startIndex + i;
                checkbox.checked = e.target.checked;
                
                if (e.target.checked) {
                    this.selectedItems.add(globalIndex);
                } else {
                    this.selectedItems.delete(globalIndex);
                }
            });
        });
    }

    getDayType(date) {
        const dayOfWeek = date.getDay();
        const isFestive = this.isFestiveDay(date);
        
        if (isFestive) return 'festive';
        if (dayOfWeek === 0) return 'sunday';
        if (dayOfWeek === 6) return 'saturday';
        return 'weekday';
    }

    getDayTypeName(type) {
        const names = {
            'weekday': 'Laboral',
            'saturday': 'Sábado',
            'sunday': 'Domingo',
            'festive': 'Festivo'
        };
        return names[type] || type;
    }

    getDayTypeClass(type) {
        const classes = {
            'weekday': 'info',
            'saturday': 'warning',
            'sunday': 'danger',
            'festive': 'success'
        };
        return classes[type] || 'info';
    }

    formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    renderPagination(totalPages) {
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Botón anterior
        html += `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="historialManager.changePage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Páginas
        const maxPages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="historialManager.changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Botón siguiente
        html += `
            <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="historialManager.changePage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = html;
    }

    changePage(page) {
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.displayResults();
        }
    }

    updateSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const selectAllVisible = document.getElementById('selectAllVisible');
        
        if (!selectAll || !selectAllVisible) return;
        
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, filtered.length);
        
        // Verificar si todos los elementos visibles están seleccionados
        let allVisibleSelected = true;
        for (let i = startIndex; i < endIndex; i++) {
            if (!this.selectedItems.has(i)) {
                allVisibleSelected = false;
                break;
            }
        }
        
        selectAllVisible.checked = allVisibleSelected;
        
        // Verificar si todos los elementos filtrados están seleccionados
        let allFilteredSelected = true;
        for (let i = 0; i < filtered.length; i++) {
            if (!this.selectedItems.has(i)) {
                allFilteredSelected = false;
                break;
            }
        }
        
        selectAll.checked = allFilteredSelected;
    }

    updateChart(history) {
        // Agrupar por mes
        const monthlyData = {};
        
        history.forEach(item => {
            const date = new Date(item.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    total: 0,
                    count: 0
                };
            }
            
            monthlyData[monthKey].total += item.amount || 0;
            monthlyData[monthKey].count += 1;
        });
        
        // Ordenar por mes
        const months = Object.keys(monthlyData).sort();
        const totals = months.map(month => monthlyData[month].total);
        const counts = months.map(month => monthlyData[month].count);
        
        const ctx = document.getElementById('historyChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(m => {
                    const [year, month] = m.split('-');
                    return `${month}/${year.substring(2)}`;
                }),
                datasets: [
                    {
                        label: 'Importe Total (€)',
                        data: totals,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Número de Cálculos',
                        data: counts,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Importe (€)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Número de cálculos'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Aplicar filtros
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        // Resetear filtros
        document.getElementById('resetFilters').addEventListener('click', () => {
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('monthFilter').value = '';
            document.getElementById('yearFilter').value = '';
            document.getElementById('typeFilter').value = '';
            this.applyFilters();
        });
        
        // Seleccionar todos
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const data = this.getData();
            const filtered = this.filterHistory(data.history || []);
            
            if (e.target.checked) {
                for (let i = 0; i < filtered.length; i++) {
                    this.selectedItems.add(i);
                }
            } else {
                this.selectedItems.clear();
            }
            
            this.displayResults();
        });
        
        // Eliminar seleccionados
        document.getElementById('deleteSelected').addEventListener('click', () => {
            if (this.selectedItems.size === 0) {
                alert('No hay elementos seleccionados');
                return;
            }
            
            if (!confirm(`¿Eliminar ${this.selectedItems.size} elementos seleccionados?`)) {
                return;
            }
            
            const data = this.getData();
            const filtered = this.filterHistory(data.history || []);
            
            // Crear nuevo array excluyendo los seleccionados
            const newHistory = (data.history || []).filter((item, index) => {
                // Encontrar el índice en los filtrados
                const filteredIndex = filtered.findIndex(f => 
                    f.date === item.date && 
                    f.start_time === item.start_time &&
                    f.amount === item.amount
                );
                
                // Si está en los filtrados y está seleccionado, excluirlo
                return !(filteredIndex !== -1 && this.selectedItems.has(filteredIndex));
            });
            
            data.history = newHistory;
            localStorage.setItem('horasExtrasData', JSON.stringify(data));
            
            // Limpiar selección y refrescar
            this.selectedItems.clear();
            this.applyFilters();
            
            alert(`${this.selectedItems.size} elementos eliminados`);
        });
        
        // Exportar filtrado
        document.getElementById('exportFiltered').addEventListener('click', () => {
            this.exportFilteredData();
        });
        
        // Exportar a CSV
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportToCSV();
        });
        
        // Exportar a JSON
        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportToJSON();
        });
        
        // Auto-aplicar filtros al cambiar valores
        ['startDate', 'endDate', 'monthFilter', 'yearFilter', 'typeFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                // Pequeño delay para permitir cambios múltiples
                clearTimeout(this.filterTimeout);
                this.filterTimeout = setTimeout(() => this.applyFilters(), 300);
            });
        });
    }

    viewDetails(index) {
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        
        if (index >= 0 && index < filtered.length) {
            const item = filtered[index];
            const date = new Date(item.date);
            const dayType = this.getDayType(date);
            
            let detailsHTML = `
                <div class="detail-section">
                    <h4><i class="fas fa-calendar-day"></i> Información del Día</h4>
                    <p><strong>Fecha:</strong> ${this.formatDate(date)}</p>
                    <p><strong>Tipo de día:</strong> <span class="badge badge-${this.getDayTypeClass(dayType)}">${this.getDayTypeName(dayType)}</span></p>
                    <p><strong>Horario:</strong> ${item.start_time || item.startTime || '--:--'} a ${item.end_time || item.endTime || '--:--'}</p>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-clock"></i> Horas Trabajadas</h4>
                    <p><strong>Horas totales:</strong> ${parseFloat(item.total_hours || item.totalHours || 0).toFixed(2)} horas</p>
                    <p><strong>Horas normales:</strong> ${parseFloat((item.total_hours || item.totalHours || 0) - (item.extra_hours || item.extraHours || 0)).toFixed(2)} horas</p>
                    <p><strong>Horas extras:</strong> ${parseFloat(item.extra_hours || item.extraHours || 0).toFixed(2)} horas</p>
                    <p><strong>Horas nocturnas:</strong> ${parseFloat(item.night_hours || item.nightHours || 0).toFixed(2)} horas</p>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-euro-sign"></i> Cálculo Económico</h4>
                    <p><strong>Importe total:</strong> ${parseFloat(item.amount || 0).toFixed(2)} €</p>
            `;
            
            // Si hay breakdown, mostrar más detalles
            if (item.breakdown) {
                const breakdown = typeof item.breakdown === 'string' ? 
                    JSON.parse(item.breakdown) : item.breakdown;
                
                if (breakdown.extraWeekAmount) detailsHTML += `<p><strong>Extra entre semana:</strong> ${parseFloat(breakdown.extraWeekAmount || 0).toFixed(2)} €</p>`;
                if (breakdown.extraSatAmount) detailsHTML += `<p><strong>Extra sábados:</strong> ${parseFloat(breakdown.extraSatAmount || 0).toFixed(2)} €</p>`;
                if (breakdown.extraSunAmount) detailsHTML += `<p><strong>Extra domingos:</strong> ${parseFloat(breakdown.extraSunAmount || 0).toFixed(2)} €</p>`;
                if (breakdown.extraFestAmount) detailsHTML += `<p><strong>Extra festivos:</strong> ${parseFloat(breakdown.extraFestAmount || 0).toFixed(2)} €</p>`;
                if (breakdown.nightAmount) detailsHTML += `<p><strong>Recargo nocturno:</strong> ${parseFloat(breakdown.nightAmount || 0).toFixed(2)} €</p>`;
            }
            
            detailsHTML += `</div>`;
            
            document.getElementById('detailContent').innerHTML = detailsHTML;
            document.getElementById('detailModal').style.display = 'block';
        }
    }

    editItem(index) {
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        
        if (index >= 0 && index < filtered.length) {
            const item = filtered[index];
            
            // En una implementación real, esto abriría un formulario de edición
            alert('Función de edición en desarrollo. Por ahora, elimina y crea de nuevo.');
        }
    }

    deleteItem(index) {
        if (!confirm('¿Eliminar este registro?')) return;
        
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        
        if (index >= 0 && index < filtered.length) {
            const itemToDelete = filtered[index];
            
            // Encontrar y eliminar del historial completo
            const itemIndex = data.history.findIndex(item => 
                item.date === itemToDelete.date && 
                item.start_time === itemToDelete.start_time &&
                item.amount === itemToDelete.amount
            );
            
            if (itemIndex !== -1) {
                data.history.splice(itemIndex, 1);
                localStorage.setItem('horasExtrasData', JSON.stringify(data));
                this.applyFilters();
                alert('Registro eliminado');
            }
        }
    }

    exportFilteredData() {
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        
        if (filtered.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        this.exportToCSV(filtered);
    }

    exportToCSV(data = null) {
        const exportData = data || this.getData().history || [];
        
        if (exportData.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        let csv = 'Fecha,Entrada,Salida,Horas Totales,Horas Normales,Horas Extras,Horas Nocturnas,Importe,Tipo\n';
        
        exportData.forEach(item => {
            const date = new Date(item.date);
            const dayType = this.getDayType(date);
            const normalHours = (item.total_hours || item.totalHours || 0) - (item.extra_hours || item.extraHours || 0);
            
            csv += `"${item.date}","${item.start_time || item.startTime || ''}","${item.end_time || item.endTime || ''}",`;
            csv += `"${parseFloat(item.total_hours || item.totalHours || 0).toFixed(2)}","${parseFloat(normalHours).toFixed(2)}",`;
            csv += `"${parseFloat(item.extra_hours || item.extraHours || 0).toFixed(2)}","${parseFloat(item.night_hours || item.nightHours || 0).toFixed(2)}",`;
            csv += `"${parseFloat(item.amount || 0).toFixed(2)}","${this.getDayTypeName(dayType)}"\n`;
        });
        
        this.downloadFile(csv, `historial_filtrado_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }

    exportToJSON() {
        const data = this.getData();
        const filtered = this.filterHistory(data.history || []);
        
        if (filtered.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                filters: this.currentFilters,
                totalRecords: filtered.length
            },
            data: filtered
        };
        
        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile(json, `historial_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
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
    
    historialManager = new HistorialManager();
    historialManager.init();
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            auth.logout();
        }
    });
    
    // Modal
    document.querySelector('.close-modal')?.addEventListener('click', function() {
        document.getElementById('detailModal').style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('detailModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Hacer el manager global para los event handlers
let historialManager;