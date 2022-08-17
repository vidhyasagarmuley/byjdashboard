sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
     '../utils/InitPage',
     'sap/viz/ui5/data/FlattenedDataset',
     'sap/viz/ui5/format/ChartFormatter',
     'sap/viz/ui5/api/env/Format',
     "sap/ui/model/Sorter",
     "sap/m/MessageBox",
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, InitPage, FlattenedDataset,
    ChartFormatter, Format, Sorter, MessageBox) {
    "use strict";

    return BaseController.extend("com.sap.byjus.byjusdashboard.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit : function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "worklistView");
            var sJsonPath = jQuery.sap.getModulePath("com.sap.byjus.byjusdashboard", "/model/testData.json");
            var oStaticDataModel = new JSONModel(sJsonPath);
            this.getView().setModel(oStaticDataModel, "staticDataModel");
            var detailJSONModel = new JSONModel( {
                "cashCollection": [
                    {
                        "name" : "Loan Partners",
                        "amount" : 1232.00,
                    },{
                      "name" : "Retail Direct to Bank",
                      "amount" : 35002.00,
                  },{
                      "name" : "Retail Direct to Bank",
                      "amount" : 577.00,
                  },{
                    "name" : "PayU and Razorpay",
                    "amount" : 93933.00,
                },{
                  "name" : "PayU and Razorpay",
                  "amount" : 202020.00,
                  },{
                    "name" : "Exports",
                      "amount" : 57564634.00,
                  },{
                    "name" : "Exports",
                    "amount" : 3223.00,
                    },{
                      "name" : "NACH (EE Bytes)",
                      "amount" : 35009.00,
                      }
                ]
            });
            this.getView().setModel(detailJSONModel,"detailJSONModel");
            this._handleSetVizFrameData(detailJSONModel.getProperty("/"));

        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress : function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack : function() {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },


        onSearch : function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("CategoryName", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh : function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject : function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getPath().substring("/Categories".length)
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function(aTableSearchState) {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        },
        _handleSetVizFrameData: function (data) {
            var sProperties = this.getView().getModel("detailJSONModel").getProperty("/");
            var keys = Object.keys(sProperties);
            keys.forEach((key) => {
            //    this._handlePrepareData(key ,data);
               this._handleVizFrames(key);
            });
        },
        _handlePrepareData :  function (key, data) {
            var keyArray = [];
            for (var i=0; i<data[key].length; i++) {
                var sObjecct = {}, newObj = data[key][i];
                sObjecct[key] = newObj[key];
                keyArray.push(sObjecct);
            }
            var counts = {};
            keyArray.forEach(function(x) {
               var sProperty =  x[key];
                counts[sProperty] = (counts[sProperty] || 0) + 1;
            });
            console.log(counts);
            var finKeys = Object.keys(counts);
            var  finArray = this.getView().getModel("detailJSONModel").getProperty("/"+ key +"");
                finKeys.forEach((key) => {
                   var finData = {};
                   finData.status = key;
                   finData.count = counts[key];
                   finArray.push(finData);
                });
                this.getView().getModel("detailJSONModel").setProperty("/"+ key +"", finArray);
        },
    _handleVizFrames :  function (key) {
        var oVizFrame =  this.getView().byId(key);
        if (!oVizFrame) {
            return;
        }
        // oVizFrame.setVizProperties({
        //     plotArea: {
        //         // colorPalette: d3.scale.category20().range(),
        //         dataLabel: {
        //             showTotal: true
        //         }
        //     },
        //     tooltip: {
        //         visible: true
        //     },
        //     title: {
        //         text: "Pie Chart"
        //     }
        // });
        Format.numericFormatter(ChartFormatter.getInstance());
        var formatPattern = ChartFormatter.DefaultPattern;

        oVizFrame.setVizProperties({
            plotArea: {
                dataLabel: {
                    formatString: formatPattern.SHORTFLOAT_MFD2,
                    visible: true
                }
            },
            valueAxis: {
                label: {
                    formatString: formatPattern.SHORTFLOAT
                },
                title: {
                    visible: false
                }
            },
            categoryAxis: {
                title: {
                    visible: false
                }
            },
            title: {
                visible: false,
                text: 'Revenue by City and Store Name'
            }
        });
        var dataModel = this.getView().getModel("detailJSONModel");
        oVizFrame.setModel(dataModel);
        var oPopOver = this.getView().byId(key + "PopOver");
        oPopOver.connect(oVizFrame.getVizUid());
        oPopOver.setFormatString(ChartFormatter.DefaultPattern.STANDARDFLOAT);
        InitPage.initPageSettings(this.getView(), key);
        // var that = this;
        dataModel.attachRequestCompleted(function() {
            this.dataSort(dataModel.getProperty("/"), key);
        }.bind(this));
        oVizFrame.setVizProperties({
            plotArea: {
                dataLabel: {
                    visible: true
                }
            }
        });
    },
    dataSort: function(dataset, key) {
        //let data sorted by revenue
        if (dataset && dataset.hasOwnProperty(key)) {
            var arr = dataset.milk;
            arr = arr.sort(function (a, b) {
                return b.count - a.count;
            });
        }
    },

    });
});
