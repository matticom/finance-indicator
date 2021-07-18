import React, { useEffect, useMemo, useRef, useState } from 'react';
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
      formatter: (value) => moment.unix(value).format('D. MMM YYYY'),
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
      text: 'Date (step)',
      dataField: 'calcDate',
      formatter: (value) => moment.unix(value).format('D. MMM YYYY'),
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
      id: `hline-${counter + Math.round(Math.random() * 1000)}`,
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

const overviewData = rawData.map((dayData) => dayData.value);
const overviewLabels = rawData.map((dayData) => moment.unix(dayData.date).format('D. MMM YYYY'));
const overviewChartData = {
   labels: overviewLabels,
   datasets: [getNewDataSet(overviewData, 'Currency')],
};

const INITIAL_MONEY = 1000;

// const start = 1500;

function TestChart() {
   const lineRef = useRef(null);

   const [done, setDone] = useState(true);
   const [optimumParams, setOptimumParams] = useState(false);
   const [simuCalcWindow, setSimuCalcWindow] = useState(false);

   const [overviewTolerance, setOverviewTolerance] = useState(4);
   const [overviewDays, setOverviewDays] = useState(16);
   const [simuCalcWindowValue, setSimuCalcWindowValue] = useState(30);

   const workerRef = useRef(null);

   const [inputStart, setInputStart] = useState('2020-05-22');
   const [inputEnd, setInputEnd] = useState('2021-07-03');

   const [chosenStart, setChosenStart] = useState('2020-05-22');
   const [chosenEnd, setChosenEnd] = useState('2021-07-03');

   const [percentageDone, setPercentageDone] = useState(0);

   const [globalData, setGlobalData] = useState();

   // const globalStart = moment('2016-09-05').unix();
   // const globalStart = moment(chosenStart).unix();
   // const globalEnd = moment(chosenEnd).unix();

   // const globalStart = moment('2013-10-01').unix();
   // const globalEnd = moment('2014-01-08').unix();

   const [annotations, setAnnotations] = useState([]);
   const [transactionList, setTransactionList] = useState([]);
   const [chartData, setChartData] = useState();

   // const simuStart = moment('2016-09-05').unix();
   // const simuStart = moment(chosenStart).unix();
   // const simuEnd = moment('2021-01-17').unix();
   // const simuEnd = moment(chosenEnd).unix();
   // const simuData = getResult(rawData, simuStart, simuEnd, globalData);

   const runWorker = (rawData, start, end, global) => {
      const worker = new window.Worker('./simuWorker.js');
      setDone(false);
      setChosenStart(moment.unix(start));
      setChosenEnd(moment.unix(end));

      worker.postMessage({
         data: rawData,
         start,
         end,
         global,
         simuCalcWindow: simuCalcWindow ? simuCalcWindowValue - 1 : undefined,
      });
      //
      worker.onerror = (err) => err;
      worker.onmessage = (e) => {
         const event = e.data;
         if (event.type === 'cycle update basic') {
            const { counter, currentLoop, maxLoops, startLabel, currentLabel, result } = event.data;
            setPercentageDone((100 * currentLoop) / maxLoops);
            console.log('\n\n>>>> new cycle :>> ', counter);
            console.log('start Of cycle :>> ', moment.unix(startLabel).format('D. MMM YYYY'));
            console.log('end Of cycle :>> ', moment.unix(currentLabel).format('D. MMM YYYY'));
            console.log('result :>> ', result);
         }
         if (event.type === 'cycle update action') {
            const { currentPrice, calcLastActionDate, lastSavings, lastPieces, lastAction, lastActionDate } =
               event.data;
            console.log('current Price :>> ', currentPrice);
            console.log('lastSavings :>> ', lastSavings);
            // console.log('calcLastActionDate :>> ', calcLastActionDate);
            console.log('lastPieces :>> ', lastPieces);
            console.log('lastAction :>> ', lastAction);
            console.log('lastActionDate :>> ', moment.unix(lastActionDate).format('D. MMM YYYY'));
         }
         if (event.type === 'completed') {
            const { annotations, transactionList, chartData } = event.data;
            console.log('transactionList :>> ', transactionList);
            setChartData(chartData);
            setTransactionList(transactionList);
            setAnnotations(
               annotations.map((anno) => {
                  const { currentLabel, action, color, counter } = anno;
                  return getAnnotation(moment.unix(currentLabel).format('D. MMM YYYY'), action, color, counter);
               }),
            );
            setGlobalData(global);
            setDone(true);

            worker.terminate();
         }
         workerRef.current = worker;
      };
   };

   const stopWorker = () => {
      setDone(true);
      workerRef.current.terminate();
   };

   const transactionCount = transactionList.length;

   return (
      <>
         <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ fontSize: '26px', margin: '20px 0px' }}>Set simulation dates</div>
            <div style={{ position: 'relative', height: '300px', width: '100%' }}>
               <Line data={overviewChartData} options={getOptions()} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', margin: '20px 0px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-around', width: '75%' }}>
                  <div style={{ fontSize: '14px' }}>
                     {'Start: '}
                     <input value={inputStart} onChange={(e) => setInputStart(e.target.value)}></input>
                  </div>
                  <div style={{ fontSize: '14px' }}>
                     {'End: '}
                     <input value={inputEnd} onChange={(e) => setInputEnd(e.target.value)}></input>
                  </div>
                  <button
                     onClick={() => {
                        const start = moment(inputStart).unix();
                        const end = moment(inputEnd).unix();
                        const globalData = getResult(rawData, start, end);
                        runWorker(rawData, start, end, globalData);
                     }}
                     disabled={!done}
                     style={{ color: 'rgb(240,240,240)', backgroundColor: 'rgb(35,35,35)', padding: '3px 10px' }}
                  >
                     {'Go'}
                  </button>
                  <button
                     onClick={() => stopWorker()}
                     disabled={done}
                     style={{ color: 'rgb(240,240,240)', backgroundColor: 'rgb(35,35,35)', padding: '3px 10px' }}
                  >
                     {'Stop'}
                  </button>
               </div>
            </div>
            {!done && (
               <div style={{ textAlign: 'center', fontSize: '20px' }}>{`Processed ${numeral(percentageDone).format(
                  '0.0a',
               )}%`}</div>
            )}
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', margin: '20px 0px' }}>
            <div style={{ fontSize: '16px' }}>
               <input
                  type='checkbox'
                  id={'optimumParams'}
                  onChange={(e) => {
                     setOptimumParams(e.target.checked);
                     if (!e.target.checked) {
                        const start = moment(inputStart).unix();
                        const end = moment(inputEnd).unix();
                        const globalData = getResult(rawData, start, end);
                        setGlobalData(globalData);
                     }
                  }}
               />
               <label htmlFor='optimumParams'>Set optimum params</label>
            </div>
            <div style={{ fontSize: '16px' }}>
               <input type='checkbox' id={'optimumParams'} onChange={(e) => setSimuCalcWindow(e.target.checked)} />
               <label htmlFor='optimumParams'>Set window</label>
            </div>
         </div>
         {optimumParams && (
            <>
               <div
                  style={{
                     display: 'flex',
                     justifyContent: 'space-around',
                     alignItems: 'center',
                     width: '100%',
                     margin: '20px 0px',
                  }}
               >
                  <div style={{ fontSize: '16px' }}>Set optimum params:</div>
                  <div style={{ fontSize: '16px' }}>
                     <div style={{ marginBottom: '3px' }}>Tolerance: </div>
                     <input
                        type='text'
                        value={overviewTolerance}
                        onChange={(e) => setOverviewTolerance(e.target.value)}
                     />
                  </div>
                  <div style={{ fontSize: '16px' }}>
                     <div style={{ marginBottom: '3px' }}>X days: </div>
                     <input type='text' value={overviewDays} onChange={(e) => setOverviewDays(e.target.value)} />
                  </div>
                  <button
                     onClick={() => {
                        const start = moment(inputStart).unix();
                        const end = moment(inputEnd).unix();
                        const globalData = getResult(rawData, start, end, {
                           tolerance: overviewTolerance,
                           days: overviewDays,
                        });
                        setGlobalData(globalData);
                        setChosenStart(moment.unix(start));
                        setChosenEnd(moment.unix(end));
                     }}
                     disabled={!done}
                     style={{ color: 'rgb(240,240,240)', backgroundColor: 'rgb(35,35,35)', padding: '3px 10px' }}
                  >
                     {'Go'}
                  </button>
               </div>
            </>
         )}
         {simuCalcWindow && (
            <>
               <div
                  style={{
                     display: 'flex',
                     justifyContent: 'space-around',
                     alignItems: 'center',
                     width: '100%',
                     margin: '20px 0px',
                  }}
               >
                  <div style={{ fontSize: '16px' }}>Set look backward window for simulation calculation:</div>
                  <input
                     type='text'
                     value={simuCalcWindowValue}
                     onChange={(e) => setSimuCalcWindowValue(e.target.value)}
                  />
               </div>
            </>
         )}
         {globalData && (
            <>
               <div
                  style={{ fontSize: '26px', margin: '20px 0px' }}
               >{`Optimum data simulation (entire plot data ${chosenStart.format('DD.MM.YYYY')} - ${chosenEnd.format(
                  'DD.MM.YYYY',
               )}):`}</div>
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
            </>
         )}
         {chartData && (
            <>
               <div style={{ fontSize: '26px', margin: '20px 0px' }}>{`Simulated data (${chosenStart.format(
                  'DD.MM.YYYY',
               )} - ${chosenEnd.format('DD.MM.YYYY')}):`}</div>
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
                        <div>{`Balance: ${numeral(
                           transactionList[transactionCount - 1].savings === 0
                              ? transactionList[transactionCount - 2].savings
                              : transactionList[transactionCount - 1].savings,
                        ).format('0,0.000a')}`}</div>
                        <div>{`Transactions: ${transactionCount}`}</div>
                        {/* <div>{`Days line: ${simuData.topX[0].days}`}</div>
                  <div>{`Tolerance: ${simuData.topX[0].tolerance}`}</div> */}
                     </>
                  )}
               </div>
               <div style={{ position: 'relative', height: '600px', width: '100%' }}>
                  <Line ref={lineRef} data={chartData} options={getOptionsWithAnnotations(getOptions(), annotations)} />
               </div>
               <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ fontSize: '26px', margin: '20px 0px' }}>Simulation</div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'center', margin: '20px 0px' }}>
                     <BootstrapTable
                        keyField='hiddenKey'
                        data={addHiddenKeyColumn(transactionList)}
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
         )}
      </>
   );
}

function getResult(rawData, start, end, withOptimumParams) {
   if (withOptimumParams) {
      const { tolerance, days } = withOptimumParams;
      let sourceData = rawData;
      if (start !== undefined) {
         if (end !== undefined) {
            sourceData = rawData.filter((data) => data.date >= start && data.date <= end);
         } else {
            end = rawData[rawData.length - 1].date;
            sourceData = rawData.filter((data) => data.date >= start);
         }
      }
      const data = sourceData.map((dayData) => dayData.value);
      const labels = sourceData.map((dayData) => moment.unix(dayData.date).format('D. MMM YYYY'));
      const { xDayLine: lineX, plusLimit: lineXPlus, minusLimit: lineXMinus } = getXDayLineData(days, data, tolerance);
      const { annotations, lastSold } = setBuySellSignals(days, labels, data, lineXMinus, lineXPlus);
      const { savings, transactions } = lastSold;
      const chartData = {
         labels,
         datasets: [
            getNewDataSet(data, 'Currency'),
            getNewDataSet(lineXMinus, `- ${tolerance}%`, '#6610f2'),
            getNewDataSet(lineXPlus, `+ ${tolerance}%`, '#f86c6b'),
            getNewDataSet(lineX, `${days} days`, '#20c997'),
         ],
      };

      return { chartData, annotations, topX: [{ savings, transactions, tolerance, days }] };
   }

   const { chart3dData, topX, data, labels } = evaluateParams([...rawData], start, end);

   if (topX.length === 0 || (topX.length > 0 && topX[0].savings <= INITIAL_MONEY)) {
      return {
         chartData: {
            labels,
            datasets: [getNewDataSet(data, 'Currency')],
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

   const { annotations, lastSold } = setBuySellSignals(days, labels, data, lineXMinus, lineXPlus);
   // console.log('annotations :>> ', annotations);
   // console.log('line200 :>> ', line200);

   const chartData = {
      labels,
      datasets: [
         getNewDataSet(data, 'Currency'),
         getNewDataSet(lineXMinus, `- ${tolerance}%`, '#6610f2'),
         getNewDataSet(lineXPlus, `+ ${tolerance}%`, '#f86c6b'),
         getNewDataSet(lineX, `${days} days`, '#20c997'),
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
