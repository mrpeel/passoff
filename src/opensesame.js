/** OpenSesame class encapsulating the functionality for generating a password.
    Requires cryptofunctions.js which determies whether to use subtle crypto
     or cryptojs and executes the appropriate functions.
*/

/* global Promise, zeroVar  */

/**
 *
 * OpenSesame uses BKDF2 to generate salted password and HMAC256 to generate a
* seed.  The seed is then ued to generate a password based on a chosen template.
 */
let OpenSesame = function() {
  'use strict';

  //  The namespace used in calculateKey
  this.keyNS = 'cake.man.opensesame';

  //  The namespaces used in calculateSeed
  this.passwordNS = 'cake.man.opensesame.password';
  this.loginNS = 'cake.man.opensesame.login';
  this.answerNS = 'cake.man.opensesame.answer';

  //  The values which will be populated for creating the password
  /* this.passPhrase = '';
  this.domainName = '';
  this.userName = '';
  this.securityQuestion = '';
  this.version = 0; */


  //  The templates that passwords may be created from
  //  The characters map to MPW.passchars
  this.passwordTypes = {
    'maximum-password': {
      'charSet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        '0123456789!@#$%^&*()',
      'length': 20,
    },
    'long-password': {
      'charSet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        '0123456789!@#$%^&*()',
      'length': 14,
    },
    'medium-password': {
      'charSet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        '0123456789!@#$%^&*()',
      'length': 8,
    },
    'basic-password': {
      'charSet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        '0123456789',
      'length': 8,
    },
    'short-password': {
      'charSet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        '0123456789!@#$%^&*()',
      'length': 4,
    },
    'pin': {
      'charSet': '0123456789',
      'length': 4,
    },
    'pin-6': {
      'charSet': '0123456789',
      'length': 6,
    },
    'login': {
      'charSet': 'abcdefghijklmnopqrstuvwxyz0123456789',
      'length': 9,
    },
    'answer': {
      'charSet': 'abcdefghijklmnopqrstuvwxyz',
      'length': 16,
      /* Spaces will split the generated answer into chunks which look like
         word by making specific characters spaces */
      'spaces': [3, 6, 12],
    },
  };


  /* All the country top level domain suffixes - used for determining the
    domain from a URL N.B. '.io' has been excluded becuase it is used like
     .com, eg github.io */
  this.countryTLDs = ['ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'an',
    'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd',
    'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt',
    'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck',
    'cl', 'cm', 'cn', 'co', 'cr', 'cs', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
    'dd', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er',
    'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd',
    'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs',
    'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie',
    'il', 'im', 'in', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp',
    'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la',
    'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc',
    'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr',
    'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf',
    'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf',
    'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa',
    're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh',
    'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'su', 'sv',
    'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm',
    'tn', 'to', 'tp', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'us',
    'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye',
    'yt', 'yu', 'za', 'zm', 'zw'];
};

/**
 * Resets all the values used for calculations
 * @param {None}.
 * @return {None}.
 */

/* OpenSesame.prototype.clearPassPhrase = function() {
  'use strict';

  this.passPhrase = zeroVar(this.passPhrase);
  this.passPhrase = '';
}; */

/**
 * Runs the generation of a password by generating a key (PBKDF2) and then
  using that key to sign (HMAC256) the constructed domain value
 * @param {String} userName the website username
 * @param {String} passPhrase the open sesame pass phrase
 * @param {String} domainName the website domain
 * @param {String} passwordType password type to generate
 * @param {String} vers the version of the password (defaults to 1)
 * @param {String} secQuestion the security question (for generating an answer)
 * @return {Promise} a promise which will resolve the generated password.
 */

OpenSesame.prototype.generatePassword = function(userName, passPhrase,
  domainName, passwordType, vers, securityQuestion) {
  'use strict';

  let passNS = '';
  let version = vers || 1;
  let securityQuestionValue = securityQuestion || '';


  if (passPhrase.length === 0) {
    return Promise.reject(new Error('Passphrase not present'));
  }

  if (domainName.length === 0) {
    return Promise.reject(new Error('Domain name not present'));
  }

  if (userName.length === 0) {
    return Promise.reject(new Error('Domain name not present'));
  }


  if (passwordType === 'answer' && securityQuestion.length === 0) {
    return Promise.reject(new Error('Security question not present'));
  }


  try {
    let openSesame = this;

    // return promise which resolves to the generated password
    return new Promise(function(resolve, reject) {
      passNS = openSesame.passwordNS;

      if (passwordType === 'answer') {
        passNS = openSesame.answerNS;
      } else if (passwordType == 'login') {
        passNS = openSesame.loginNS;
      }

      // Set up parameters for PBKDF2 and HMAC functions
      let userNameValue = userName.trim().toLowerCase();
      let salt = passNS + '.' + userNameValue;
      let posDomain = 0;
      let domainParts;
      let calculatedDomain = '';
      let domainCountryCode = '';

      /* Retrieve domain value and trim the leading http://  or https://  */
      let fullDomain = domainName.replace(/^https?:\/\//g, '').toLowerCase();

      /* Check whether the whole URL is there - remove anything with a '/'
        onwards */
      posDomain = fullDomain.indexOf('/');
      if (posDomain > 0) {
        fullDomain = fullDomain.substr(0, posDomain);
      }

      // Split base domain into its individual elements
      domainParts = fullDomain.split('.');

      /* Check whether the last domain element is a country code suffix, eg
          mrpeeel.com.au */
      if (domainParts.length > 1 &&
        openSesame.countryTLDs.indexOf(domainParts[domainParts.length - 1])
        >= 0) {
        // Save the country code and remove from domain elements array
        domainCountryCode = '.' + domainParts[domainParts.length - 1];
        domainParts = domainParts.slice(0, -1);
      }

      // if there are more than 2 elements remaining, only keep the last two
      // eg photos.google.com = google.com, mail.google.com = google.com
      if (domainParts.length > 2) {
        domainParts = domainParts.slice(-2);
      }

      // Re-assemble base domain into final value with country code
      calculatedDomain = domainParts.join('.') + domainCountryCode;

      // Add user to domain value
      calculatedDomain = userNameValue + version + '@' + calculatedDomain;

      // For an answer, add the security question to domain value
      if (passwordType === 'answer') {
        /* Strip out any punctuation or multiple spaces and convert to
          lower case */
        securityQuestionValue = securityQuestionValue.replace(/[.,-\/#!$%\^&\*;:{}=\-_`~()?'']/g, '')
          .replace(/  +/g, ' ')
          .trim()
          .toLowerCase();
        calculatedDomain = calculatedDomain + ':' + securityQuestionValue;
      }


      // parameters: password, salt, numIterations, keyLength
      return pBKDF2(openSesame.passPhrase, salt, 750, 128)
        .then(function(key) {
          // console.log('Derived key: ' + key);

          return hMACSHA256(calculatedDomain, key);
        }).then(function(seedArray) {
        //  Set up passowrd length and any spaces for generated value
        let passLength = openSesame.passwordTypes[passwordType].length;
        let spaces = openSesame.passwordTypes[passwordType].spaces || [];
        let charSet = openSesame.passwordTypes[passwordType].charSet;
        let password = '';

        //  Split the template string
        /* let password = template.split('').map(function(c, i) {
          //  Use the available passchars to map the template string
          //  to characters (e.g. c -> bcdfghjklmnpqrstvwxyz)
          let chars = openSesame.passchars[c];

          //  Select the character using seed[i + 1]
          return chars[seedArray[i + 1] % chars.length];
        }).join(''); /* Re-join as password */
        // console.log('Generated password: ' + password);
        // console.log(performance.now() - t0 + ' ms');
        // console.log('All done');*/

        // Select the chars and clear seedArray
        for (let s = 0; s < seedArray.length; s++) {
          // Within the password length, so add next char to password
          if (s < passLength) {
            // Check if this character must be a space (for security answers)
            if (spaces.indexOf[s] >= 0) {
              // This position is a defined space
              password = password + ' ';
            } else {
              // Select character from character set
              password = password + charSet[seedArray[s] % charSet.length];
            }
          }
          // Re-set the seed array value
          seedArray[s] = 0;
        }

        // Clear pass phrase values
        passPhrase = zeroVar(passPhrase);

        resolve(password);
      })
        .catch(function(e) {
          return Promise.reject(e);
        });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};