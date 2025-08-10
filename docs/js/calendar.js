class KitchenCarCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.marketsData = [];
        this.allShops = [];
        this.filteredShops = [];
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateMarketSelect();
        this.populateMonthSelect();
        this.renderCalendar();
    }

    async loadData() {
        try {
            // Load markets data
            const marketsResponse = await fetch('data/markets.json');
            this.marketsData = await marketsResponse.json();

            // Load all market info files
            const marketInfoPromises = this.marketsData.map(async (market) => {
                try {
                    const response = await fetch(`data/market_info_${market.id}.json`);
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.warn(`Failed to load data for market ${market.id}:`, error);
                    return null;
                }
            });

            const marketInfos = await Promise.all(marketInfoPromises);
            
            // Combine all shop data
            this.allShops = [];
            marketInfos.forEach(marketInfo => {
                if (marketInfo && marketInfo.shop_info) {
                    marketInfo.shop_info.forEach(shop => {
                        this.allShops.push({
                            ...shop,
                            market_id: marketInfo.market_id,
                            market_name: marketInfo.market_name
                        });
                    });
                }
            });

            this.filteredShops = [...this.allShops];
            console.log('Loaded shops:', this.allShops.length);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    setupEventListeners() {
        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Filters
        document.getElementById('market-select').addEventListener('change', (e) => {
            this.filterShops();
        });

        document.getElementById('month-select').addEventListener('change', (e) => {
            if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                this.currentDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                this.renderCalendar();
            }
        });
    }

    populateMarketSelect() {
        const select = document.getElementById('market-select');
        this.marketsData.forEach(market => {
            const option = document.createElement('option');
            option.value = market.id;
            option.textContent = market.name;
            select.appendChild(option);
        });
    }

    populateMonthSelect() {
        const select = document.getElementById('month-select');
        const months = new Set();
        
        this.allShops.forEach(shop => {
            if (shop.date) {
                // Parse date manually to avoid timezone issues
                const [year, month, day] = shop.date.split('-').map(num => parseInt(num));
                const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
                months.add(yearMonth);
            }
        });

        Array.from(months).sort().forEach(yearMonth => {
            const option = document.createElement('option');
            option.value = yearMonth;
            const [year, month] = yearMonth.split('-');
            option.textContent = `${year}年${parseInt(month)}月`;
            select.appendChild(option);
        });
    }

    filterShops() {
        const selectedMarket = document.getElementById('market-select').value;
        
        this.filteredShops = this.allShops.filter(shop => {
            if (selectedMarket && shop.market_id !== selectedMarket) {
                return false;
            }
            return true;
        });

        this.renderCalendar();
        this.hideShopDetails();
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const currentMonth = document.getElementById('current-month');
        
        // Update month display
        const monthNames = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];
        currentMonth.textContent = `${this.currentDate.getFullYear()}年${monthNames[this.currentDate.getMonth()]}`;

        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'day-header';
            header.textContent = day;
            header.style.cssText = `
                background: #34495e;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
            `;
            calendar.appendChild(header);
        });

        // Calculate calendar days
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate calendar days
        const calendarDays = [];
        const current = new Date(startDate);
        
        for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
            calendarDays.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        // Render days
        calendarDays.forEach(date => {
            const dayElement = this.createDayElement(date, month);
            calendar.appendChild(dayElement);
        });
    }

    createDayElement(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const isCurrentMonth = date.getMonth() === currentMonth;
        const dateString = this.formatDate(date);
        
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        }

        // Count shops for this date
        const shopsForDate = this.filteredShops.filter(shop => {
            const matches = shop.date === dateString;
            // Debug: uncomment the line below if you need to debug date matching
            // console.log(`Comparing shop date: ${shop.date} with calendar date: ${dateString}, matches: ${matches}`);
            return matches;
        });
        
        if (shopsForDate.length > 0) {
            dayElement.classList.add('has-shops');
        }

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);

        // Shop count
        if (shopsForDate.length > 0) {
            const shopCount = document.createElement('div');
            shopCount.className = 'shop-count';
            shopCount.textContent = `${shopsForDate.length}店舗`;
            dayElement.appendChild(shopCount);
        }

        // Click event
        dayElement.addEventListener('click', () => {
            this.selectDate(date, shopsForDate);
        });

        return dayElement;
    }

    selectDate(date, shops) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });

        // Add selection to clicked day
        event.currentTarget.classList.add('selected');
        
        this.selectedDate = date;
        this.showShopDetails(date, shops);
    }

    showShopDetails(date, shops) {
        const detailsContainer = document.getElementById('shop-details');
        const shopList = document.getElementById('shop-list');
        
        if (shops.length === 0) {
            detailsContainer.style.display = 'none';
            return;
        }

        const dateString = this.formatDateJapanese(date);
        
        shopList.innerHTML = `
            <h4>${dateString}の出店情報 (${shops.length}店舗)</h4>
            ${shops.map(shop => this.createShopItemHTML(shop)).join('')}
        `;
        
        detailsContainer.style.display = 'block';
        detailsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    hideShopDetails() {
        document.getElementById('shop-details').style.display = 'none';
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
    }

    createShopItemHTML(shop) {
        const marketName = this.getMarketDisplayName(shop.market_id);
        
        return `
            <div class="shop-item">
                <div class="shop-name">${this.escapeHtml(shop.name)}</div>
                <div class="shop-menu">${this.escapeHtml(shop.menu)}</div>
                <div class="shop-info">
                    <span class="shop-hours">⏰ ${this.escapeHtml(shop.hours)}</span>
                    <span class="shop-market">${this.escapeHtml(marketName)}</span>
                    ${shop.url ? `<a href="${shop.url}" target="_blank" class="shop-url">詳細を見る</a>` : ''}
                </div>
            </div>
        `;
    }

    getMarketDisplayName(marketId) {
        const market = this.marketsData.find(m => m.id === marketId);
        return market ? market.name : 'Unknown Market';
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateJapanese(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dayName = dayNames[date.getDay()];
        
        return `${year}年${month}月${day}日 (${dayName})`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the calendar when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new KitchenCarCalendar();
});
