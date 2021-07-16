import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import moment from 'moment';

// const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
const rawData = require('./data/LongHistoryBTC.json');

import BootstrapTable from 'react-bootstrap-table-next';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';

import 'chartjs-plugin-annotation';

import numeral from 'numeral';
import { evaluateParams } from './CryptoParamEvaluationService';

function addHiddenKeyColumn(rows) {
   return rows.map((row, idx) => ({ ...row, hiddenKey: idx }));
}

const columns = [
   {
      text: 'hiddenKey',
      dataField: 'hiddenKey',
      hidden: 'true',
   },
   {
      text: 'Action',
      dataField: 'action',
   },
   {
      text: 'Date',
      dataField: 'date',
      formatter: (value) => {
         console.log('value :>> ', value);
         return moment.unix(value).format('D. MMM YYYY');
      },
   },
   {
      text: 'Balance',
      dataField: 'savings',
      formatter: (value) => numeral(value).format('0,0.000a'),
   },
   {
      text: 'Pieces',
      dataField: 'pieces',
      formatter: (value) => numeral(value).format('0,0.0000a'),
   },
   {
      text: 'Price',
      dataField: 'price',
      formatter: (value) => numeral(value).format('0,0.000a'),
   },
   {
      text: 'Max Balance (step)',
      dataField: 'maxSavings',
      formatter: (value) => numeral(value).format('0,0.000a'),
   },
   {
      text: 'X days line (step)',
      dataField: 'days',
   },
   {
      text: 'Tolerance (step)',
      dataField: 'tolerance',
   },
   {
      text: 'Transactions (step)',
      dataField: 'transactions',
   },
];

const getOptions = (ref, setEndDate) => {
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
   if (ref !== undefined) {
      options.onClick = (event, item) => {
         if (item.length === 0) {
            return;
         }
         const activePoint = ref.current.chartInstance.getElementAtEvent(event)[0];
         const data = activePoint._chart.data;
         const index = item[0]._index;
         const endDateStr = data.labels[index];
         const endMoment = moment(endDateStr, 'D. MMM YYYY');
         setEndDate(endMoment.format('YYYY-MM-DD'));
         console.log('>>>> EndMoment :>> ', endMoment.format('YYYY-MM-DD'));
      };
   }
   return options;
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
         yAdjust: 50,
      },
   };
}

function getOptionsWithAnnotations(options, annotations) {
   options.annotation = { annotations };
   return options;
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

const INITIAL_MONEY = 1000;

// const start = 1500;

function TestChart() {
   const lineRef = useRef(null);

   // const globalStart = moment('2016-09-05').unix();
   const globalStart = moment('2020-05-22').unix();
   const globalEnd = moment('2021-05-17').unix();

   // const globalStart = moment('2013-10-01').unix();
   // const globalEnd = moment('2014-01-08').unix();

   console.time('first');
   const globalData = getResult(rawData, globalStart, globalEnd);
   console.timeEnd('first');

   const [simuStartStr] = useState('2020-05-22');
   const [simuEndStr, setSimuEndStr] = useState('2021-01-17');

   // const simuStart = moment('2016-09-05').unix();
   const simuStart = moment(simuStartStr).unix();
   const simuEnd = moment(simuEndStr).unix();
   // const simuData = getResult(rawData, simuStart, simuEnd, globalData);

   const [simuOptions, setSimuOptions] = useState(getOptions(lineRef, setSimuEndStr));
   const [simuData, setSimuData] = useState(calcSimulation(rawData, simuStart, simuEnd, globalData));

   useEffect(() => {
      setSimuOptions(getOptions(lineRef, setSimuEndStr));
      setSimuData(calcSimulation(rawData, simuStart, simuEnd, globalData));
   }, [simuEndStr, simuStart, simuEnd]);

   const transactionCount = simuData.transactionList.length;

   return (
      <>
         <div style={{ fontSize: '26px', margin: '20px 0px' }}>{`Optimum data simulation (entire plot data ${moment
            .unix(globalStart)
            .format('DD.MM.YYYY')} - ${moment.unix(globalEnd).format('DD.MM.YYYY')}):`}</div>
         <div
            style={{
               display: 'flex',
               justifyContent: 'space-around',
               width: '50%',
               margin: '20px 0px',
               fontSize: '16px',
            }}
         >
            {globalData.topX.length !== 0 && (
               <>
                  <div>{`Balance: ${numeral(globalData.topX[0].savings).format('0,0.000a')}`}</div>
                  <div>{`Transactions: ${globalData.topX[0].transactions}`}</div>
                  <div>{`Days line: ${globalData.topX[0].days}`}</div>
                  <div>{`Tolerance: ${globalData.topX[0].tolerance}`}</div>
               </>
            )}
         </div>
         <div style={{ position: 'relative', height: '600px', width: '100%' }}>
            <Line
               data={globalData.chartData}
               options={getOptionsWithAnnotations(getOptions(), globalData.annotations)}
            />
         </div>
         <div style={{ fontSize: '26px', margin: '20px 0px' }}>{`Simulated data (${moment
            .unix(simuStart)
            .format('DD.MM.YYYY')} - ${moment.unix(simuEnd).format('DD.MM.YYYY')}):`}</div>
         <div
            style={{
               display: 'flex',
               justifyContent: 'space-around',
               width: '50%',
               margin: '20px 0px',
               fontSize: '16px',
            }}
         >
            {transactionCount !== 0 && (
               <>
                  <div>{`Balance: ${numeral(simuData.transactionList[transactionCount - 1].savings).format(
                     '0,0.000a',
                  )}`}</div>
                  <div>{`Transactions: ${transactionCount}`}</div>
                  {/* <div>{`Days line: ${simuData.topX[0].days}`}</div>
                  <div>{`Tolerance: ${simuData.topX[0].tolerance}`}</div> */}
               </>
            )}
         </div>
         <div style={{ position: 'relative', height: '600px', width: '100%' }}>
            <Line
               ref={lineRef}
               data={simuData.chartData}
               options={getOptionsWithAnnotations(simuOptions, simuData.annotations)}
            />
         </div>
         <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ fontSize: '26px', margin: '20px 0px' }}>Simulation</div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'center' }}>
               <BootstrapTable
                  keyField='hiddenKey'
                  data={addHiddenKeyColumn(simuData.transactionList)}
                  columns={columns}
                  bodyClasses='table-wrap-word'
                  classes='fixed-table'
                  bootstrap4
                  striped
                  hover
               />
            </div>
         </div>
      </>
   );
}

function calcSimulation(sourceData, start, end, global) {
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
      console.log('\n\n>>>> new cycle :>> ', counter);
      console.log('lastSavings :>> ', lastSavings);
      console.log('lastPieces :>> ', lastPieces);
      console.log('lastAction :>> ', lastAction);
      console.log('lastActionDate :>> ', lastActionDate);
      console.log('start Of cycle :>> ', moment.unix(dataToBeCalc[0].date).format('D. MMM YYYY'));
      console.log('end Of cycle :>> ', moment.unix(endOfCalc).format('D. MMM YYYY'));
      console.log('result :>> ', topX.length === 0 ? 'nada' : topX[0]);

      if (
         topX.length === 0 ||
         (topX.length > 0 && topX[0].savings <= INITIAL_MONEY && topX[0].currentState.lastAction !== 'buy')
      ) {
         continue;
      }

      const { savings, days, tolerance, transactions, currentState } = topX[0];
      const calcLastActionDate = moment(currentState.date, 'D. MMM YYYY').unix();
      const calcLastAction = currentState.lastAction;
      const calcLastPrice = currentState.price;
      const calcLabel = currentState.date;

      if (calcLastActionDate <= startDate || calcLastActionDate <= lastActionDate) {
         continue;
      }

      if (lastAction === 'sold' || lastAction === '') {
         if (calcLastAction === 'buy') {
            lastPieces = lastSavings / calcLastPrice;
            lastSavings = 0;
            annotations.push(getAnnotation(calcLabel, 'Buy', '#6610f2', counter));
         } else {
            continue;
         }
      }

      if (lastAction === 'buy') {
         if (calcLastAction === 'sold') {
            lastSavings = calcLastPrice * lastPieces;
            lastPieces = 0;
            annotations.push(getAnnotation(calcLabel, 'Sold', '#4dbd74', counter));
         } else {
            continue;
         }
      }

      lastAction = calcLastAction;
      lastActionDate = calcLastActionDate;
      console.log('calcLastActionDate :>> ', calcLastActionDate);
      transactionList.push({
         action: lastAction,
         savings: lastSavings,
         maxSavings: savings,
         days,
         tolerance,
         transactions,
         price: calcLastPrice,
         pieces: lastPieces,
         date: calcLastActionDate,
         counter,
      });
      counter++;
   }

   return { annotations, transactionList, chartData };
}

function getResult(rawData, start, end, global) {
   const { chart3dData, topX, data, labels } = evaluateParams([...rawData], start, end);

   if (topX.length === 0 || (topX.length > 0 && topX[0].savings <= INITIAL_MONEY)) {
      return {
         chartData: {
            labels: global ? global.plotLabels : labels,
            datasets: [getNewDataSet(global ? global.plotData : data, 'Currency')],
         },
         chart3dData,
         annotations: [],
         topX,
         plotData: data,
         plotLabels: labels,
      };
   }

   const { savings, days, tolerance, transactions } = topX[0];

   const { xDayLine: lineX, plusLimit: lineXPlus, minusLimit: lineXMinus } = getXDayLineData(days, data, tolerance);
   const globalLines = global ? getXDayLineData(days, global.plotData, tolerance) : null;
   const { annotations, lastSold } = setBuySellSignals(days, labels, data, lineXMinus, lineXPlus);
   // console.log('annotations :>> ', annotations);
   // console.log('line200 :>> ', line200);

   if (global) {
      console.log('labels[labels.length - 1] :>> ', labels[labels.length - 1]);
      annotations.push(getAnnotation(labels[labels.length - 1], 'End', '#ffc107', labels.length + 999));
   }
   const chartData = {
      labels: global ? global.plotLabels : labels,
      datasets: [
         getNewDataSet(global ? global.plotData : data, 'Currency'),
         getNewDataSet(global ? globalLines.minusLimit : lineXMinus, `- ${tolerance}%`, '#6610f2'),
         getNewDataSet(global ? globalLines.plusLimit : lineXPlus, `+ ${tolerance}%`, '#f86c6b'),
         getNewDataSet(global ? globalLines.xDayLine : lineX, `${days} days`, '#20c997'),
      ],
   };

   return { chartData, chart3dData, annotations, topX, plotData: data, plotLabels: labels };
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

function setBuySellSignals(days, labels, lineData, lineDataMinus5, lineDataPlus5) {
   const annotations = [];

   let pieces = 0;
   let currentMoney = INITIAL_MONEY;
   let transactionCount = 0;

   let lastSoldDiff = 0;
   let lastBuyDiff = 0;
   let counter = 0;
   let lastAction = 'sold';

   let lastSold = { savings: INITIAL_MONEY, date: labels[0] };
   // console.log('labels :>> ', labels);
   // console.log('lineData :>> ', lineData);

   for (let index = days; index < lineData.length; index++) {
      const price = lineData[index];
      const priceMinusTolerance = lineDataMinus5[index];
      const pricePlusTolerance = lineDataPlus5[index];
      const label = labels[index];
      const currentSoldDiff = price - priceMinusTolerance;
      const currentBuyDiff = price - pricePlusTolerance;

      if (lastAction === 'sold' && lastBuyDiff <= 0 && currentBuyDiff > 0) {
         annotations.push(getAnnotation(label, 'Buy', '#6610f2', counter));
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'buy';

         pieces = currentMoney / price;
         currentMoney = 0;
         // console.log(`BUY :>> ${label} (pieces: ${pieces} / price: ${price})`);
         transactionCount++;
      }
      // console.log('lastSoldDiff :>> ', lastSoldDiff);
      // console.log('currentSoldDiff :>> ', currentSoldDiff);

      if (lastAction === 'buy' && lastSoldDiff > 0 && currentSoldDiff <= 0) {
         annotations.push(getAnnotation(label, 'Sold', '#4dbd74', counter));
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
   return { annotations, lastSold };
}

export default TestChart;
