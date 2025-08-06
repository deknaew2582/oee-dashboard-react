// src/App.js
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import 'chartjs-adapter-moment';
import { Bar, Line, Pie } from 'react-chartjs-2';

import styles from './App.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* ---------- helpers ---------- */
const rnd = (min, max) => Math.random() * (max - min) + min;
const rndInt = (min, max) => Math.floor(rnd(min, max + 1));

function generateMockData() {
  const now = new Date();
  const oneMin = 60 * 1000;
  const oneHour = 60 * oneMin;

  /* 1. 60 x 1-min data */
  const machineMetrics = Array.from({ length: 60 }, (_, i) => ({
    ts: new Date(now - (59 - i) * oneMin),
    runtime: rnd(5, 55),
    netRuntime: rnd(5, 50),
    fgCount: rndInt(0, 10),
    waitingTime: rnd(0, 10)
  }));

  /* 2. 8-hour FG by SKU */
  const skus = ['SKU-A', 'SKU-B', 'SKU-C', 'SKU-D'];
  const fgByHour = Array.from({ length: 8 }, (_, i) => {
    const hourTs = new Date(now - (7 - i) * oneHour);
    const skuData = {};
    skus.forEach(s => (skuData[s] = rndInt(50, 300)));
    return { hourTs, ...skuData };
  });

  /* 3. SKU summary */
  const skuSummary = skus.map(sku => {
    const target = rndInt(500, 1000);
    const actual = rndInt(target * 0.7, target);
    const defects = rndInt(actual * 0.05, actual * 0.15);
    return {
      sku,
      target,
      actual,
      defects,
      qualityRate: +((actual - defects) / actual * 100).toFixed(1)
    };
  });

  /* 4. Capacity vs Actual */
  const capacityVsActual = Array.from({ length: 8 }, (_, i) => {
    const hourTs = new Date(now - (7 - i) * oneHour);
    const cap = rndInt(300, 500);
    return { hourTs, capacity: cap, actual: rndInt(cap * 0.7, cap) };
  });

  /* 5. OEE metrics */
  const availability = +rnd(80, 100).toFixed(1);
  const performance = +rnd(75, 95).toFixed(1);
  const quality = +rnd(85, 100).toFixed(1);
  const oee = +((availability * performance * quality) / 10000).toFixed(1);

  return {
    machineMetrics,
    fgByHour,
    skuSummary,
    capacityVsActual,
    oeeMetrics: { availability, performance, quality, oee }
  };
}

/* ---------- KPI Card ---------- */
const KpiCard = ({ title, value, className }) => (
  <div className={`${styles.kpiCard} ${className}`}>
    <div className={styles.kpiTitle}>{title}</div>
    <div className={styles.kpiValue}>{value}%</div>
  </div>
);

/* ---------- Live FG Chart ---------- */
const LIVE_INTERVAL = 10_000;
function LiveFGChart({ initialData }) {
  const [values, setValues] = useState(initialData);

  useEffect(() => {
    const id = setInterval(() => {
      setValues(prev =>
        prev.map(item => ({
          ...item,
          'SKU-A': item['SKU-A'] + rndInt(0, 3),
          'SKU-B': item['SKU-B'] + rndInt(0, 3),
          'SKU-C': item['SKU-C'] + rndInt(0, 3),
          'SKU-D': item['SKU-D'] + rndInt(0, 3)
        }))
      );
    }, LIVE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const data = {
    labels: values.map(v => v.hourTs),
    datasets: ['SKU-A', 'SKU-B', 'SKU-C', 'SKU-D'].map((sku, i) => ({
      label: sku,
      data: values.map(v => v[sku]),
      backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'][i]
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 13 } } },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 14 },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 12 } },
        type: 'time',
        time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: { font: { size: 12 } }
      }
    }
  };

  return (
    <div className={styles.card}>
      <h3>FG Count per Hour (Live)</h3>
      <div className={styles.chart}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

/* ---------- SKU Pie Chart ---------- */
function SKUPieChart({ summary }) {
  const data = {
    labels: summary.map(s => s.sku),
    datasets: [
      {
        data: summary.map(s => s.actual),
        backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'],
        hoverOffset: 8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } }
  };

  return (
    <div className={styles.chart}>
      <Pie data={data} options={options} />
    </div>
  );
}

/* ---------- Main App ---------- */
export default function App() {
  const [plant, setPlant] = useState('Plant A');
  const [machine, setMachine] = useState('Machine 1');
  const [data, setData] = useState(null);

  const refresh = () => setData(generateMockData());
  useEffect(() => refresh(), [plant, machine]);

  if (!data) return <div className={styles.loading}>Loading…</div>;

  /* ---------- chart data ---------- */
  const mm = data.machineMetrics;
  const metricsChartData = {
    labels: mm.map(m => m.ts),
    datasets: [
      {
        label: 'Runtime (s)',
        data: mm.map(m => m.runtime),
        borderColor: '#0ea5e9',
        backgroundColor: '#0ea5e922',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Net Runtime (s)',
        data: mm.map(m => m.netRuntime),
        borderColor: '#10b981',
        backgroundColor: '#10b98122',
        fill: true,
        tension: 0.3
      },
      {
        label: 'FG Count',
        data: mm.map(m => m.fgCount),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b22',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Waiting (s)',
        data: mm.map(m => m.waitingTime),
        borderColor: '#f43f5e',
        backgroundColor: '#f43f5e22',
        fill: true,
        tension: 0.3
      }
    ]
  };

  const capChartData = {
    labels: data.capacityVsActual.map(c => c.hourTs),
    datasets: [
      {
        label: 'Capacity',
        data: data.capacityVsActual.map(c => c.capacity),
        backgroundColor: '#0ea5e9aa'
      },
      {
        label: 'Actual',
        data: data.capacityVsActual.map(c => c.actual),
        backgroundColor: '#10b981aa'
      }
    ]
  };

  const commonOpts = unit => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: { unit, displayFormats: { minute: 'HH:mm', hour: 'HH:mm' } }
      },
      y: { beginAtZero: true }
    },
    plugins: { legend: { position: 'top' } }
  });

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>OEE Monitoring Dashboard</h1>
        <div className={styles.filters}>
          <select value={plant} onChange={e => setPlant(e.target.value)}>
            {['Plant A', 'Plant B', 'Plant C'].map(p => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={machine} onChange={e => setMachine(e.target.value)}>
            {['Machine 1', 'Machine 2', 'Machine 3', 'Machine 4'].map(m => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button onClick={refresh}>Refresh</button>
        </div>
      </header>

      {/* KPI Cards with gradient colors */}
      <section className={styles.kpis}>
        <KpiCard title="Availability" value={data.oeeMetrics.availability} className={styles.avail} />
        <KpiCard title="Performance" value={data.oeeMetrics.performance} className={styles.perf} />
        <KpiCard title="Quality" value={data.oeeMetrics.quality} className={styles.qual} />
        <KpiCard title="Overall OEE" value={data.oeeMetrics.oee} className={styles.oee} />
      </section>

      {/* 1) Machine Metrics — full width */}
      <section className={`${styles.card} ${styles.fullWidth}`}>
        <h3>Machine Metrics (1-min)</h3>
        <div className={styles.chart}>
          <Line data={metricsChartData} options={commonOpts('minute')} />
        </div>
      </section>

      {/* 2) FG Count per Hour (Live) */}
      <LiveFGChart initialData={data.fgByHour} />

      {/* 3) SKU Summary (pie + table) */}
      <section className={styles.card}>
        <h3>SKU Summary</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <SKUPieChart summary={data.skuSummary} />
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Defects</th>
                  <th>Quality %</th>
                </tr>
              </thead>
              <tbody>
                {data.skuSummary.map(s => (
                  <tr key={s.sku}>
                    <td>{s.sku}</td>
                    <td>{s.target}</td>
                    <td>{s.actual}</td>
                    <td>{s.defects}</td>
                    <td>{s.qualityRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4) Capacity vs Actual */}
      <section className={styles.card}>
        <h3>Capacity vs Actual</h3>
        <div className={styles.chart}>
          <Bar data={capChartData} options={commonOpts('hour')} />
        </div>
      </section>
    </div>
  );
}