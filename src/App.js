import React from 'react';

import './App.css';
import DekaEtfChart from './DekaEtfChart';
import CryptoChart from './CryptoChart';
import CryptoParamEvaluation from './CryptoParamEvaluation';

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
