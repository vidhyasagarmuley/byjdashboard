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
    "com/sap/byjus/byjusdashboard/controller/SmartTableBindingUpdate",
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, InitPage, FlattenedDataset,
    ChartFormatter, Format, Sorter, MessageBox, SmartTableBindingUpdate) {
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
        onInit: function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "worklistView");
            var sJsonPath = jQuery.sap.getModulePath("com.sap.byjus.byjusdashboard", "/model/testData.json");
            var oStaticDataModel = new JSONModel(sJsonPath);
            this.getView().setModel(oStaticDataModel, "staticDataModel");
            var detailJSONModel = new JSONModel({
                "cashCollection": [
                ]
            });
            this.getView().setModel(detailJSONModel, "detailJSONModel");
            this._handleSetVizFrameData(detailJSONModel.getProperty("/"));
            this.getRouter().getRoute("worklist").attachPatternMatched(this._onPatternMatch, this);
        },
        _onPatternMatch: function (oEvent) {
            // this.getModel().metadataLoaded().then(function() {
            //     this.byId("idCashCollectionTable").rebindTable();
            //  }.bind(this));
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
        onUpdateFinished: function (oEvent) {
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
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },


        onSearch: function (oEvent) {
           let selectionSet = oEvent.getParameters().selectionSet;
           let sControl,sValue, filters = [], sPath;
           if (selectionSet.length > 0) {
            selectionSet.forEach(function(item) {
                sControl = item.getMetadata()._sClassName;
                sValue = "";
                if (sControl === "sap.m.DatePicker" || sControl === "Input") {
                    if (sControl === "sap.m.DatePicker") {
                        sValue = item.getDateValue();
                    } else {
                        sValue = item.getValue();
                    }
                } else if (sControl === "sap.m.ComboBox" || sControl === "sap.m.Select") {
                    sValue = item.getSelectedKey();
                }
                if (sValue) {
                    sPath = item.getCustomData()[0].getValue();
                    if (sPath === "fromDate" || sPath === "toDate") {
                        if (sPath === "fromDate") {
                            filters.push(new Filter('Date', "GE", sValue));
                        } else if (sPath === "toDate") {
                            filters.push(new Filter('Date', "LE", sValue));
                        }
                    } else if (sPath === "partner") {
                          filters.push(new Filter(sPath, "EQ", sValue));
                    }
                }
            });
            var aFilters = new Filter({
				filters: filters,
				and: true
			});
            var oBinding = this.byId("idCashCollectionTable").getBinding("items");
			oBinding.filter(aFilters);
            this.readBackendData(filters);
           }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
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
        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getPath().substring("/Categories".length)
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        },
        _handleSetVizFrameData: function (data) {
            // var sProperties = this.getView().getModel("detailJSONModel").getProperty("/");
            // var keys = Object.keys(sProperties);
            // keys.forEach((key) => {
                //    this._handlePrepareData(key ,data);
                this._handleVizFrames("vizframe");
            // });
        },
        _handlePrepareData: function (key, data) {
            var keyArray = [];
            for (var i = 0; i < data[key].length; i++) {
                var sObjecct = {},
                    newObj = data[key][i];
                sObjecct[key] = newObj[key];
                keyArray.push(sObjecct);
            }
            var counts = {};
            keyArray.forEach(function (x) {
                var sProperty = x[key];
                counts[sProperty] = (counts[sProperty] || 0) + 1;
            });
            console.log(counts);
            var finKeys = Object.keys(counts);
            var finArray = this.getView().getModel("detailJSONModel").getProperty("/" + key + "");
            finKeys.forEach((key) => {
                var finData = {};
                finData.status = key;
                finData.count = counts[key];
                finArray.push(finData);
            });
            this.getView().getModel("detailJSONModel").setProperty("/" + key + "", finArray);
        },
        _handleVizFrames: function (key) {
            var oVizFrame = this.getView().byId(key);
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
            let description = this.getDashboardDescription(oVizFrame);
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
                        visible: true,
                        text: 'Amount'
                    }
                },
                categoryAxis: {
                    title: {
                        visible: true,
                        text: 'Period'
                    }
                },
                title: {
                    visible: true,
                    text: description
                }
            });
            var dataModel = this.getView().getModel("detailJSONModel");
            oVizFrame.setModel(dataModel);
            var oPopOver = this.getView().byId(key + "PopOver");
            oPopOver.connect(oVizFrame.getVizUid());
            oPopOver.setFormatString(ChartFormatter.DefaultPattern.STANDARDFLOAT);
            InitPage.initPageSettings(this.getView(), key);
            // var that = this;
            dataModel.attachRequestCompleted(function () {
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
        dataSort: function (dataset, key) {
            //let data sorted by revenue
            if (dataset && dataset.hasOwnProperty(key)) {
                var arr = dataset.milk;
                arr = arr.sort(function (a, b) {
                    return b.count - a.count;
                });
            }
        },
        getDashboardDescription: function (oControll) {
            oControll = this.byId("idComboSources").getSelectedKey();
            if (oControll) {
                return this.byId("idComboSources").getSelectedItem().getText();
            } else {
                return "";
            }
        },
        // getDashboardDescription: function (oControll) {
        //     let description = '';
        //     if (oControll.getId().indexOf("cashCollection") >= 0) {
        //         description = "Cash collection from different sources";
        //     } else if (oControll.getId().indexOf("loanPartners") >= 0) {
        //         description = "Loan Partners";
        //     } else if (oControll.getId().indexOf("retailDirectToBank") >= 0) {
        //         description = "Retail Direct To Bank";
        //     } else if (oControll.getId().indexOf("loanPartners") >= 0) {
        //         description = "Loan Partners";
        //     } else if (oControll.getId().indexOf("payuAndRozaPay") >= 0) {
        //         description = "PayU and Razorpay";
        //     } else if (oControll.getId().indexOf("export") >= 0) {
        //         description = "Exports";
        //     } else if (oControll.getId().indexOf("nachEEBytes") >= 0) {
        //         description = "NACH (EE Bytes)";
        //     }
        //     return description;
        // },
        _handleChangeFilterType: function (oEvent) {
            let selectedKey = oEvent.getSource().getSelectedKey();
            let sKey = oEvent.getSource().getCustomData()[0].getValue();
            let WeeklyMonthlyData = this._handleGetSampleData(selectedKey, sKey);

        },
        _handleGetSampleData: function (selectedKey, sKey) {
            let data, sField;
            switch (sKey) {
                case "loanPartners":
                    sField = "Loan Partners";
                    break;
                case "export":
                    sField = "Exports";
                    break;
                case "nachEEBytes":
                    sField = "NACH (EE Bytes)";
                    break;
                case "payuAndRozaPay":
                    sField = "PayU and Razorpay";
                    break;
                case "retailDirectToBank":
                    sField = "Retail Direct to Bank";
                    break;
            }
            if (selectedKey === "01") {
                data = [{
                        [sField]: 23733.00,
                        "Date": "01/01/2022"
                    },
                    {
                        [sField]: 23733.00,
                        "Date": "01/02/2022"
                    },
                    {
                        [sField]: 58463.00,
                        "Date": "01/03/2022"
                    },
                ]
            } else if (selectedKey === "02") {
                data = [{
                        [sField]: 23733.00,
                        "Date": "01/01/2022"
                    },
                    {
                        [sField]: 23733.00,
                        "Date": "02/01/2022"
                    },
                    {
                        [sField]: 58463.00,
                        "Date": "03/01/2022"
                    },
                    {
                        [sField]: 21463.00,
                        "Date": "04/01/2022"
                    },
                    {
                        [sField]: 36463.00,
                        "Date": "05/01/2022"
                    },
                ]
            }
            let sProperty = "/" + sKey;
            this.getModel("detailJSONModel").setProperty(sProperty, data);

        },
        // onBeforeRebindPayUTable: function (oEvent) {
        //     var oUpdate = new SmartTableBindingUpdate(oEvent.getParameter("bindingParams"));
        //     oUpdate.addFilter("partner", FilterOperator.EQ, 'G');
        //     oUpdate.endFilterAnd();
        // },
        onSelectionChangeCombobox: function (oEvent) {

        },
        onSwitchChange: function (oEvent) {
            let sSelectedkey = oEvent.getSource().getSelectedKey();
            if (this.byId("idComboSources").getSelectedKey()) {
            if (sSelectedkey === "2") {
                this.byId("cashCollection").setVisible(false);
                this.byId("lineGraph").setVisible(true);
                // this.byId("idFilterBar").fireSearch();
                // this._handleOpenVizFrame();
            } else if (sSelectedkey === "1") {
                this.byId("cashCollection").setVisible(true);
                this.byId("lineGraph").setVisible(false);
            }
        } else {
            oEvent.getSource().setSelectedKey("1");
            sap.m.MessageToast.show("Please select the source first");
        }
        },
        // _handleOpenVizFrame: function () {
        //     let sPromise  = new Promise(function(resolve, reject){
        //         this.readBackendData(resolve, reject);
        //     });
        // },
        readBackendData: function (aFilters) {
            this.getView().setBusy(true);
            this.getModel().read("/zcash_collection", {
                filters:aFilters,
                success: function (data) {
                    this.getView().setBusy(false);
                    this.getView().getModel("detailJSONModel").setProperty("/vizframeData", data.results);
                }.bind(this), 
                error: function (oError) {
                    this.getView().setBusy(false);
                    console.log(oError)
                }.bind(this)
            });
        }

    });
});