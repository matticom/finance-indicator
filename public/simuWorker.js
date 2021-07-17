onmessage = function (event) {
   const { data: sourceData, start, end, global } = event.data;

   const startOfCalc = 30;
   const rawData = sourceData.filter((data) => data.date >= start && data.date <= end);

   // const data = rawData.map((dayData) => dayData.value);
   // const labels = rawData.map((dayData) => moment.unix(dayData.date).format('D. MMM YYYY'));
   const chartData = { labels: global.plotLabels, datasets: [getNewDataSet(global.plotData, 'Currency')] };

   const startDate = rawData[startOfCalc].date;

   let lastSavings = INITIAL_MONEY;
   let lastPieces = 0;
   let lastAction = '';
   let lastActionDate = startDate;
   const transactionList = [];
   const annotations = [];

   let counter = 0;
   for (let index = startOfCalc; index < rawData.length; index++) {
      const endOfCalc = rawData[index].date;
      const dataToBeCalc = rawData.filter((data) => data.date <= endOfCalc);
      const { topX } = evaluateParams([...dataToBeCalc]);
      const startLabel = dataToBeCalc[0].date;
      const currentLabel = endOfCalc;
      // console.log('\n\n>>>> new cycle :>> ', counter);
      // console.log('start Of cycle :>> ', startLabel);
      // console.log('end Of cycle :>> ', currentLabel);

      const result = topX.length === 0 ? 'nada' : topX[0];
      // console.log('result :>> ', result);

      postMessage({
         type: 'cycle update basic',
         data: {
            counter,
            currentLoop: index - startOfCalc,
            maxLoops: rawData.length - startOfCalc,
            startLabel,
            currentLabel,
            result,
         },
      });

      if (
         topX.length === 0 ||
         (topX.length > 0 && topX[0].savings <= INITIAL_MONEY && topX[0].currentState.lastAction !== 'buy')
      ) {
         continue;
      }

      const { savings, days, tolerance, transactions, currentState } = topX[0];
      const calcLastActionDate = currentState.lastActionDate;
      const calcLastAction = currentState.lastAction;
      const currentPrice = currentState.price;
      const calcLabel = currentState.lastActionDate;
      // console.log('current Price :>> ', currentPrice);

      if (calcLastActionDate <= startDate || calcLastActionDate <= lastActionDate) {
         continue;
      }

      if (lastAction === 'sold' || lastAction === '') {
         if (calcLastAction === 'buy') {
            lastPieces = lastSavings / currentPrice;
            lastSavings = 0;
            annotations.push({ currentLabel, action: 'Buy', color: '#6610f2', counter });
         } else {
            continue;
         }
      }

      if (lastAction === 'buy') {
         if (calcLastAction === 'sold') {
            lastSavings = currentPrice * lastPieces;
            lastPieces = 0;
            annotations.push({ currentLabel, action: 'Sold', color: '#4dbd74', counter });
         } else {
            continue;
         }
      }

      lastAction = calcLastAction;
      lastActionDate = calcLastActionDate;
      // console.log('calcLastActionDate :>> ', calcLastActionDate);
      transactionList.push({
         action: lastAction,
         savings: lastSavings,
         maxSavings: savings,
         days,
         tolerance,
         transactions,
         price: currentPrice,
         pieces: lastPieces,
         date: endOfCalc,
         calcDate: calcLastActionDate,
         counter,
      });
      counter++;
      // console.log('lastSavings :>> ', lastSavings);
      // console.log('lastPieces :>> ', lastPieces);
      // console.log('lastAction :>> ', lastAction);
      // console.log('lastActionDate :>> ', lastActionDate);

      postMessage({
         type: 'cycle update action',
         data: {
            currentPrice,
            calcLastActionDate,
            lastSavings,
            lastPieces,
            lastAction,
            lastActionDate,
         },
      });
   }

   postMessage({
      type: 'completed',
      data: {
         annotations,
         transactionList,
         chartData,
      },
   });
};

const MIN_TOLERANCE = 3;
const MAX_TOLERANCE = 20;
const MIN_DAYS = 10;
const MAX_DAYS = 150;
const MAX_TRANSACTIONS_PER_YEAR = 12;
const INITIAL_MONEY = 1000;

function evaluateParams(rawData, start, end) {
   let sourceData = rawData;

   // Transaction max value
   const timeRangeInDays = start !== undefined && end !== undefined ? (end - start) / 3600 / 24 : rawData.length;
   const maxTransactionsPerDay = MAX_TRANSACTIONS_PER_YEAR / 365; // 12 transaction/year
   const maxTransactions = timeRangeInDays * maxTransactionsPerDay;

   const unixLabels = rawData.map((dayData) => dayData.date);
   const data = sourceData.map((dayData) => dayData.value);

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
         const { lastSold, currentState } = calcProfit(daysParam, unixLabels, data, lineXMinus, lineXPlus);
         const { savings, date, transactions } = lastSold;

         // transaction filter application
         tolerancesRes.push(transactions > maxTransactions ? INITIAL_MONEY : savings);
         top10.push({ savings, days: daysParam, tolerance: toleranceParam, transactions, currentState });
      });
      result.push(tolerancesRes);
   });
   // console.log('top10 :>> ', top10);

   let filteredTop10 = top10.filter((entry) => entry.transactions < maxTransactions);
   // console.log('filteredTop10 :>> ', filteredTop10);
   filteredTop10.sort((a, b) => b.savings - a.savings);
   filteredTop10 = filteredTop10.slice(0, 25);
   // console.log('top25 :>> ', filteredTop10);

   return { chart3dData: result, topX: filteredTop10, data, unixLabels };
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

function calcProfit(days, unixLabels, lineData, lineDataMinus, lineDataPlus) {
   let pieces = 0;
   let currentMoney = INITIAL_MONEY;
   let transactionCount = 0;

   let lastSoldDiff = 0;
   let lastBuyDiff = 0;
   let counter = 0;
   let lastAction = 'sold';

   let lastSold = { savings: INITIAL_MONEY, date: unixLabels[0] };
   let currentState = { lastAction: '', lastActionDate: '', price: 0 };

   for (let index = days; index < lineData.length; index++) {
      const price = lineData[index];
      const unixLabel = unixLabels[index];
      const priceMinusTolerance = lineDataMinus[index];
      const pricePlusTolerance = lineDataPlus[index];
      const currentSoldDiff = price - priceMinusTolerance;
      const currentBuyDiff = price - pricePlusTolerance;

      if (lastAction === 'sold' && lastBuyDiff <= 0 && currentBuyDiff > 0) {
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'buy';

         pieces = currentMoney / price;
         currentMoney = 0;
         transactionCount++;
         currentState = { ...currentState, lastAction, lastActionDate: unixLabel };
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
         currentState = { ...currentState, lastAction, lastActionDate: unixLabel };
      }
      currentState = { ...currentState, price };
      counter++;
   }
   return { lastSold, currentState };
}

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
