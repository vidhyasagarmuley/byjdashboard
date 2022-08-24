sap.ui.define([], function () {
    "use strict";

    return {

        /**
         * Rounds the number unit value to 2 digits
         * @public
         * @param {string} sValue the number string to be rounded
         * @returns {string} sValue with 2 digits rounded
         */
        numberUnit: function (sValue) {
            if (!sValue) {
                return "";
            }
            return parseFloat(sValue).toFixed(2);
        },
        iconFilePath: function (v) {
            var path = "";
            // if (v = "X"){
            // 	path = jQuery.sap.getModulePath("com.sap.byjus.byjusdashboard", "/icon/TrafficLightG.png");
            // } else{
            // 	 path = jQuery.sap.getModulePath("com.sap.byjus.byjusdashboard", "/icon/TrafficLightG.png");
            // }
            return path;
        },
        formatNumberIntoCurrency: function (sValue) {
            var formatter = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
            });

           return formatter.format(parseInt(sValue));
        }

    };

});