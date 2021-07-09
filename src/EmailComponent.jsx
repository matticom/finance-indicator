import React from 'react';
import emailjs from 'emailjs-com';

const REACT_APP_USER_ID = 'user_3VsHI3XxKLngGGGFZ7aCZ';
const REACT_APP_TEMPLATE_ID = 'template_bnnbn18';
const REACT_APP_SERVICE_ID = 'service_sguo0mm';

function EmailComponent() {
   const handleClick = (e) => {
      e.preventDefault();
      emailjs.send(REACT_APP_SERVICE_ID, REACT_APP_TEMPLATE_ID, {}, REACT_APP_USER_ID).then(
         (result) => {
            alert('Message Sent, We will get back to you shortly', result.text);
         },
         (error) => {
            alert('An error occurred, Please try again', error.text);
         },
      );
   };

   return (
      <button onClick={handleClick} className='btn btn-primary'>
         Send
      </button>
   );
}

export default EmailComponent;
