import emailjs from 'emailjs-com';

const REACT_APP_USER_ID = 'user_3VsHI3XxKLngGGGFZ7aCZ';
const REACT_APP_TEMPLATE_ID = 'template_bnnbn18';
const REACT_APP_SERVICE_ID = 'service_sguo0mm';

export function sendMail() {
   emailjs.send(REACT_APP_SERVICE_ID, REACT_APP_TEMPLATE_ID, {}, REACT_APP_USER_ID).then(
      (result) => {
         console.log('Email sent successfully :>> ', result.text);
      },
      (error) => {
         console.log('Email failed :>> ', error);
      },
   );
}
