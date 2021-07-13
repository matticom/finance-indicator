onmessage = function (event) {
   const { type, data, start } = event.data;
   if (type === 'start') {
      const res = calcSuperPosition(start, data);
      postMessage(res);
   }
};

const MIN_TOLERANCE = 3;
const MAX_TOLERANCE = 20;
const MIN_DAYS = 10;
const MAX_DAYS = 150;

const INITIAL_MONEY = 1000;

function calcSuperPosition(start, rawData) {
   let counter = 0;
   let chart3d = null;

   // console.log('rawData.length - 200 :>> ', rawData.length - 200);

   for (let index = start; index < rawData.length; index++) {
      console.time('cycle');
      const lineData = rawData.slice(0, index);

      // const globalStart = 1590098400; // moment('2020-05-22').unix();
      // const globalEnd = 1597010400; // moment('2020-08-10').unix();
      // const lineData = rawData.filter((data) => data.date >= globalStart && data.date <= globalEnd);

      // console.log('lineData :>> ', JSON.stringify(lineData));
      const { chart3dData, topX } = evaluateParams([...lineData]);
      // console.log('chart3dData :>> ', JSON.stringify(chart3dData));

      if (topX.length === 0 || (topX.length > 0 && topX[0].savings <= INITIAL_MONEY)) {
         counter++;
         console.log(`counter ${counter}/${rawData.length - start} (skipped: ${topX[0].savings})`);
         console.timeEnd('cycle');
         continue;
      }

      counter++;
      console.log(`counter ${counter}/${rawData.length - start} `);
      if (chart3d === null) {
         // console.log('chart3d === null :>> ');
         chart3d = chart3dData;
      } else {
         // console.log('calcccccc :>> ');
         const newChart3d = [];
         for (let daysIdx = 0; daysIdx < chart3d.length; daysIdx++) {
            const dayRowSum = chart3d[daysIdx];
            const dayRowCalc = chart3dData[daysIdx];
            const newDayRow = [];
            for (let toleranceIdx = 0; toleranceIdx < dayRowSum.length; toleranceIdx++) {
               const savingSum = dayRowSum[toleranceIdx];
               const savingCalc = dayRowCalc[toleranceIdx];
               newDayRow.push(savingSum + savingCalc);
            }
            newChart3d.push(newDayRow);
         }
         chart3d = newChart3d;
      }
      console.timeEnd('cycle');
   }
   return { chart3d, counter };
}

function evaluateParams(rawData, start, end) {
   let sourceData = rawData;
   if (start !== undefined) {
      if (end !== undefined) {
         sourceData = rawData.filter((data) => data.date >= start && data.date <= end);
      } else {
         end = rawData[rawData.length - 1].date;
         sourceData = rawData.filter((data) => data.date >= start);
      }
   }
   // console.log('sourceData :>> ', JSON.stringify(sourceData));
   // const sourceData = rawData.slice(Math.round((rawData.length / 3) * 2));
   // const sourceData = rawData;

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
         const { savings, transactions } = calcProfit(daysParam, data, lineXMinus, lineXPlus);
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

   return { chart3dData: result, topX: filteredTop10, data };
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

function calcProfit(days, lineData, lineDataMinus, lineDataPlus) {
   let pieces = 0;
   let currentMoney = INITIAL_MONEY;
   let transactionCount = 0;

   let lastSoldDiff = 0;
   let lastBuyDiff = 0;
   let counter = 0;
   let lastAction = 'sold';

   let lastSold = { savings: INITIAL_MONEY };

   for (let index = days; index < lineData.length; index++) {
      const price = lineData[index];
      const priceMinus5 = lineDataMinus[index];
      const pricePlus5 = lineDataPlus[index];
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
         lastSold = { savings: currentMoney, transactions: transactionCount };
      }
      counter++;
   }
   return lastSold;
}
