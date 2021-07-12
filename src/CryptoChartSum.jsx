import React, { useRef, useState } from 'react';

// const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
const rawData = require('./data/LongHistoryBTC.json');
const calc3dData = require('./data/chart3dCalcRes_BTC_long.json');
import Plot from 'react-plotly.js';

const start = 0;

function TestChart() {
   const [done, setDone] = useState(false);
   const [counter, setCounter] = useState(false);
   const [chart3d, setChart3d] = useState(false);

   const workerRef = useRef(null);

   const runWorker = (rawData, start) => {
      const worker = new window.Worker('./worker.js');

      worker.postMessage({
         type: 'start',
         data: rawData,
         start,
      });
      //
      worker.onerror = (err) => err;
      worker.onmessage = (event) => {
         const { chart3d: newChart3d, counter: newCounter } = event.data;
         console.log('chart3d :>> ', JSON.stringify(newChart3d));
         setChart3d(newChart3d);
         setCounter(newCounter);
         setDone(true);
         worker.terminate();
      };
      workerRef.current = worker;
   };

   const stopWorker = () => {
      workerRef.current.terminate();
   };

   return (
      // <>
      //    {done ? (
      //       <>
      //          <div style={{ fontSize: '26px', margin: '20px 0px' }}>{`Counter ${counter}/${
      //             rawData.length - start - 200
      //          }`}</div>
      //          <div style={{ width: '50%' }}>
      //             <Plot data={[{ z: chart3d, type: 'surface' }]} />
      //          </div>
      //       </>
      //    ) : (
      //       <>
      //          <button onClick={() => runWorker(rawData, start)}>Start</button>
      //          <button
      //             onClick={() => {
      //                stopWorker();
      //             }}
      //          >
      //             Stop
      //          </button>
      //       </>
      //    )}
      // </>

      <>
         <div>bla</div>
         <Plot data={[{ z: calc3dData, type: 'surface' }]} />
      </>
   );
}

export default TestChart;
