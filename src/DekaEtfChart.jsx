import React from 'react';
import { Line } from 'react-chartjs-2';
import moment from 'moment';

const etfData = require('./data/history.json');

import 'chartjs-plugin-annotation';

import roundTo from 'round-to';

const options = {
   maintainAspectRatio: false,
   legend: {
      position: 'bottom',
      labels: {
         boxWidth: 1,
      },
   },
   scales: {
      yAxes: [
         {
            ticks: {
               beginAtZero: true,
            },
         },
      ],
   },
   elements: {
      point: {
         radius: 0,
         hitRadius: 10,
         hoverRadius: 4,
         hoverBorderWidth: 3,
      },
   },
   chartArea: {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
   },
   annotation: {
      annotations: [
         {
            drawTime: 'afterDatasetsDraw',
            id: 'hline',
            type: 'line',
            // mode: 'horizontal',
            // scaleID: 'x-axis-0',
            value: '5. Jun 2012',
            borderColor: '#6610f2',
            borderWidth: 1,
            label: {
               backgroundColor: 'rgba(0,0,0, 0.9)',
               content: 'Buy',
               enabled: true,
            },
         },
      ],
   },
};

function getAnnotation(value, label, color, counter) {
   return {
      drawTime: 'afterDatasetsDraw',
      id: `hline-${counter}`,
      type: 'line',
      // mode: 'horizontal',
      scaleID: 'x-axis-0',
      value,
      borderColor: color,
      borderWidth: 1,
      label: {
         backgroundColor: 'rgba(0,0,0, 0.9)',
         content: label,
         enabled: true,
         // yAdjust: Math.random() * 1000 - 500,
      },
   };
}

function getOptionsWithAnnotations(options, annotations) {
   options.annotation = { annotations };
   return options;
}

const colors = [
   '#20a8d8',
   '#f8cb00',
   '#e83e8c',
   '#20c997',
   '#6f42c1',
   '#ffc107',
   '#63c2de',
   '#4dbd74',
   '#6610f2',
   '#17a2b8',
   '#f86c6b',
];

function getNewDataSet(data, labelName, color = 'black') {
   return {
      label: labelName,
      backgroundColor: 'rgb(0, 0, 0, 0.1)',
      borderColor: color,
      borderWidth: 2,
      data,
      hidden: false,
      fill: false,
   };
}

function getLabels(data) {
   return data.map((dayData) => {
      const currentDay = dayData.date;
      let label = '';
      const dayDate = moment.unix(currentDay).utc();
      return dayDate.format('D. MMM YYYY');
      // const currentDayString = dayDate.format('DD');

      // const month = dayDate.clone().startOf('month');
      // const startDayString = month.format('DD');

      // if (currentDayString === startDayString) {
      //    label = dayDate.format('D. MMM YYYY');
      // }
      // return label;
   });
}

const LINE_200 = 200;
const LINE_100 = 100;

function TestChart() {
   const labels = getLabels(etfData);
   const data = etfData.map((dayData) => {
      const price = dayData.close;
      // return roundTo(+price, 2);
      return price;
   });

   const dates = labels.map((label) => moment.utc(label));
   console.log('dates :>> ', dates);
   let monthlyDepositAmount = 400;

   let stockCounts = 0;
   for (let index = 0; index < labels.length; index++) {
      const price = data[index];
      const currentDate = dates[index];
      if (currentDate.year() > 2010 && currentDate.date() === 1) {
         stockCounts += monthlyDepositAmount / price;
      }
   }
   console.log('stockCounts :>> ', stockCounts);
   console.log('total saving :>> ', stockCounts * data[data.length - 1]);

   monthlyDepositAmount = 320;
   const liquidDepositAmount = 80;

   let stockCounts2 = 0;
   let summit = 0;
   let currentState = 'normal';
   let cash = 0;

   for (let index = 0; index < labels.length; index++) {
      const currentDate = dates[index];
      if (currentDate.year() > 2010) {
         const price = data[index];
         if (price === null) console.log('price null :>> ', `${currentDate.format()}`);

         summit = price >= summit ? price : summit;
         const topUpThreshold60 = 0.4 * summit;
         const soldThreshold20 = 0.8 * summit;

         if (currentState === 'normal' && price <= topUpThreshold60) {
            console.log('price :>> ', price);
            console.log('summit :>> ', summit);
            console.log('topUpThreshold60 :>> ', topUpThreshold60);
            const extraStocks = cash / price;
            stockCounts2 += extraStocks;
            cash = 0;
            currentState = 'topUp';
            console.log('top up :>> ', `${currentDate.format()}: ${extraStocks}`);
         }
         if (currentState === 'topUp' && price > soldThreshold20) {
            const soldStocks = stockCounts2 * 0.2;
            cash += soldStocks * price;
            stockCounts2 -= soldStocks;
            currentState = 'normal';
            console.log('sell :>> ', `${currentDate.format()}: ${soldStocks}`);
         }
         if (currentDate.date() === 1) {
            stockCounts += monthlyDepositAmount / price;
            cash += liquidDepositAmount;
         }
      }
   }
   console.log('stockCounts2 :>> ', stockCounts2);
   console.log('total saving 2:>> ', stockCounts2 * data[data.length - 1]);

   const line200 = etfData.map((dayData, idx) => {
      if (idx >= LINE_200) {
         const section200 = etfData.slice(idx - LINE_200, idx);

         const sum200 = section200.reduce((sum, curr) => (sum += curr.close), 0);
         return sum200 / LINE_200;
      } else {
         return dayData.close;
      }
   });

   const line200Minus5 = line200.map((value) => {
      return value - (value / 100) * 5;
   });

   const line200Plus5 = line200.map((value) => {
      return value + (value / 100) * 5;
   });

   const line100 = etfData.map((dayData, idx) => {
      if (idx >= LINE_100) {
         const section100 = etfData.slice(idx - LINE_100, idx);

         const sum100 = section100.reduce((sum, curr) => (sum += curr.close), 0);
         return sum100 / LINE_100;
      } else {
         return dayData.close;
      }
   });

   const indiLine = [];

   for (let index = 0; index < etfData.length; index++) {
      const dataPoint100 = line100[index];
      const dataPoint200 = line200[index];
      indiLine.push(dataPoint200 + (dataPoint200 - dataPoint100) * 0.5);
   }

   const annotations = [];
   let lastSoldDiff = 0;
   let lastBuyDiff = 0;
   let counter = 0;
   let lastAction = 'sold';

   for (let index = 200; index < data.length; index++) {
      const price = data[index];
      // const price200 = line200[index];
      const price200Minus5 = line200Minus5[index];
      const price200Plus5 = line200Plus5[index];
      const label = labels[index];
      const currentSoldDiff = price - price200Minus5;
      const currentBuyDiff = price - price200Plus5;

      if (lastAction === 'sold' && lastBuyDiff <= 0 && currentBuyDiff > 0) {
         annotations.push(getAnnotation(label, 'Buy', '#6610f2', counter));
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'buy';
      }
      // console.log('lastSoldDiff :>> ', lastSoldDiff);
      // console.log('currentSoldDiff :>> ', currentSoldDiff);

      if (lastAction === 'buy' && lastSoldDiff > 0 && currentSoldDiff <= 0) {
         annotations.push(getAnnotation(label, 'Sold', '#4dbd74', counter));
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'sold';
      }
      counter++;
   }
   // console.log('annotations :>> ', annotations);

   const chartData = {
      labels,
      datasets: [
         getNewDataSet(data, 'EL4C.DE'),
         // getNewDataSet(line200, 'EL4C.DE (200)', 'rgba(245, 0, 160, 1)'),
         // getNewDataSet(line200Minus5, 'EL4C.DE (200 - 5%)', '#ffc107'),
         // getNewDataSet(line200Plus5, 'EL4C.DE (200 + 5%)', '#20c997'),
         // getNewDataSet(line100, 'EL4C.DE (100)', '#ffc107'),
         // getNewDataSet(indiLine, 'EL4C.DE (ext)', '#20c997'),
      ],
   };

   return <Line data={chartData} options={getOptionsWithAnnotations(options, annotations)} height={300} />;
}

export default TestChart;
