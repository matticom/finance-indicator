import moment from 'moment';

// const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
// const rawData = require('./data/LongHistoryBTC.json');

function getLabels(data) {
   return data.map((dayData) => {
      const currentDay = dayData.date;
      const dayDate = moment.unix(currentDay);
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

const MIN_TOLERANCE = 3;
const MAX_TOLERANCE = 30;
const MIN_DAYS = 10;
const MAX_DAYS = 200;

export function evaluateParams(rawData, start, end) {
   let sourceData = rawData;
   if (start !== undefined) {
      if (end !== undefined) {
         sourceData = rawData.filter((data) => data.date >= start && data.date <= end);
      } else {
         end = rawData[rawData.length - 1].date;
         sourceData = rawData.filter((data) => data.date >= start);
      }
   }

   // const sourceData = rawData.slice();
   // const sourceData = rawData;

   const labels = getLabels(sourceData);
   const data = sourceData.map((dayData) => {
      const price = dayData.value;
      return price;
   });

   const result = [];
   const top10 = [];

   const daysParams = [];
   for (let days = MIN_DAYS; days <= MAX_DAYS; days++) {
      daysParams.push(days);
   }

   const toleranceParams = [];
   for (let tolerance = MIN_TOLERANCE; tolerance <= MAX_TOLERANCE; tolerance++) {
      toleranceParams.push(tolerance);
   }

   daysParams.forEach((daysParam) => {
      const tolerancesRes = [];
      toleranceParams.forEach((toleranceParam) => {
         const {
            xDayLine: lineX,
            plusLimit: lineXPlus,
            minusLimit: lineXMinus,
         } = getXDayLineData(daysParam, data, toleranceParam);
         const { savings, date, transactions } = calcProfit(daysParam, labels, data, lineXMinus, lineXPlus);
         tolerancesRes.push(savings);
         top10.push({ savings, days: daysParam, tolerance: toleranceParam, transactions });
      });
      result.push(tolerancesRes);
   });
   // console.log('top10 :>> ', top10);
   const timeRangeInDays = start !== undefined && end !== undefined ? (end - start) / 3600 / 24 : rawData.length;
   const maxTransactionsPerDay = 12 / 365; // 12 transaction/year
   const maxTransactions = timeRangeInDays * maxTransactionsPerDay;
   let filteredTop10 = top10.filter((entry) => entry.transactions < maxTransactions);
   // console.log('filteredTop10 :>> ', filteredTop10);
   filteredTop10.sort((a, b) => b.savings - a.savings);
   filteredTop10 = filteredTop10.slice(0, 25);
   // console.log('top25 :>> ', filteredTop10);

   return { chart3dData: result, topX: filteredTop10, data, labels };
   // console.log('result :>> ', result);
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
