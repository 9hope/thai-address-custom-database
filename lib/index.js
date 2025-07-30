"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
(function (angular) {
  'use strict';

  var utilAddress = require('./util/splitAddress');
  /**
  * From jquery.Thailand.js line 38 - 100
  */
  var preprocess = function preprocess(data) {
    var lookup = [];
    var words = [];
    var expanded = [];
    var useLookup = false;
    var t;
    if (data.lookup && data.words) {
      // compact with dictionary and lookup
      useLookup = true;
      lookup = data.lookup.split('|');
      words = data.words.split('|');
      data = data.data;
    }
    t = function t(text) {
      function repl(m) {
        var ch = m.charCodeAt(0);
        return words[ch < 97 ? ch - 65 : 26 + ch - 97];
      }
      if (!useLookup) {
        return text;
      }
      if (typeof text === 'number') {
        text = lookup[text];
      }
      return text.replace(/[A-Z]/ig, repl);
    };
    if (!data[0].length) {
      // non-compacted database
      return data;
    }
    // decompacted database in hierarchical form of:
    // [["province",[["amphur",[["district",["zip"...]]...]]...]]...]
    data.map(function (provinces) {
      var i = 1;
      if (provinces.length === 3) {
        // geographic database
        i = 2;
      }
      provinces[i].map(function (amphoes) {
        amphoes[i].map(function (districts) {
          districts[i] = districts[i] instanceof Array ? districts[i] : [districts[i]];
          districts[i].map(function (zipcode) {
            var entry = {
              district: t(districts[0]),
              amphoe: t(amphoes[0]),
              province: t(provinces[0]),
              zipcode: zipcode
            };
            if (i === 2) {
              // geographic database
              entry.district_code = districts[1] || false;
              entry.amphoe_code = amphoes[1] || false;
              entry.province_code = provinces[1] || false;
            }
            expanded.push(entry);
          });
        });
      });
    });
    return expanded;
  };
  var db = preprocess(require('../database/db.json'));
  var fetch = require('node-fetch');
  /**
   * setDatabase
   * @param {String|Object} dataOrUrl - JSON object, JSON string, or HTTP(S) URL to a JSON file
   * @returns {Promise<void>|void}
   */
  var setDatabase = function setDatabase(dataOrUrl) {
    if (typeof dataOrUrl === 'string' && /^https?:\/\//.test(dataOrUrl)) {
      // If a URL, fetch and preprocess asynchronously
      return fetch(dataOrUrl).then(function (res) {
        return res.json();
      }).then(function (json) {
        db = preprocess(json);
      });
    } else if (typeof dataOrUrl === 'string') {
      // If a JSON string, parse and preprocess
      db = preprocess(JSON.parse(dataOrUrl));
    } else if (_typeof(dataOrUrl) === 'object') {
      // If an object, preprocess directly
      db = preprocess(dataOrUrl);
    } else {
      db = null;
      throw new Error('Invalid data type for setDatabase');
    }
  };
  var resolveResultbyField = function resolveResultbyField(type, searchStr, maxResult) {
    searchStr = searchStr.toString().trim();
    if (searchStr === '') {
      return [];
    }
    if (!maxResult) {
      maxResult = 20;
    }
    var possibles = [];
    try {
      if (!db) throw new Error('Database not loaded');
      possibles = db.filter(function (item) {
        var regex = new RegExp(searchStr, 'g');
        return (item[type] || '').toString().match(regex);
      }).slice(0, maxResult);
    } catch (e) {
      return [];
    }
    return possibles;
  };
  var searchAddressByDistrict = function searchAddressByDistrict(searchStr, maxResult) {
    return resolveResultbyField('district', searchStr, maxResult);
  };
  var searchAddressByAmphoe = function searchAddressByAmphoe(searchStr, maxResult) {
    return resolveResultbyField('amphoe', searchStr, maxResult);
  };
  var searchAddressByProvince = function searchAddressByProvince(searchStr, maxResult) {
    return resolveResultbyField('province', searchStr, maxResult);
  };
  var searchAddressByZipcode = function searchAddressByZipcode(searchStr, maxResult) {
    return resolveResultbyField('zipcode', searchStr, maxResult);
  };
  var splitAddress = function splitAddress(fullAddress) {
    var regex = /\s(\d{5})(\s|$)/gi;
    var regexResult = regex.exec(fullAddress);
    if (!regexResult) {
      return null;
    }
    var zip = regexResult[1];
    var address = utilAddress.prepareAddress(fullAddress, zip);
    var result = utilAddress.getBestResult(zip, address);
    if (result) {
      var newAddress = utilAddress.cleanupAddress(address, result);
      return {
        address: newAddress,
        district: result.district,
        amphoe: result.amphoe,
        province: result.province,
        zipcode: zip
      };
    }
    return null;
  };
  exports.setDatabase = setDatabase;
  exports.searchAddressByDistrict = searchAddressByDistrict;
  exports.searchAddressByAmphoe = searchAddressByAmphoe;
  exports.searchAddressByProvince = searchAddressByProvince;
  exports.searchAddressByZipcode = searchAddressByZipcode;
  exports.splitAddress = splitAddress;
  if (angular) {
    angular.module('thAddress', []).config(function ($provide) {
      $provide.value('thad', {
        searchAddressByDistrict: searchAddressByDistrict,
        searchAddressByAmphoe: searchAddressByAmphoe,
        searchAddressByProvince: searchAddressByProvince,
        searchAddressByZipcode: searchAddressByZipcode,
        splitAddress: splitAddress
      });
    });
  }
})(typeof angular !== 'undefined' ? angular : false);