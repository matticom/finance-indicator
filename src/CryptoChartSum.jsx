import React, { useEffect, useMemo, useRef, useState } from 'react';

const rawData = require('./data/historyLink.json');
// const rawData = require('./data/historyBTC.json');
// const rawData = require('./data/LongHistoryBTC.json');
// const calc3dData = require('./data/calcChart3d.json');
// const calc3dData = require('./data/calc3.json');
import Plot from 'react-plotly.js';
import percentile from 'percentile';
import { evaluateParams, MAX_TRANSACTIONS_PER_YEAR } from './CryptoParamEvaluationService';
import _ from 'lodash';

const maxTransactionsPerDay = MAX_TRANSACTIONS_PER_YEAR / 365; // 12 transaction/year
const maxDesiredTAsCount = maxTransactionsPerDay * rawData.length;

console.log('maxDesiredTAsCount :>> ', maxDesiredTAsCount);

function TestChart() {
   const [chart3d, setChart3d] = useState([[]]);
   const [chart3dTA, setChart3dTA] = useState([[]]);
   const [chart3dRatio, setChart3dRatio] = useState([[]]);
   const [calFinished, setCalFinishState] = useState(false);
   const [p50, setP50] = useState(0);
   const [p75, setP75] = useState(0);

   const calc3dData = useMemo(() => {
      console.log('Start calculation :>> ');
      const { chart3dData, chart3dDataTA } = evaluateParams(rawData);
      // console.log('chart3dData :>> ', chart3dData);
      setChart3d(chart3dData);
      const flatArray = _.flattenDeep(chart3dData);
      const percentiles = percentile([50, 75], flatArray);
      setP50(Math.round(percentiles[0]));
      setP75(Math.round(percentiles[1]));
      setChart3dTA(chart3dDataTA);
      setChart3dRatio(createRatioData(chart3dData, chart3dDataTA, percentiles));
      setCalFinishState(true);
      console.log('Finished calculation :>> ');
   }, []);

   return (
      <>
         <div>{'Parameter simulation (1k -> end balance)'}</div>
         {calFinished && (
            <>
               <Plot
                  data={[{ z: chart3d, type: 'surface' }]}
                  layout={{
                     width: 1300,
                     height: 800,
                     title: 'Balance after Trades',
                     scene: {
                        xaxis: { title: 'Tolerance [%]' },
                        yaxis: { title: 'used DAY X LINE' },
                        zaxis: { title: 'End balance (started with 1k)' },
                     },
                  }}
               />
               <Plot
                  data={[{ z: chart3dTA, type: 'surface' }]}
                  layout={{
                     width: 1300,
                     height: 800,
                     title: 'Use transactions for trades',
                     scene: {
                        xaxis: { title: 'Tolerance [%]' },
                        yaxis: { title: 'used DAY X LINE' },
                        zaxis: { title: 'Transactions' },
                     },
                  }}
               />
               <Plot
                  data={[{ z: chart3dRatio, type: 'surface' }]}
                  layout={{
                     width: 1300,
                     height: 800,
                     title: `Ratio (TA penal: ${Math.round(
                        maxDesiredTAsCount,
                     )}, income p50: ${p50}, income p75: ${p75})`,
                     scene: {
                        xaxis: { title: 'Tolerance [%]' },
                        yaxis: { title: 'used DAY X LINE' },
                        zaxis: { title: 'Ratio balance transactions' },
                     },
                  }}
               />
            </>
         )}
      </>
   );
}

function calculate_Income_TACount_Ratio(income, TAs, percentiles) {
   const [p50, p75] = percentiles;
   const firstLevelFine = TAs > maxDesiredTAsCount ? Math.round(TAs - maxDesiredTAsCount) : 0;
   const secondLevelFine = TAs > 2 * maxDesiredTAsCount ? Math.round(TAs - 2 * maxDesiredTAsCount) * 2 : 0;
   const firstLevelReinforcement = income > p50 ? Math.round(income - p50) : 0;
   const secondLevelReinforcement = income > p75 * maxDesiredTAsCount ? Math.round(income - p75) * 3 : 0;
   return (income + firstLevelReinforcement + secondLevelReinforcement) / (TAs + firstLevelFine + secondLevelFine);
}

function createRatioData(incomeData, TAData, percentiles) {
   const ratio = [];
   for (let dayIdx = 0; dayIdx < incomeData.length; dayIdx++) {
      const incomeTolArray = incomeData[dayIdx];
      const taTolArray = TAData[dayIdx];
      const ratioTolArray = [];
      for (let toleranceIdx = 0; toleranceIdx < incomeTolArray.length; toleranceIdx++) {
         const incomeValue = incomeTolArray[toleranceIdx];
         const taValue = taTolArray[toleranceIdx];
         ratioTolArray.push(calculate_Income_TACount_Ratio(incomeValue, taValue, percentiles));
      }
      ratio.push(ratioTolArray);
   }
   return ratio;
}

export default TestChart;
