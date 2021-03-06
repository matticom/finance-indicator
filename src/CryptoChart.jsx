import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import moment from 'moment';

// const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
const rawData = require('./data/LongHistoryBTC.json');
import Plot from 'react-plotly.js';

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
      text: 'Balance',
      dataField: 'savings',
      formatter: (value) => numeral(value).format('0,0.000a'),
   },
   {
      text: 'X days line',
      dataField: 'days',
   },
   {
      text: 'Tolerance',
      dataField: 'tolerance',
   },
   {
      text: 'Transactions',
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

   const [evaStartStr] = useState('2020-05-22');
   const [evaEndStr, setEvaEndStr] = useState('2021-04-15');

   // const evaStart = moment('2016-09-05').unix();
   const evaStart = moment(evaStartStr).unix();
   const evaEnd = moment(evaEndStr).unix();
   // const evaData = getResult(rawData, evaStart, evaEnd, globalData);

   const [evaOptions, setEvaOptions] = useState(getOptions(lineRef, setEvaEndStr));
   const [evaData, setEvaData] = useState(getResult(rawData, evaStart, evaEnd, globalData));

   useEffect(() => {
      setEvaOptions(getOptions(lineRef, setEvaEndStr));
      setEvaData(getResult(rawData, evaStart, evaEnd, globalData));
   }, [evaEndStr, evaStart, evaEnd]);

   return (
      <>
         <div style={{ fontSize: '26px', margin: '20px 0px' }}>{`Optimum data evaluation (entire plot data ${moment
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
         <div style={{ fontSize: '26px', margin: '20px 0px' }}>{`Evaluated data (${moment
            .unix(evaStart)
            .format('DD.MM.YYYY')} - ${moment.unix(evaEnd).format('DD.MM.YYYY')}):`}</div>
         <div
            style={{
               display: 'flex',
               justifyContent: 'space-around',
               width: '50%',
               margin: '20px 0px',
               fontSize: '16px',
            }}
         >
            {evaData.topX.length !== 0 && (
               <>
                  <div>{`Balance: ${numeral(evaData.topX[0].savings).format('0,0.000a')}`}</div>
                  <div>{`Transactions: ${evaData.topX[0].transactions}`}</div>
                  <div>{`Days line: ${evaData.topX[0].days}`}</div>
                  <div>{`Tolerance: ${evaData.topX[0].tolerance}`}</div>
               </>
            )}
         </div>
         <div style={{ position: 'relative', height: '600px', width: '100%' }}>
            <Line
               ref={lineRef}
               data={evaData.chartData}
               options={getOptionsWithAnnotations(evaOptions, evaData.annotations)}
            />
         </div>
         <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ fontSize: '26px', margin: '20px 0px' }}>Evaluation</div>
            <div style={{ display: 'flex' }}>
               <div style={{ width: '50%' }}>
                  {evaStart !== undefined && (
                     <div style={{ fontSize: '16px', margin: '20px 0px' }}>
                        <div>{`Evalution start: ${moment.unix(evaStart).format('DD.MM.YYYY')}`}</div>
                        <div>{`Evalution end: ${moment.unix(evaEnd).format('DD.MM.YYYY')}`}</div>
                     </div>
                  )}
                  <Plot data={[{ z: evaData.chart3dData, type: 'surface' }]} />
               </div>
               <div style={{ width: '50%', fontSize: '14px', display: 'flex', justifyContent: 'center' }}>
                  <BootstrapTable
                     keyField='hiddenKey'
                     data={addHiddenKeyColumn(evaData.topX)}
                     columns={columns}
                     bodyClasses='table-wrap-word'
                     classes='fixed-table'
                     bootstrap4
                     striped
                     hover
                  />
               </div>
            </div>
         </div>
      </>
   );
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
