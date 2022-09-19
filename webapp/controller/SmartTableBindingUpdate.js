sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter"
], function (Object, Filter, Sorter) {
    "use strict";

    /**
     * Wraps the logic to update the binding of a smart table
     *
     * See Also: Smart Table @ https://sapui5.hana.ondemand.com/sdk/#docs/guide/bed8274140d04fc0b9bcb2db42d8bac2.html
     */
    return Object.extend("com.goap.cfms.works.reuselib.SmartTableBindingUpdate", {

        constructor: function (params) {
            if (!params) {
                throw new Error("Failed to instantiate. params missing");
            }
            this._oParams = params;
            this._aFilters = [];
            this._bPrevent = false;
        },

        addSelect: function (propertyName) {
            var aParams = [];
            if (this._oParams.parameters.select) {
                aParams = this._oParams.parameters.select.split(",");
            }
            if (aParams.indexOf(propertyName) === -1) {
                aParams.push(propertyName);
                this._oParams.parameters.select = aParams.toString();
            }
        },

        addExpand: function (propertyName) {
            var aParams = [];
            if (this._oParams.parameters.expand) {
                aParams = this._oParams.parameters.expand.split(",");
            }
            if (aParams.indexOf(propertyName) === -1) {
                aParams.push(propertyName);
                this._oParams.parameters.expand = aParams.toString();
            }
        },

        prevent: function () {
            this._oParams.preventTableBind = true;
        },

        enableCountMode: function () {
            if (!this._oParams.parameters) {
                this._oParams.parameters = {};
            }
            this._oParams.parameters.countMode = "Request";
        },

        addFilter: function (propertyName, operator, propertyValue) {
            if (propertyValue === undefined) {
                this._bPrevent = true;
            } else {
                var bHasFilter = this.hasFilter(this._oParams.filters, propertyName);
                if (!bHasFilter) {
                    this._aFilters.push(new Filter(propertyName, operator, propertyValue));
                }
            }
        },

        endFilterAnd: function () {
            this._endFilter(true);
        },

        endFilterOr: function () {
            this._endFilter(false);
        },

        _endFilter: function (bAnd) {

            if (this._bPrevent) {

                //if no property is known we don't need to call the backend at all
                //In such cases we avoid the rebinding
                this._oParams.preventTableBind = true;

            } else if (this._aFilters.length > 0) { // array might be empty even if addFilter was called before

                // add filter
                var oOwnMultiFilter = new Filter(this._aFilters, bAnd);

                //Special handling for multiple multi-filters
                if (this._oParams.filters[0] && this._oParams.filters[0].aFilters) {
                    var oSmartTableMultiFilter = this._oParams.filters[0];
                    // if an internal multi-filter exists then combine custom multi-filters and internal multi-filters with an AND
                    this._oParams.filters[0] = new Filter([oSmartTableMultiFilter, oOwnMultiFilter], true);
                } else {
                    this._oParams.filters.push(oOwnMultiFilter);
                }
            }

            // reset
            this._aFilters = [];
        },

        /** This function is used for Adding a Sorter with/without the Grouping
         * The filterArray might be a deeply nested array of arrays or objects.
         * @param propertyName - Property name for Sorting
         * @param bDescending - Flag fo setting the Descending order
         * @param groupKey - Property Key name for Grouping
         * @param groupText - Property Text name for Grouping
         * @param sGroupLabel - String Label for the Grouping Text
         */
        addSorter: function (propertyName, bDescending, groupKey, groupText, sGroupLabel) {
            var bDescendingFlg = bDescending ? bDescending : false; //Setting a Default value if not set from the caller
            if (groupKey && groupText) {
                this._oParams.sorter = [
                    new Sorter(propertyName, bDescendingFlg, function (oContext) {
                            var oSortObj = oContext.getObject();
                            var sLabel = sGroupLabel ? sGroupLabel + ": " : "";
                            return {
                                key: oSortObj[groupKey],
                                text: sLabel + oSortObj[groupText]
                            };
                        }.bind(this)
                    )];
            } else {
                this._oParams.sorter = [
                    new Sorter(propertyName, bDescendingFlg)];
            }

        },

        /** This function recursively checks if the filterArray contains a filter object for a property
         * The filterArray might be a deeply nested array of arrays or objects.
         * @param {sap.ui.model.Filter[]} filters filters
         * @param {string} propertyName The name of the property to be filtered
         * @returns {boolean} boolean
         */
        hasFilter: function (filters, propertyName) {

            var hasFilter = false;

            //definition of recursive function
            var myFunction = function (item, index) {

                // console.log("myFunction: " + item + ", " + index);
                if (item.aFilters) {
                    item.aFilters.forEach(myFunction);
                }

                if (item.sPath && item.sPath === propertyName) {
                    hasFilter = true;
                }
            };

            // call of recursive function for each entry in filterArray
            if (filters) {
                filters.forEach(myFunction);
            }

            return hasFilter;
        },

        deleteFilterByPropertyName: function (filterArray, propertyName) {

            var sPath;

            for (var outerIndex = filterArray.length - 1; outerIndex >= 0; outerIndex--) {
                var currentOuterEntry = filterArray[outerIndex];

                // Start of Earlier Code
                //as fieldnames in each currentOuterEntry are equal we can check the first entry only
                //       var filterObject = currentOuterEntry.aFilters[0];

                //       if (filterObject.sPath === propertyName) {
                //we found a filter object with the given property name...delete it
                //           filterArray.splice(outerIndex, 1);
                //       }
                // End of Earlier Code
                //aFilters is not present if the filter type is single

                if (currentOuterEntry.aFilters) {
                    sPath = currentOuterEntry.aFilters[0].sPath;
                }
                else {
                    sPath = currentOuterEntry.sPath;
                }

                if (sPath === propertyName) {
                    //we found a filter object with the given property name...delete it
                    filterArray.splice(outerIndex, 1);
                }
            }
        },


        /**
         * This function creates filters for CreateDate according to the given dateIdFilters.
         * The dateIdFilters are provided by the UI (the filters the user chose).
         * This function expects that the relevant date field is named "CreateDate"
         */
        createCreateDateFilters: function (dateIdFilters, dateValues) {

            //prepare return array
            var createDateFilters = [];

            for (var i = 0; i < dateIdFilters.length; i++) {
                var currentDateId = dateIdFilters[i].oValue1;

                var innerFilterObject = undefined;

                //Today (TDY)
                if (currentDateId === "TDY") {
                    innerFilterObject = new Filter("CreateDate", "EQ", dateValues.TodayDate);
                    createDateFilters.push(innerFilterObject);
                }

                //Yesterday (YST)
                if (currentDateId === "YST") {
                    innerFilterObject = new Filter("CreateDate", "EQ", dateValues.YesterdayDate);
                    createDateFilters.push(innerFilterObject);
                }

                //This Month (THM)
                if (currentDateId === "THM") {
                    innerFilterObject = new Filter("CreateDate", "BT", dateValues.FirstDayThisMonth, dateValues.LastDayThisMonth);
                    createDateFilters.push(innerFilterObject);
                }

                //This Year (THY)
                if (currentDateId === "THY") {
                    innerFilterObject = new Filter("CreateDate", "BT", dateValues.FirstDayThisYear, dateValues.LastDayThisYear);
                    createDateFilters.push(innerFilterObject);
                }

                //Last Month (LAM)
                if (currentDateId === "LAM") {
                    innerFilterObject = new Filter("CreateDate", "BT", dateValues.FirstDayLastMonth, dateValues.LastDayLastMonth);
                    createDateFilters.push(innerFilterObject);
                }

                //Last Year (LAY)
                if (currentDateId === "LAY") {
                    innerFilterObject = new Filter("CreateDate", "BT", dateValues.FirstDayLastYear, dateValues.LastDayLastYear);
                    createDateFilters.push(innerFilterObject);
                }

            }

            return createDateFilters;
        }
    });
});