sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/core/util/Export",
    "sap/ui/core/util/ExportTypeCSV",
    "sap/ui/model/json/JSONModel"
], function (Object, Export, ExportTypeCSV, JSONModel) {
    "use strict";

    return Object.extend("com.sap.byjus.byjusdashboard.controller.ExportInCSV", {

        constructor : function (params) {

            Object.apply(this);

            // check params
            if (!params) {
                throw new Error("Failed to instantiate. params missing");
            }
            if (!params.view) {
                throw new Error("Failed to instantiate. view missing");
            }
            // if (!params.crud) {
            //     throw new Error("Failed to instantiate. view missing");
            // }

            this._oView = params.view;
            // this._crud = params.crud;
        },

        startDownloadCSV: function (params) {
            // this._crud.whenRead({
            //     path : params.path,
            //     busyControl : this._oView,
            //     filters: params.filters
            // }).then(function(oResponse){
            //     this._prepareCSVDownload(oResponse.data, params.columns, params.filename);
            // }.bind(this));
            this._oView.setBusy(false);
            this._oView.getModel().read(params.path, {
                filters:params.filters,
                success: function (data) {
                    this._oView.setBusy(false);
                    this._prepareCSVDownload(data, params.columns, params.filename);
                }.bind(this), 
                error: function (oError) {
                    this._oView.setBusy(false);
                    // this._prepareCSVDownload(oResponse.data, params.columns, params.filename);
                }.bind(this)
            });
        },

        _prepareCSVDownload: function (oData, aColumns, sFilename) {
            var oModel = new JSONModel(oData);
            var oExport = new Export({
                exportType: new ExportTypeCSV({
                    fileExtension: "csv",
                    separatorChar: ",",
                    charset : "UTF-8",
                    byteOrderMark: true
                }),

                models: oModel,

                rows: {
                    path: "/results"
                },

                columns: aColumns
            });
            //console.log(oExport);
            oExport.saveFile(sFilename).catch(function(oError) {
                sap.m.MessageToast.show("Error when downloading data.\n\n", +oError);
            }).then(function() {
                oExport.destroy();
                Object.prototype.destroy.apply(this, arguments);
            });
        }



    });

});
