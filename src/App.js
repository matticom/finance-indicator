import React from 'react';

import './App.css';
// import DekaEtfChart from './DekaEtfChart';
// import CryptoChart from './CryptoChartSum';
import CryptoChart from './Simulation';

function App() {
   return (
      <div className='App'>
         <header className='App-header'>
            <CryptoChart />
         </header>
      </div>
   );
}

export default App;
