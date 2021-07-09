import React from 'react';
import moment from 'moment';
import Plot from 'react-plotly.js';

// const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
const rawData = require('./data/LongHistoryBTC.json');

function getLabels(data) {
   return data.map((dayData) => {
      const currentDay = dayData.date;
      const dayDate = moment.unix(currentDay).utc();
      return dayDate.format('D. MMM YYYY');
   });
}

// ChainLink:
// 50d/10% => 12.2k
// 30d/10% => 24.3k
// 30d/5% => 50.4k
// 20d/6% => 48.4k

// Bitcoin:
// 50d/10% => 15.2k
// 30d/10% => 7.3k
// 30d/5% => 7.7k
// 20d/6% => 5.2k
// 100d/10% => 5.9k
// 40d/10% => 7.5k
// 40d/15% => 8.5k
// 45d/12% => 12.6k
// 60d/10% => 13.7k
// 60d/5% => 16.0k
// 40d/5% => 11.8k

function TestChart() {
   const start = moment('2016-09-05').unix();
   const end = moment('2017-11-25').unix();

   const sourceData = rawData.filter((data) => data.date > start && data.date < end);
   // const sourceData = rawData.slice(Math.round((rawData.length / 3) * 2));
   // const sourceData = rawData;

   const labels = getLabels(sourceData);
   const data = sourceData.map((dayData) => {
      const price = dayData.value;
      // return roundTo(+price, 2);
      return price;
   });

   const result = [];
   let top10 = [];

   const daysParams = [];
   for (let days = 1; days <= 200; days++) {
      daysParams.push(days);
   }

   const toleranceParams = [];
   for (let tolerance = 1; tolerance <= 40; tolerance++) {
      toleranceParams.push(tolerance);
   }

   daysParams.forEach((daysParam) => {
      const tolerancesRes = [];
      toleranceParams.forEach((toleranceParam) => {
         const { xDayLine: lineX, plusLimit: lineXPlus, minusLimit: lineXMinus } = getXDayLineData(
            daysParam,
            data,
            toleranceParam,
         );
         const { savings, date, transactions } = calcProfit(daysParam, labels, data, lineXMinus, lineXPlus);
         tolerancesRes.push(savings);
         top10.push({ savings, days: daysParam, tolerance: toleranceParam, transactions });
      });
      result.push(tolerancesRes);
   });

   top10.sort((a, b) => b.savings - a.savings);
   console.log('top25 :>> ', top10.slice(0, 25));

   console.log('result :>> ', result);
   // const dates = labels.map((label) => moment.utc(label));
   // console.log('dates :>> ', dates);

   // const indiLine = [];

   // for (let index = 0; index < sourceData.length; index++) {
   //    const dataPoint100 = line100[index];
   //    const dataPoint200 = line200[index];
   //    indiLine.push(dataPoint200 + (dataPoint200 - dataPoint100) * 0.5);
   // }

   // console.log('annotations :>> ', annotations);
   // console.log('line200 :>> ', line200);
   // const chartData = {
   //    labels,
   //    datasets: [
   //       getNewDataSet(data, 'ChainLink'),
   //       // getNewDataSet(line200, '200 days', 'rgba(245, 0, 160, 1)'),
   //       getNewDataSet(lineXMinus, `- ${TOLERANCE}%`, '#6610f2'),
   //       getNewDataSet(lineXPlus, `+ ${TOLERANCE}%`, '#f86c6b'),
   //       // getNewDataSet(line100, '100 days', '#ffc107'),
   //       getNewDataSet(lineX, `30${LINE_X} days`, '#20c997'),
   //       // getNewDataSet(indiLine, 'EL4C.DE (ext)', '#20c997'),
   //    ],
   // };

   // return <div>Test</div>;
   return <Plot data={[{ z: result, type: 'surface' }]} />;
}

function getXDayLineData(days, data, tolerance) {
   const xDayLine = data.map((dayData, idx) => {
      if (idx >= days) {
         const sectionXdays = data.slice(idx - days, idx);

         const sumXdays = sectionXdays.reduce((sum, curr) => (sum += curr), 0);
         return sumXdays / days;
      } else {
         return dayData;
      }
   });

   const xDayLineMinus = xDayLine.map((value) => {
      return value - (value / 100) * tolerance;
   });

   const xDayLinePlus = xDayLine.map((value) => {
      return value + (value / 100) * tolerance;
   });
   return { xDayLine, plusLimit: xDayLinePlus, minusLimit: xDayLineMinus };
}

function calcProfit(days, labels, lineData, lineDataMinus, lineDataPlus) {
   const INITIAL_MONEY = 1000;
   let pieces = 0;
   let currentMoney = INITIAL_MONEY;
   let transactionCount = 0;

   let lastSoldDiff = 0;
   let lastBuyDiff = 0;
   let counter = 0;
   let lastAction = 'sold';

   let lastSold = { savings: INITIAL_MONEY, date: labels[0] };

   for (let index = days; index < lineData.length; index++) {
      const price = lineData[index];
      const priceMinus5 = lineDataMinus[index];
      const pricePlus5 = lineDataPlus[index];
      const label = labels[index];
      const currentSoldDiff = price - priceMinus5;
      const currentBuyDiff = price - pricePlus5;

      if (lastAction === 'sold' && lastBuyDiff <= 0 && currentBuyDiff > 0) {
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'buy';

         pieces = currentMoney / price;
         currentMoney = 0;
         transactionCount++;
         // console.log(`BUY :>> ${label} (pieces: ${pieces} / price: ${price})`);
      }
      // console.log('lastSoldDiff :>> ', lastSoldDiff);
      // console.log('currentSoldDiff :>> ', currentSoldDiff);

      if (lastAction === 'buy' && lastSoldDiff > 0 && currentSoldDiff <= 0) {
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'sold';

         currentMoney = price * pieces;
         pieces = 0;
         // console.log(`SOLD :>> ${label} (savings: ${currentMoney} / price: ${price})`);
         transactionCount++;
         lastSold = { savings: currentMoney, date: label, transactions: transactionCount };
      }
      counter++;
   }
   return lastSold;
}

export default TestChart;
