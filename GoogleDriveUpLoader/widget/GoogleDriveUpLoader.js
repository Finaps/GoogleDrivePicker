/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, document, jQuery */
/*mendix */
/*
    GoogleDriveUpLoader
    ========================

    @file      : GoogleDriveUpLoader.js
    @version   : 
    @author    : Simon
    @date      : Wed, 13 May 2015 12:33:37 GMT
    @copyright : 
    @license   : 

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare", 
    "mxui/widget/_WidgetBase", 
    "dijit/_TemplatedMixin",
    "mxui/dom", 
    "dojo/dom", 
    "dojo/query", 
    "dojo/dom-prop", 
    "dojo/dom-geometry", 
    "dojo/dom-class",
    "dojo/dom-style", 
    "dojo/dom-construct",
    "dojo/_base/array", 
    "dojo/_base/lang",
    "dojo/text", 
    "dojo/html", 
    "dojo/_base/event",
    "GoogleDriveUpLoader/lib/jquery-1.11.2.min", 
    "dojo/text!GoogleDriveUpLoader/widget/template/GoogleDriveUpLoader.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, html, event, _jQuery, widgetTemplate) {
    "use strict";

    var $ = jQuery.noConflict(true);
    
    /*gapi.onload = gapi.OnLoadCallback();*/
    
    gapi.load("auth", {
        'callback': console.log('auth loaded')
    });
    
    gapi.load("picker", {
        'callback': console.log('picker loaded')
    });

    // Declare widget's prototype.
    return declare("GoogleDriveUpLoader.widget.GoogleDriveUpLoader", [_WidgetBase, _TemplatedMixin], {

        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        main: "",
        token: "",
        FolderID: "",
        mfToExecute: "",
        mfToExecuteCopy: "",
        mfToRetrieveAppID: "",

        objStore: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _scope: ["https://www.googleapis.com/auth/drive.file"],
        _requestToken: "",
        _flag: false,
        _AppID: false,
        _APIKey: false,

        //Global

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {

        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            console.log(this.id + ".postCreate");

            //globals
            window.gDAttr = this.objStore;
            window.gDriveTkn = this.token;
            window.gDMf = this.mfToExecute;
            window.gDMfC = this.mfToExecuteCopy;
            window.gAppIdMF = this.mfToRetrieveAppID;

            this.getUser(); // get correct user object from system user.
            this.getAppID();// get key


        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            console.log(this.id + ".update");
            callback();
            window.gDConId = obj;
        },

        getUser: function () {
            var guid = mx.session.getUserId();
            mx.data.get({
                xpath: "//" + this.main,
                guid: guid,
                callback: this.tokenGet
            });


        },

        tokenGet: function (obj) {
            if (obj !== null) {
                console.log("User " + obj.get("FullName"));
                window.userToken = obj.get(window.gDriveTkn);
                this.getAppID();
            } else {
                console.log("not token found, this should never happen");
                this._flag = true;
            }

        },

        getAppID: function () {
            mx.data.action({
                params: {
                    actionname: window.gAppIdMF
                },
                callback: $.proxy(this.AppIDSet, this),
                error: lang.hitch(this, function (error) {
                    console.log(this.id + ': An error occurred while executing microflow: ' + error.description);
                })
            });
        },

        
        AppIDSet: function (obj) {
            if (obj !== null) {
                console.log("AppID retrieved and stored in chache");
                var splitter = obj.indexOf("[,]");
                window.AppID = obj.substr(0 , splitter - 1);
                window.APIKey = obj.substr(splitter + 4);
                if(window.userToken != undefined && window.APIKey != undefined && window.AppID != undefined){
                    this.createPicker();
                }
                else{
                    console.log("one or more tokens failed to retrieve");
                }
                
            } else {
                this._AppID = true;
            }
        },



        createPicker: function () {

            var view = new google.picker.DocsView()
                .setParent("root")
                .setIncludeFolders(true);

            var picker = new google.picker.PickerBuilder().
            addView(view).
            addView(new google.picker.DocsUploadView()).
            setOAuthToken(window.userToken).
            setDeveloperKey(window.APIKey).
            setAppId(window.AppID).
            setCallback(this.pickerCallback).
            enableFeature(google.picker.Feature.SIMPLE_UPLOAD_ENABLED).
            build();
            picker.setVisible(true);



        },

        pickerCallback: function (data) {

            if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                var doc = data[google.picker.Response.DOCUMENTS][0];

                window.gDConId.set(window.gDAttr, doc.id);
                if (doc.isNew) {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: window.gDMfC,
                            guids: [window.gDConId.getGUID()]
                        },
                        callback: function (obj) {
                            console.log("sent to backend");
                        },
                        error: lang.hitch(this, function (error) {
                            console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                } else {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: window.gDMf,
                            guids: [window.gDConId.getGUID()]
                        },
                        callback: function (obj) {
                            console.log("sent to backend");
                        },
                        error: lang.hitch(this, function (error) {
                            console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                }
                //url = doc[google.picker.Document.URL];
            }
        }

    });
});
require(["GoogleDriveUpLoader/widget/GoogleDriveUpLoader"], function () {
    "use strict";
});