class ChartComponent extends HTMLElement {

    constructor() {
        super();
        this.chart = null;
    }

    connectedCallback() {
        this.renderChart();
    }

    static get observedAttributes() {
        return ['min', 'max', 'values', 'interval', 'bandwidth'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.renderChart();
        }
    }

    renderChart() {
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        const values = JSON.parse(this.getAttribute('values') || '[]');
        const interval = parseInt(this.getAttribute('interval')) || 1000; // Default 1000 milliseconds
        const bandwidth = parseInt(this.getAttribute('bandwidth')) || 10; // Default 10 data points

        const labels = values.map((_, index) => new Date(Date.now() - (values.length - 1 - index) * interval));

        const data = {
            labels: labels,
            datasets: [{
                label: 'Time Series Data',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                data: values,
            }],
        };

        const config = {
            type: 'line', // Using a line chart for time series
            data: data,
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            stepSize: interval / 1000,
                            tooltipFormat: 'HH:mm:ss',
                        },
                    },
                    y: {
                        suggestedMin: min,
                        suggestedMax: max,
                    },
                },
                plugins: {
                    legend: {
                        display: true,
                    },
                },
            },
        };

        if (this.chart) {
            this.chart.destroy(); // Destroy the old chart instance before creating a new one
        }

        const ctx = this.appendChild(document.createElement('canvas')).getContext('2d');
        this.chart = new Chart(ctx, config);

        this.updateChart(interval, bandwidth);
    }

    updateChart(interval, bandwidth) {
        setInterval(() => {
            if (this.chart) {
                const newDataValue = Math.random() * (parseInt(this.getAttribute('max')) - parseInt(this.getAttribute('min'))) + parseInt(this.getAttribute('min'));
                const newLabel = new Date();
                this.chart.data.labels.push(newLabel);
                this.chart.data.datasets.forEach((dataset) => {
                    dataset.data.push(newDataValue);
                });

                if (this.chart.data.labels.length > bandwidth) {
                    this.chart.data.labels.shift();
                    this.chart.data.datasets.forEach((dataset) => {
                        dataset.data.shift();
                    });
                }

                this.chart.update();
            }
        }, interval);
    }

}

customElements.define('chart', ChartComponent);
