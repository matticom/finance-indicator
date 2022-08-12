import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import moment from 'moment';

// const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
// const rawData = require('./data/LongHistoryBTC.json');
const rawData = require('./data/historyGold.json');

import BootstrapTable from 'react-bootstrap-table-next';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';

import 'chartjs-plugin-annotation';

import numeral from 'numeral';
import { removeListener, sendMsg, setListener, setListenerOnConnect, setListenerOnDisconnect } from './WSocketService';
import { BEST_STATIC_PARAM, GIVEN_STATIC_PARAM, SIMULATION } from './constants';

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
      text: 'Rule',
      dataField: 'rule',
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

// const start = 1500;

function TestChart() {
   const lineRef = useRef(null);

   const [done, setDone] = useState(true);
   const [calculationActive, setCalculationActiveState] = useState(false);
   const [optimumParams, setOptimumParams] = useState(false);
   const [simuCalcWindow, setSimuCalcWindow] = useState(true);

   const [overviewTolerance, setOverviewTolerance] = useState(4);
   const [overviewDays, setOverviewDays] = useState(16);
   const [simuCalcWindowValue, setSimuCalcWindowValue] = useState(30);

   // BTC long
   // const [inputStart, setInputStart] = useState('2017-08-08');
   // const [inputEnd, setInputEnd] = useState('2018-02-09');

   const [inputStart, setInputStart] = useState('2020-03-10');
   const [inputEnd, setInputEnd] = useState('2021-06-28');

   const [chosenStart, setChosenStart] = useState(moment('2020-05-22'));
   const [chosenEnd, setChosenEnd] = useState(moment('2021-01-03'));

   const [percentageDone, setPercentageDone] = useState(0);

   const [globalData, setGlobalData] = useState();

   const [connected, setConnectState] = useState(true);

   useEffect(() => {
      setListener(SIMULATION, ({ type, data }) => {
         setCalculationActiveState(true);
         console.log('new Msg :>> ', { type, data });
         if (type === 'cycle update basic') {
            const { counter, currentLoop, maxLoops, startLabel, currentLabel, result } = data;
            setPercentageDone((100 * currentLoop) / maxLoops);
            console.log('\n\n>>>> new cycle :>> ', counter);
            console.log('start Of cycle :>> ', moment.unix(startLabel).format('D. MMM YYYY'));
            console.log('end Of cycle :>> ', moment.unix(currentLabel).format('D. MMM YYYY'));
            console.log('result :>> ', result);
            return;
         }
         if (type === 'cycle update action') {
            const { currentPrice, calcLastActionDate, lastSavings, lastPieces, lastAction, lastActionDate } = data;
            console.log('current Price :>> ', currentPrice);
            console.log('lastSavings :>> ', lastSavings);
            // console.log('calcLastActionDate :>> ', calcLastActionDate);
            console.log('lastPieces :>> ', lastPieces);
            console.log('lastAction :>> ', lastAction);
            console.log('lastActionDate :>> ', moment.unix(lastActionDate).format('D. MMM YYYY'));
            return;
         }
         if (type === 'completed') {
            const { annotations, transactionList, chartData } = data;
            console.log('annotations :>> ', annotations);
            console.log('transactionList :>> ', transactionList);
            setChartData(chartData);
            setTransactionList(transactionList);
            setAnnotations(annotations);
            setCalculationActiveState(false);
            setDone(true);
            return;
         }
         if (type === 'stop') {
            setCalculationActiveState(false);
            setDone(true);
            return;
         }
      });

      setListener(BEST_STATIC_PARAM, ({ response, start, end }) => {
         setGlobalData(response);
         setChosenStart(moment.unix(start));
         setChosenEnd(moment.unix(end));
      });

      setListener(GIVEN_STATIC_PARAM, ({ response, start, end }) => {
         setGlobalData(response);
         setChosenStart(moment.unix(start));
         setChosenEnd(moment.unix(end));
      });

      setListenerOnDisconnect(() => {
         setConnectState(false);
      });

      setListenerOnConnect(() => {
         if (!connected) {
            setConnectState(true);
         }
      });

      return () => {
         removeListener(SIMULATION);
         removeListener(BEST_STATIC_PARAM);
         removeListener(GIVEN_STATIC_PARAM);
      };
   }, []);

   // const globalStart = moment('2016-09-05').unix();
   // const globalStart = moment(chosenStart).unix();
   // const globalEnd = moment(chosenEnd).unix();

   // const globalStart = moment('2013-10-01').unix();
   // const globalEnd = moment('2014-01-08').unix();

   const [annotations, setAnnotations] = useState([]);
   const [transactionList, setTransactionList] = useState([]);
   const [chartData, setChartData] = useState();
   let percentData = {};
   let annotationsWithoutLabels = [];
   if (chartData) {
      const chartValues = chartData.datasets[0].data;
      const percentValues = [0];
      chartValues.forEach((data, idx, array) => {
         if (idx > 0) {
            percentValues.push((data * 100) / array[idx - 1] - 100);
         }
      });
      percentData = {
         datasets: [getNewDataSet(percentValues, 'Percentages')],
         labels: [...chartData.labels],
      };
      annotationsWithoutLabels = annotations.map((an) => {
         return { ...an, label: { ...an.label, content: '' } };
      });
   }

   // const simuStart = moment('2016-09-05').unix();
   // const simuStart = moment(chosenStart).unix();
   // const simuEnd = moment('2021-01-17').unix();
   // const simuEnd = moment(chosenEnd).unix();
   // const simuData = getResult(rawData, simuStart, simuEnd, globalData);

   const runWorker = (start, end) => {
      // const worker = new window.Worker('./simuWorker.js');
      setDone(false);
      setChosenStart(moment.unix(start));
      setChosenEnd(moment.unix(end));

      sendMsg(SIMULATION, {
         start,
         end,
         simuCalcWindow: simuCalcWindow ? simuCalcWindowValue - 1 : undefined,
      });
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
                        runWorker(start, end);
                        if (optimumParams) {
                           sendMsg(GIVEN_STATIC_PARAM, {
                              start,
                              end,
                              optimumParams: {
                                 tolerance: overviewTolerance,
                                 days: overviewDays,
                              },
                           });
                        } else {
                           sendMsg(BEST_STATIC_PARAM, {
                              start,
                              end,
                           });
                        }
                     }}
                     // disabled={!done || calculationActive || !(!done && calculationActive && !connected)}
                     style={{ color: 'rgb(240,240,240)', backgroundColor: 'rgb(35,35,35)', padding: '3px 10px' }}
                  >
                     {'Go'}
                  </button>
                  <button
                     onClick={() => sendMsg(SIMULATION, 'stop')}
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
                        sendMsg(BEST_STATIC_PARAM, {
                           start,
                           end,
                        });
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
                        sendMsg(GIVEN_STATIC_PARAM, {
                           start,
                           end,
                           optimumParams: {
                              tolerance: overviewTolerance,
                              days: overviewDays,
                           },
                        });

                        // worker.onerror = (err) => err;
                     }}
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
                           transactionCount > 1 && transactionList[transactionCount - 1].savings === 0
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
               <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                  <Bar data={percentData} options={getOptionsWithAnnotations(getOptions(), annotationsWithoutLabels)} />
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

export default TestChart;
